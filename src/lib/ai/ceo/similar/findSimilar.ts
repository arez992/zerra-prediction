import "server-only";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  rankSimilarDecisions,
} from "./similarity";

import {
  CEO_SIMILARITY_VERSION,
  type SimilarDecisionCandidate,
  type SimilarDecisionOutcome,
  type SimilarDecisionQuery,
  type SimilarDecisionResult,
} from "./types";

const DEFAULT_RESULT_LIMIT = 5;
const MAX_RESULT_LIMIT = 20;

const DEFAULT_CANDIDATE_LIMIT = 100;
const MAX_CANDIDATE_LIMIT = 200;

const DEFAULT_MINIMUM_SCORE = 35;

function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(parsed)
    )
  );
}

function clampScore(
  value: unknown,
  fallback = DEFAULT_MINIMUM_SCORE
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(parsed))
  );
}

function normalizeText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeNullableText(
  value: unknown
): string | null {
  const normalized =
    normalizeText(value);

  return normalized || null;
}

function normalizeNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeBoolean(
  value: unknown
): boolean | null {
  return typeof value === "boolean"
    ? value
    : null;
}

function normalizeTags(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          normalizeText(item)
            .toLowerCase()
        )
        .filter(Boolean)
    )
  ).slice(0, 50);
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);

    return Number.isFinite(parsed)
      ? new Date(parsed).toISOString()
      : value;
  }

  return null;
}

function mapOutcome(
  success: boolean | null,
  status: string
): SimilarDecisionOutcome {
  if (success === true) {
    return "success";
  }

  if (success === false) {
    return "failure";
  }

  if (
    status === "completed" ||
    status === "published"
  ) {
    return "success";
  }

  if (
    status === "failed" ||
    status === "rejected"
  ) {
    return "failure";
  }

  if (
    status === "approved" ||
    status === "executing" ||
    status === "pending"
  ) {
    return "neutral";
  }

  return "unknown";
}

type ImpactIndexEntry = {
  id: string;
  recommendationId: string;
  success: boolean | null;
  roi: number | null;
  impactScore: number | null;
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  measuredAt: string | null;
  metadata: Record<string, unknown>;
};

async function loadRecentImpactIndex(
  limit: number
): Promise<
  Map<string, ImpactIndexEntry>
> {
  const snapshot =
    await adminDb
      .collection(
        "ceoRecommendationImpact"
      )
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(limit)
      .get();

  const index =
    new Map<
      string,
      ImpactIndexEntry
    >();

  for (
    const document of snapshot.docs
  ) {
    const data =
      document.data();

    const recommendationId =
      normalizeText(
        data.recommendationId
      );

    if (
      !recommendationId ||
      index.has(
        recommendationId
      )
    ) {
      continue;
    }

    index.set(
      recommendationId,
      {
        id: document.id,
        recommendationId,
        success:
          normalizeBoolean(
            data.success
          ),
        roi:
          normalizeNumber(
            data.roi
          ),
        impactScore:
          normalizeNumber(
            data.impactScore
          ),
        confidenceBefore:
          normalizeNumber(
            data.confidenceBefore
          ),
        confidenceAfter:
          normalizeNumber(
            data.confidenceAfter
          ),
        measuredAt:
          serializeTimestamp(
            data.measuredAt
          ) ||
          serializeTimestamp(
            data.createdAt
          ),
        metadata:
          asRecord(
            data.metadata
          ),
      }
    );
  }

  return index;
}

async function loadRecentCandidates(
  candidateLimit: number
): Promise<
  SimilarDecisionCandidate[]
> {
  const [
    recommendationSnapshot,
    impactIndex,
  ] = await Promise.all([
    adminDb
      .collection(
        "ceoRecommendations"
      )
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(
        candidateLimit
      )
      .get(),

    loadRecentImpactIndex(
      MAX_CANDIDATE_LIMIT
    ),
  ]);

  return recommendationSnapshot.docs.map(
    (document) => {
      const data =
        document.data();

      const recommendationId =
        normalizeText(
          data.recommendationId
        ) ||
        document.id;

      const impact =
        impactIndex.get(
          recommendationId
        ) ||
        impactIndex.get(
          document.id
        ) ||
        null;

      const status =
        normalizeText(
          data.status
        ).toLowerCase() ||
        "unknown";

      const success =
        impact?.success ??
        normalizeBoolean(
          data.success
        );

      const metadata = {
        ...asRecord(
          data.metadata
        ),
        executionPayload:
          asRecord(
            data.executionPayload
          ),
        executionResult:
          asRecord(
            data.executionResult
          ),
        source:
          normalizeNullableText(
            data.source
          ),
        impactId:
          impact?.id || null,
        impactMeasuredAt:
          impact?.measuredAt ||
          null,
        impactMetadata:
          impact?.metadata || {},
      };

      return {
        id: document.id,

        recommendationId,

        recommendationType:
          normalizeText(
            data.recommendationType
          ) ||
          normalizeText(
            data.executionType
          ) ||
          "unknown",

        title:
          normalizeText(
            data.title
          ) ||
          "Untitled recommendation",

        description:
          normalizeText(
            data.description
          ),

        executionType:
          normalizeNullableText(
            data.executionType
          ),

        status,

        source:
          "recommendation",

        success,

        outcome:
          mapOutcome(
            success,
            status
          ),

        roi:
          impact?.roi ??
          normalizeNumber(
            data.roi
          ),

        impactScore:
          impact?.impactScore ??
          normalizeNumber(
            data.impactScore
          ),

        confidenceBefore:
          impact?.confidenceBefore ??
          normalizeNumber(
            data.confidence ??
            data.confidenceScore
          ),

        confidenceAfter:
          impact?.confidenceAfter ??
          null,

        lesson:
          normalizeNullableText(
            data.lesson
          ),

        tags:
          normalizeTags(
            data.tags
          ),

        createdAt:
          serializeTimestamp(
            data.createdAt
          ),

        completedAt:
          serializeTimestamp(
            data.completedAt
          ),

        metadata,
      } satisfies SimilarDecisionCandidate;
    }
  );
}

export async function findSimilarDecisions(
  query: SimilarDecisionQuery
): Promise<SimilarDecisionResult> {
  const title =
    normalizeText(
      query.input.title
    );

  if (!title) {
    throw new Error(
      "Similar decision title is required"
    );
  }

  const minimumScore =
    clampScore(
      query.minimumScore
    );

  const resultLimit =
    clampInteger(
      query.limit,
      DEFAULT_RESULT_LIMIT,
      1,
      MAX_RESULT_LIMIT
    );

  const candidateLimit =
    clampInteger(
      query.candidateLimit,
      DEFAULT_CANDIDATE_LIMIT,
      1,
      MAX_CANDIDATE_LIMIT
    );

  const candidates =
    await loadRecentCandidates(
      candidateLimit
    );

  const eligibleCandidates =
    candidates.filter(
      (candidate) => {
        if (
          query.input
            .recommendationId &&
          candidate.recommendationId ===
            query.input
              .recommendationId
        ) {
          return false;
        }

        if (
          !query.includeFailed &&
          candidate.outcome ===
            "failure"
        ) {
          return false;
        }

        if (
          !query.includeNeutral &&
          (
            candidate.outcome ===
              "neutral" ||
            candidate.outcome ===
              "unknown"
          )
        ) {
          return false;
        }

        return true;
      }
    );

  const ranked =
    rankSimilarDecisions(
      {
        ...query.input,
        title,
      },
      eligibleCandidates,
      minimumScore
    );

  return {
    version:
      CEO_SIMILARITY_VERSION,

    input: {
      ...query.input,
      title,
    },

    matches:
      ranked.slice(
        0,
        resultLimit
      ),

    totalCandidates:
      candidates.length,

    evaluatedCandidates:
      eligibleCandidates.length,

    minimumScore,

    generatedAt:
      new Date().toISOString(),
  };
}