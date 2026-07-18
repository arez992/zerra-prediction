import "server-only";

import {
  FieldValue,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  getFixturesByDate,
} from "@/lib/api-football/service";

import {
  validatePrediction,
} from "@/lib/ai/validator";

import {
  recordPredictionLearning,
} from "@/lib/zaos/learning/predictionLearning";

const COLLECTION_NAME =
  "predictionHistory";

const AUDIT_COLLECTION =
  "predictionAuditLogs";

const FINISHED_STATUSES =
  new Set([
    "FT",
    "AET",
    "PEN",
  ]);

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

type FixtureLike = {
  fixture?: {
    id?: number | string;
    date?: string;

    status?: {
      short?: string;
      long?: string;
    };
  };

  league?: {
    id?: number;
    name?: string;
    country?: string;
    season?: number;
    round?: string;
  };

  teams?: {
    home?: {
      id?: number;
      name?: string;
    };

    away?: {
      id?: number;
      name?: string;
    };
  };

  goals?: {
    home?: number | null;
    away?: number | null;
  };

  score?: {
    halftime?: {
      home?: number | null;
      away?: number | null;
    };

    fulltime?: {
      home?: number | null;
      away?: number | null;
    };

    extratime?: {
      home?: number | null;
      away?: number | null;
    };

    penalty?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

type StoredPrediction = {
  id: string;
  fixtureId: string;
  fixtureDate: string;

  prediction: Record<
    string,
    unknown
  >;

  data: DocumentData;
};

export type PredictionSettlementItem = {
  predictionId: string;
  fixtureId: string;
  fixtureDate: string;

  settled: boolean;
  skipped: boolean;

  reason: string;

  correct: boolean | null;
  result: string | null;
};

export type PredictionSettlementSummary = {
  checkedAt: string;

  scannedPredictions: number;
  eligiblePredictions: number;

  uniqueFixtureDates: number;
  apiDateRequests: number;

  settledPredictions: number;
  skippedPredictions: number;

  missingFixtures: number;
  unfinishedFixtures: number;

  items:
    PredictionSettlementItem[];
};

function normalizeLimit(
  value: unknown
): number {
  const parsed =
    Number(value);

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

function normalizeDate(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  const date =
    value
      .trim()
      .slice(
        0,
        10
      );

  return /^\d{4}-\d{2}-\d{2}$/.test(
    date
  )
    ? date
    : "";
}

function normalizeFixtureId(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const fixtureId =
    String(
      value
    ).trim();

  return /^\d+$/.test(
    fixtureId
  )
    ? fixtureId
    : "";
}

function asRecord(
  value: unknown
): Record<
  string,
  unknown
> {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function asString(
  value: unknown
): string | null {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function asNumber(
  value: unknown
): number | null {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
    ? value
    : null;
}

function toStoredPrediction(
  document:
    QueryDocumentSnapshot<
      DocumentData
    >
): StoredPrediction | null {
  const data =
    document.data();

  const fixtureId =
    normalizeFixtureId(
      data.fixtureId
    );

  const fixtureDate =
    normalizeDate(
      data.fixtureDate
    );

  if (
    !fixtureId ||
    !fixtureDate
  ) {
    return null;
  }

  return {
    id:
      document.id,

    fixtureId,

    fixtureDate,

    prediction:
      asRecord(
        data.prediction
      ),

    data,
  };
}

function getFixtureId(
  fixture: FixtureLike
): string {
  return normalizeFixtureId(
    fixture
      .fixture
      ?.id
  );
}

function getStatus(
  fixture: FixtureLike
): string {
  return String(
    fixture
      .fixture
      ?.status
      ?.short ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getFinalGoals(
  fixture: FixtureLike
): {
  home: number;
  away: number;
} | null {
  const home =
    fixture.goals?.home;

  const away =
    fixture.goals?.away;

  if (
    typeof home !==
      "number" ||
    !Number.isFinite(
      home
    ) ||
    typeof away !==
      "number" ||
    !Number.isFinite(
      away
    )
  ) {
    return null;
  }

  return {
    home,
    away,
  };
}

function buildActualMetrics(
  fixture: FixtureLike
) {
  const goals =
    getFinalGoals(
      fixture
    );

  if (!goals) {
    return null;
  }

  const totalGoals =
    goals.home +
    goals.away;

  const actualWinner =
    goals.home >
    goals.away
      ? "home"
      : goals.away >
          goals.home
        ? "away"
        : "draw";

  return {
    homeGoals:
      goals.home,

    awayGoals:
      goals.away,

    totalGoals,

    goalDifference:
      goals.home -
      goals.away,

    actualWinner,

    btts:
      goals.home >
        0 &&
      goals.away >
        0,

    over25:
      totalGoals >
      2.5,

    under25:
      totalGoals <
      2.5,

    exactScore:
      `${goals.home}-${goals.away}`,
  };
}

function buildFixtureMap(
  fixtures:
    FixtureLike[]
): Map<
  string,
  FixtureLike
> {
  const map =
    new Map<
      string,
      FixtureLike
    >();

  for (
    const fixture
    of fixtures
  ) {
    const fixtureId =
      getFixtureId(
        fixture
      );

    if (fixtureId) {
      map.set(
        fixtureId,
        fixture
      );
    }
  }

  return map;
}

async function loadUnsettledPredictions(
  limit: number
): Promise<{
  scanned: number;
  eligible:
    StoredPrediction[];
}> {
  const snapshot =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .where(
        "resultChecked",
        "==",
        false
      )
      .limit(
        limit
      )
      .get();

  const eligible =
    snapshot.docs
      .map(
        toStoredPrediction
      )
      .filter(
        (
          item
        ): item is
          StoredPrediction =>
          item !==
          null
      );

  return {
    scanned:
      snapshot.size,

    eligible,
  };
}

async function recordSettlementLearning(
  stored:
    StoredPrediction,

  validation: {
    correct:
      boolean | null;

    result:
      string;
  },

  actualMetrics:
    NonNullable<
      ReturnType<
        typeof buildActualMetrics
      >
    >
): Promise<void> {
  /*
   * Only validated predictions
   * can reach this function.
   */
  if (
    typeof validation.correct !==
    "boolean"
  ) {
    return;
  }

  const vipPrediction =
    asRecord(
      stored
        .prediction
        .vipPrediction
    );

  const model =
    asRecord(
      stored
        .prediction
        .model
    );

  const valueBet =
    asString(
      stored
        .prediction
        .valueBet
    ) ||
    asString(
      vipPrediction
        .valueBet
    );

  const finalPrediction =
    asString(
      vipPrediction
        .finalPrediction
    );

  const confidence =
    asNumber(
      stored
        .prediction
        .confidence
    ) ??
    asNumber(
      vipPrediction
        .confidence
    );

  const risk =
    asString(
      stored
        .prediction
        .risk
    );

  const modelVersion =
    asString(
      model.version
    );

  const exactScore =
    asString(
      vipPrediction
        .exactScore
    );

  await recordPredictionLearning({
    predictionId:
      stored.id,

    fixtureId:
      stored.fixtureId,

    correct:
      validation.correct,

    result:
      validation.result,

    valueBet,

    finalPrediction,

    confidence,

    risk,

    modelVersion,

    exactScore,

    actual:
      actualMetrics,
  });
}

async function settlePrediction(
  stored:
    StoredPrediction,

  fixture:
    FixtureLike
): Promise<
  PredictionSettlementItem
> {
  const status =
    getStatus(
      fixture
    );

  if (
    !FINISHED_STATUSES.has(
      status
    )
  ) {
    return {
      predictionId:
        stored.id,

      fixtureId:
        stored.fixtureId,

      fixtureDate:
        stored.fixtureDate,

      settled:
        false,

      skipped:
        true,

      reason:
        `Fixture status is ${
          status ||
          "unknown"
        }.`,

      correct:
        null,

      result:
        null,
    };
  }

  const actualMetrics =
    buildActualMetrics(
      fixture
    );

  if (
    !actualMetrics
  ) {
    return {
      predictionId:
        stored.id,

      fixtureId:
        stored.fixtureId,

      fixtureDate:
        stored.fixtureDate,

      settled:
        false,

      skipped:
        true,

      reason:
        "Final score is unavailable.",

      correct:
        null,

      result:
        null,
    };
  }

  const validation =
    validatePrediction(
      stored.prediction,
      fixture
    );

  if (
    !validation.checked
  ) {
    return {
      predictionId:
        stored.id,

      fixtureId:
        stored.fixtureId,

      fixtureDate:
        stored.fixtureDate,

      settled:
        false,

      skipped:
        true,

      reason:
        "Prediction market could not be validated.",

      correct:
        validation.correct,

      result:
        validation.result,
    };
  }

  const predictionRef =
    adminDb
      .collection(
        COLLECTION_NAME
      )
      .doc(
        stored.id
      );

  const auditRef =
    adminDb
      .collection(
        AUDIT_COLLECTION
      )
      .doc();

  const batch =
    adminDb.batch();

  batch.set(
    predictionRef,
    {
      correct:
        validation.correct,

      result:
        validation.result,

      resultChecked:
        true,

      manuallyChecked:
        false,

      checkedAt:
        FieldValue
          .serverTimestamp(),

      settledAt:
        FieldValue
          .serverTimestamp(),

      updatedAt:
        FieldValue
          .serverTimestamp(),

      fixtureStatus: {
        short:
          fixture
            .fixture
            ?.status
            ?.short ||
          null,

        long:
          fixture
            .fixture
            ?.status
            ?.long ||
          null,
      },

      status:
        "settled",

      settlement: {
        source:
          "api-football",

        settledAutomatically:
          true,

        finalStatus:
          status,

        actual:
          actualMetrics,

        competition: {
          id:
            fixture
              .league
              ?.id ||
            null,

          name:
            fixture
              .league
              ?.name ||
            null,

          country:
            fixture
              .league
              ?.country ||
            null,

          season:
            fixture
              .league
              ?.season ||
            null,

          round:
            fixture
              .league
              ?.round ||
            null,
        },

        teams: {
          home: {
            id:
              fixture
                .teams
                ?.home
                ?.id ||
              null,

            name:
              fixture
                .teams
                ?.home
                ?.name ||
              null,
          },

          away: {
            id:
              fixture
                .teams
                ?.away
                ?.id ||
              null,

            name:
              fixture
                .teams
                ?.away
                ?.name ||
              null,
          },
        },
      },
    },
    {
      merge:
        true,
    }
  );

  batch.set(
    auditRef,
    {
      action:
        "settle",

      predictionId:
        stored.id,

      fixtureId:
        stored.fixtureId,

      fixtureDate:
        stored.fixtureDate,

      correct:
        validation.correct,

      result:
        validation.result,

      finalStatus:
        status,

      actual:
        actualMetrics,

      source:
        "api-football-settlement",

      performedBy:
        "prediction-settlement-engine",

      createdAt:
        FieldValue
          .serverTimestamp(),
    }
  );

  /*
   * The settlement is committed first.
   *
   * ZAOS learning is intentionally
   * outside this Firestore batch.
   *
   * A learning failure must never
   * roll back or invalidate a correct
   * prediction settlement.
   */
  await batch.commit();

  try {
    await recordSettlementLearning(
      stored,
      {
        correct:
          validation.correct,

        result:
          validation.result,
      },
      actualMetrics
    );
  } catch (error) {
    console.error(
      "[PREDICTION_LEARNING_BRIDGE_ERROR]",
      {
        predictionId:
          stored.id,

        fixtureId:
          stored.fixtureId,

        error:
          error instanceof
          Error
            ? error.message
            : "Unable to record prediction learning.",
      }
    );
  }

  return {
    predictionId:
      stored.id,

    fixtureId:
      stored.fixtureId,

    fixtureDate:
      stored.fixtureDate,

    settled:
      true,

    skipped:
      false,

    reason:
      "Prediction settled successfully.",

    correct:
      validation.correct,

    result:
      validation.result,
  };
}

export async function settlePendingPredictions(
  options?: {
    limit?: number;
  }
): Promise<
  PredictionSettlementSummary
> {
  const limit =
    normalizeLimit(
      options
        ?.limit
    );

  const {
    scanned,
    eligible,
  } =
    await loadUnsettledPredictions(
      limit
    );

  const groupedByDate =
    new Map<
      string,
      StoredPrediction[]
    >();

  for (
    const prediction
    of eligible
  ) {
    const items =
      groupedByDate.get(
        prediction
          .fixtureDate
      ) || [];

    items.push(
      prediction
    );

    groupedByDate.set(
      prediction
        .fixtureDate,
      items
    );
  }

  const items:
    PredictionSettlementItem[] =
      [];

  let apiDateRequests =
    0;

  let missingFixtures =
    0;

  let unfinishedFixtures =
    0;

  for (
    const [
      date,
      predictions,
    ]
    of groupedByDate
  ) {
    const fixtures =
      await getFixturesByDate(
        date
      );

    apiDateRequests +=
      1;

    const fixtureMap =
      buildFixtureMap(
        fixtures as
          FixtureLike[]
      );

    for (
      const prediction
      of predictions
    ) {
      const fixture =
        fixtureMap.get(
          prediction
            .fixtureId
        );

      if (!fixture) {
        missingFixtures +=
          1;

        items.push({
          predictionId:
            prediction.id,

          fixtureId:
            prediction
              .fixtureId,

          fixtureDate:
            prediction
              .fixtureDate,

          settled:
            false,

          skipped:
            true,

          reason:
            "Fixture was not found in the cached date response.",

          correct:
            null,

          result:
            null,
        });

        continue;
      }

      if (
        !FINISHED_STATUSES.has(
          getStatus(
            fixture
          )
        )
      ) {
        unfinishedFixtures +=
          1;
      }

      const result =
        await settlePrediction(
          prediction,
          fixture
        );

      items.push(
        result
      );
    }
  }

  return {
    checkedAt:
      new Date()
        .toISOString(),

    scannedPredictions:
      scanned,

    eligiblePredictions:
      eligible.length,

    uniqueFixtureDates:
      groupedByDate
        .size,

    apiDateRequests,

    settledPredictions:
      items.filter(
        (
          item
        ) =>
          item.settled
      ).length,

    skippedPredictions:
      items.filter(
        (
          item
        ) =>
          item.skipped
      ).length,

    missingFixtures,

    unfinishedFixtures,

    items,
  };
}