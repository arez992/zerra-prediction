import "server-only";

import {
  Timestamp,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

export type CachedAIAnalysis = {
  summary: string;
  verdict: string;
  reasons: string[];
  bestPick: string;
  riskNote: string;
};

type CacheDocument = {
  analysis?: CachedAIAnalysis;
  expiresAt?: Timestamp;
};

const COLLECTION_NAME =
  "aiAnalysisCacheV2";

const CACHE_TTL_MS =
  6 * 60 * 60 * 1000;

export async function getCachedAIAnalysis(
  cacheKey: string
): Promise<CachedAIAnalysis | null> {
  const snapshot =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .doc(
        cacheKey
      )
      .get();

  if (!snapshot.exists) {
    return null;
  }

  const data =
    snapshot.data() as
      CacheDocument | undefined;

  const expiresAt =
    data?.expiresAt;

  if (
    !data?.analysis ||
    !expiresAt
  ) {
    return null;
  }

  if (
    expiresAt.toMillis() <=
    Date.now()
  ) {
    return null;
  }

  return data.analysis;
}

export async function saveAIAnalysisCache(
  cacheKey: string,
  analysis: CachedAIAnalysis,
  context: unknown
): Promise<void> {
  await adminDb
    .collection(
      COLLECTION_NAME
    )
    .doc(
      cacheKey
    )
    .set(
      {
        analysis,
        context,
        updatedAt:
          Timestamp.now(),
        expiresAt:
          Timestamp.fromMillis(
            Date.now() +
              CACHE_TTL_MS
          ),
      },
      {
        merge: true,
      }
    );
}

export function createAIAnalysisCacheKey(
  match: any,
  prediction?: any
): string {
  const fixtureId =
    match?.fixture
      ?.fixture
      ?.id ||
    match?.fixture
      ?.id ||
    match?.id ||
    "unknown";

  const primary =
    prediction
      ?.vipPrediction
      ?.primaryPrediction;

  const pick =
    typeof primary?.pick ===
      "string"
      ? primary.pick
          .trim()
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .slice(
            0,
            48
          )
      : "none";

  const confidence =
    Number.isFinite(
      Number(
        primary?.confidence
      )
    )
      ? Math.round(
          Number(
            primary.confidence
          )
        )
      : 0;

  const risk =
    typeof prediction?.risk ===
      "string"
      ? prediction.risk
          .trim()
          .toLowerCase()
      : "unknown";

  return [
    "fixture",
    String(
      fixtureId
    ),
    pick,
    confidence,
    risk,
    "v2",
  ].join("-");
}
