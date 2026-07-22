import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  createSEOPageDraft,
  listSEOPageDrafts,
} from "@/lib/ai-ceo/pageGenerator";

import {
  evaluateSEOAutoPublishPolicy,
} from "@/lib/ai-ceo/seoAutoPublishPolicy";

import {
  applySEOAutonomousLifecycle,
} from "@/lib/ai-ceo/seoLifecycle";

import type {
  SEOPageDraftItem,
} from "@/lib/ai-ceo/client";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

/*
 * ZERRA SEO Growth Policy
 *
 * Default:
 * 15 new SEO pages per autonomous run.
 *
 * Maximum:
 * 25 pages per run.
 *
 * This keeps growth aggressive while
 * preserving a hard operational ceiling.
 */
const DEFAULT_LIMIT =
  15;

const MAX_LIMIT =
  25;

/*
 * Fetch a substantially larger candidate
 * pool than the generation limit because
 * some published predictions may already
 * have SEO pages.
 */
const MIN_CANDIDATE_POOL =
  100;

const CANDIDATE_MULTIPLIER =
  8;

type PredictionCandidate = {
  id:
    string;

  fixtureId:
    string;

  fixtureDate:
    string | null;

  keyword:
    string;

  country:
    string | null;

  publishedAt:
    string | null;

  updatedAt:
    string | null;
};

type SEOGenerationItem = {
  fixtureId:
    string;

  keyword:
    string;

  draftId:
    string | null;

  generated:
    boolean;

  decision:
    | "auto-publish"
    | "review"
    | "withhold"
    | "skipped"
    | "failed";

  status:
    string | null;

  reason:
    string;
};

function isAuthorized(
  request:
    NextRequest
): boolean {
  const secret =
    process.env
      .CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  return (
    authorization ===
    `Bearer ${secret}`
  );
}

function normalizeLimit(
  value:
    string | null
): number {
  if (
    !value ||
    !value.trim()
  ) {
    return DEFAULT_LIMIT;
  }

  const parsed =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(
        parsed
      )
    )
  );
}

function normalizeText(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function serializeDate(
  value:
    unknown
): string | null {
  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    value instanceof
    Date
  ) {
    return Number.isNaN(
      value.getTime()
    )
      ? null
      : value.toISOString();
  }

  if (
    value &&
    typeof value ===
      "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate:
          () => Date;
      }
    ).toDate ===
      "function"
  ) {
    try {
      const converted =
        (
          value as {
            toDate:
              () => Date;
          }
        ).toDate();

      return Number.isNaN(
        converted.getTime()
      )
        ? null
        : converted
            .toISOString();
    } catch {
      return null;
    }
  }

  return null;
}

function getTimestamp(
  value:
    string | null
): number {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(
      value
    ).getTime();

  return Number.isNaN(
    timestamp
  )
    ? 0
    : timestamp;
}

async function getPredictionCandidateByFixtureId(
  fixtureId:
    string
): Promise<
  PredictionCandidate | null
> {
  const normalizedFixtureId =
    normalizeText(
      fixtureId
    );

  if (
    !normalizedFixtureId
  ) {
    return null;
  }

  /*
   * Prediction documents are stored with
   * the deterministic ID fixture-{fixtureId}.
   *
   * This makes the immediate SEO path a single
   * Firestore document read instead of scanning
   * the full published-prediction collection.
   */
  const document =
    await adminDb
      .collection(
        "predictionHistory"
      )
      .doc(
        `fixture-${normalizedFixtureId}`
      )
      .get();

  if (
    !document.exists
  ) {
    return null;
  }

  const data =
    document.data() ||
    {};

  if (
    normalizeText(
      data.status
    ).toLowerCase() !==
    "published"
  ) {
    return null;
  }

  const homeTeam =
    normalizeText(
      data.teams
        ?.home
        ?.name
    );

  const awayTeam =
    normalizeText(
      data.teams
        ?.away
        ?.name
    );

  if (
    !homeTeam ||
    !awayTeam
  ) {
    return null;
  }

  return {
    id:
      document.id,

    fixtureId:
      normalizedFixtureId,

    fixtureDate:
      serializeDate(
        data.fixtureDate
      ),

    keyword:
      `${homeTeam} vs ${awayTeam}`,

    country:
      normalizeText(
        data.competition
          ?.country
      ) ||
      null,

    publishedAt:
      serializeDate(
        data.publishedAt
      ),

    updatedAt:
      serializeDate(
        data.updatedAt
      ),
  };
}

/*
 * Get published prediction candidates.
 *
 * Newer published predictions receive
 * priority so today's/latest prediction
 * inventory becomes SEO content first.
 */
async function getPredictionCandidates(
  limit:
    number
): Promise<
  PredictionCandidate[]
> {
  const candidatePoolSize =
    Math.max(
      MIN_CANDIDATE_POOL,
      limit *
        CANDIDATE_MULTIPLIER
    );

  const snapshot =
    await adminDb
      .collection(
        "predictionHistory"
      )
      .where(
        "status",
        "==",
        "published"
      )
      .limit(
        candidatePoolSize
      )
      .get();

  const candidates:
    PredictionCandidate[] =
      [];

  for (
    const document
    of snapshot.docs
  ) {
    const data =
      document.data() ||
      {};

    const fixtureId =
      normalizeText(
        data.fixtureId
      );

    const homeTeam =
      normalizeText(
        data.teams
          ?.home
          ?.name
      );

    const awayTeam =
      normalizeText(
        data.teams
          ?.away
          ?.name
      );

    if (
      !fixtureId ||
      !homeTeam ||
      !awayTeam
    ) {
      continue;
    }

    candidates.push({
      id:
        document.id,

      fixtureId,

      fixtureDate:
        serializeDate(
          data.fixtureDate
        ),

      keyword:
        `${homeTeam} vs ${awayTeam}`,

      country:
        normalizeText(
          data.competition
            ?.country
        ) ||
        null,

      publishedAt:
        serializeDate(
          data.publishedAt
        ),

      updatedAt:
        serializeDate(
          data.updatedAt
        ),
    });
  }

  /*
   * Latest published/updated predictions
   * should receive SEO priority.
   */
  candidates.sort(
    (
      first,
      second
    ) => {
      const firstTime =
        Math.max(
          getTimestamp(
            first.publishedAt
          ),
          getTimestamp(
            first.updatedAt
          ),
          getTimestamp(
            first.fixtureDate
          )
        );

      const secondTime =
        Math.max(
          getTimestamp(
            second.publishedAt
          ),
          getTimestamp(
            second.updatedAt
          ),
          getTimestamp(
            second.fixtureDate
          )
        );

      return (
        secondTime -
        firstTime
      );
    }
  );

  return candidates;
}

export async function GET(
  request:
    NextRequest
) {
  try {
    if (
      !isAuthorized(
        request
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Unauthorized cron request.",
        },
        {
          status:
            401,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const limit =
      normalizeLimit(
        request
          .nextUrl
          .searchParams
          .get(
            "limit"
          )
      );

    const language:
      SEOPageDraftItem["language"] =
      request
        .nextUrl
        .searchParams
        .get(
          "language"
        ) ===
      "ku"
        ? "ku"
        : "en";


    const requestedFixtureId =
      normalizeText(
        request
          .nextUrl
          .searchParams
          .get(
            "fixtureId"
          )
      );

    /*
     * Load existing SEO inventory once
     * before generation.
     */
    const existingDraftsRaw =
      await listSEOPageDrafts(
        1000
      );

    const existingDrafts =
      existingDraftsRaw as
        SEOPageDraftItem[];

    const existingFixtureKeys =
      new Set<string>(
        existingDrafts
          .filter(
            (
              draft:
                SEOPageDraftItem
            ) =>
              Boolean(
                draft.fixtureId
              )
          )
          .map(
            (
              draft:
                SEOPageDraftItem
            ) =>
              `${String(
                draft.fixtureId
              )}:${draft.language}`
          )
      );

    const requestedCandidate =
      requestedFixtureId
        ? await getPredictionCandidateByFixtureId(
            requestedFixtureId
          )
        : null;

    const candidates =
      requestedFixtureId
        ? requestedCandidate
          ? [
              requestedCandidate,
            ]
          : []
        : await getPredictionCandidates(
            limit
          );

    const items:
      SEOGenerationItem[] =
      [];

    let generatedCount =
      0;

    let autoPublishedCount =
      0;

    let reviewCount =
      0;

    let withheldCount =
      0;

    let skippedCount =
      0;

    let failedCount =
      0;

    /*
     * Process candidates until the requested
     * number of NEW SEO drafts is generated.
     *
     * Existing fixtures do not consume the
     * generation quota.
     */
    for (
      const candidate
      of candidates
    ) {
      if (
        generatedCount >=
        (
          requestedFixtureId
            ? 1
            : limit
        )
      ) {
        break;
      }

      const fixtureKey =
        `${candidate.fixtureId}:${language}`;

      if (
        existingFixtureKeys.has(
          fixtureKey
        )
      ) {
        skippedCount +=
          1;

        items.push({
          fixtureId:
            candidate.fixtureId,

          keyword:
            candidate.keyword,

          draftId:
            null,

          generated:
            false,

          decision:
            "skipped",

          status:
            null,

          reason:
            "An SEO page already exists for this fixture and language.",
        });

        continue;
      }

      try {
        /*
         * Create the SEO draft from the
         * published prediction.
         */
        const draft =
          await createSEOPageDraft({
            keyword:
              candidate.keyword,

            language,

            country:
              candidate.country,

            fixtureId:
              candidate.fixtureId,

            fixtureDate:
              candidate.fixtureDate,

            sourceRecommendationId:
              null,

            createdBy:
              "ai-ceo-autonomous-seo-cron",
          });

        generatedCount +=
          1;

        /*
         * Immediately protect against another
         * duplicate during this same cron run.
         */
        existingFixtureKeys.add(
          fixtureKey
        );

        /*
         * Keep the current draft inventory
         * available to the SEO quality and
         * duplicate policy.
         */
        const latestDraftsRaw =
          await listSEOPageDrafts(
            1000
          );

        const latestDrafts =
          latestDraftsRaw as
            SEOPageDraftItem[];

        const currentDraft =
          draft as unknown as
            SEOPageDraftItem;

        /*
         * Existing ZERRA SEO policy remains
         * responsible for:
         *
         * - content quality
         * - duplicate validation
         * - internal links
         * - schema
         * - publication eligibility
         */
        const policy =
          evaluateSEOAutoPublishPolicy(
            currentDraft,
            latestDrafts
          );

        /*
         * Apply autonomous lifecycle:
         *
         * auto-publish
         * review
         * withhold
         */
        const lifecycle =
          await applySEOAutonomousLifecycle({
            draftId:
              draft.id,

            policy,

            performedBy:
              "ai-ceo-autonomous-seo-cron",
          });

        if (
          lifecycle.decision ===
          "auto-publish"
        ) {
          autoPublishedCount +=
            1;
        } else if (
          lifecycle.decision ===
          "review"
        ) {
          reviewCount +=
            1;
        } else {
          withheldCount +=
            1;
        }

        items.push({
          fixtureId:
            candidate.fixtureId,

          keyword:
            candidate.keyword,

          draftId:
            draft.id,

          generated:
            true,

          decision:
            lifecycle.decision,

          status:
            lifecycle.status,

          reason:
            lifecycle.message,
        });
      } catch (
        error
      ) {
        const message =
          error instanceof
            Error
            ? error.message
            : "AI CEO autonomous SEO generation failed.";

        /*
         * Duplicate creation should not fail
         * the complete autonomous batch.
         */
        if (
          message
            .toLowerCase()
            .includes(
              "already exists"
            )
        ) {
          skippedCount +=
            1;

          existingFixtureKeys.add(
            fixtureKey
          );

          items.push({
            fixtureId:
              candidate.fixtureId,

            keyword:
              candidate.keyword,

            draftId:
              null,

            generated:
              false,

            decision:
              "skipped",

            status:
              null,

            reason:
              message,
          });

          continue;
        }

        /*
         * A failure for one page must never
         * stop generation for the remaining
         * published predictions.
         */
        failedCount +=
          1;

        console.error(
          "[AI_CEO_AUTONOMOUS_SEO_ITEM_ERROR]",
          {
            fixtureId:
              candidate.fixtureId,

            keyword:
              candidate.keyword,

            error:
              message,
          }
        );

        items.push({
          fixtureId:
            candidate.fixtureId,

          keyword:
            candidate.keyword,

          draftId:
            null,

          generated:
            false,

          decision:
            "failed",

          status:
            null,

          reason:
            message,
        });
      }
    }

    return NextResponse.json(
      {
        success:
          true,

        source:
          "ai-ceo-autonomous-seo-growth-cron",

        autonomous:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        safeguards: {
          cronAuthenticated:
            true,

          defaultBatchSize:
            DEFAULT_LIMIT,

          maximumBatchSize:
            MAX_LIMIT,

          candidatePoolMinimum:
            MIN_CANDIDATE_POOL,

          source:
            "published-predictions",

          latestPublishedPriority:
            true,

          duplicateValidation:
            true,

          duplicateDoesNotConsumeQuota:
            true,

          contentQualityValidation:
            true,

          internalLinkValidation:
            true,

          schemaValidation:
            true,

          autonomousLifecycle:
            true,

          isolatedItemFailures:
            true,
        },

        summary: {
          requestedLimit:
            requestedFixtureId
              ? 1
              : limit,

          requestedFixtureId:
            requestedFixtureId ||
            null,

          immediateFixtureMode:
            Boolean(
              requestedFixtureId
            ),

          language,

          candidatesFound:
            candidates.length,

          generatedDrafts:
            generatedCount,

          autoPublishedPages:
            autoPublishedCount,

          reviewPages:
            reviewCount,

          withheldPages:
            withheldCount,

          skippedPages:
            skippedCount,

          failedPages:
            failedCount,

          remainingCandidateCapacity:
            Math.max(
              0,
              candidates.length -
              generatedCount -
              skippedCount
            ),

          items,
        },
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[AI_CEO_AUTONOMOUS_SEO_CRON_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "AI CEO autonomous SEO generation failed.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "ai-ceo-autonomous-seo-growth-cron",

        error:
          message,
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}