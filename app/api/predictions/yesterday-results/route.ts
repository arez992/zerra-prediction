import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  DocumentData,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

const COLLECTION_NAME =
  "predictionHistory";

const DEFAULT_LIMIT = 6;

const MAX_LIMIT = 50;

type TimestampLike = {
  toDate: () => Date;
};

type GoalMarket =
  | "Over 2.5 Goals"
  | "Under 2.5 Goals";

function normalizeText(
  value: unknown,
  fallback = ""
): string {
  return typeof value ===
    "string" &&
    value.trim()
    ? value.trim()
    : fallback;
}

function normalizeNumber(
  value: unknown
): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value ===
      "object" &&
    "toDate" in value &&
    typeof (
      value as TimestampLike
    ).toDate === "function"
  ) {
    return (
      value as TimestampLike
    )
      .toDate()
      .toISOString();
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value ===
      "string"
  ) {
    const parsed =
      Date.parse(value);

    if (
      Number.isFinite(
        parsed
      )
    ) {
      return new Date(
        parsed
      ).toISOString();
    }
  }

  return null;
}

function getSafeLimit(
  value: string | null
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
      Math.floor(parsed)
    )
  );
}

function getObject(
  value: unknown
): Record<
  string,
  unknown
> {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function getYesterdayRange() {
  /*
   * Yesterday is calculated
   * using UTC because stored
   * fixture dates are ISO dates.
   *
   * This gives us:
   *
   * yesterday 00:00:00 UTC
   * today     00:00:00 UTC
   */
  const now =
    new Date();

  const todayStart =
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

  const yesterdayStart =
    new Date(
      todayStart
    );

  yesterdayStart.setUTCDate(
    yesterdayStart.getUTCDate() -
      1
  );

  return {
    start:
      yesterdayStart,

    end:
      todayStart,
  };
}

function chooseGoalMarket(
  prediction:
    Record<string, unknown>
): {
  market: GoalMarket;
  confidence: number;
} {
  const vipPrediction =
    getObject(
      prediction.vipPrediction
    );

  const vipMarkets =
    getObject(
      vipPrediction.markets
    );

  const topLevelOver =
    normalizeNumber(
      prediction.over25
    );

  const topLevelUnder =
    normalizeNumber(
      prediction.under25
    );

  const nestedOver =
    normalizeNumber(
      vipMarkets.over25
    );

  const nestedUnder =
    normalizeNumber(
      vipMarkets.under25
    );

  const over25 =
    topLevelOver ??
    nestedOver ??
    0;

  const under25 =
    topLevelUnder ??
    nestedUnder ??
    0;

  if (
    over25 >
    under25
  ) {
    return {
      market:
        "Over 2.5 Goals",

      confidence:
        over25,
    };
  }

  return {
    market:
      "Under 2.5 Goals",

    confidence:
      under25,
  };
}

function evaluateGoalPrediction(
  market: GoalMarket,
  totalGoals: number
): boolean {
  if (
    market ===
    "Over 2.5 Goals"
  ) {
    return (
      totalGoals >= 3
    );
  }

  return (
    totalGoals <= 2
  );
}

function toYesterdayResult(
  id: string,
  data: DocumentData
) {
  const prediction =
    getObject(
      data.prediction
    );

  const competition =
    getObject(
      data.competition
    );

  const teams =
    getObject(
      data.teams
    );

  const homeTeam =
    getObject(
      teams.home
    );

  const awayTeam =
    getObject(
      teams.away
    );

  const settlement =
    getObject(
      data.settlement
    );

  const actual =
    getObject(
      settlement.actual
    );

  const homeGoals =
    normalizeNumber(
      actual.homeGoals
    );

  const awayGoals =
    normalizeNumber(
      actual.awayGoals
    );

  const storedTotalGoals =
    normalizeNumber(
      actual.totalGoals
    );

  if (
    homeGoals === null ||
    awayGoals === null
  ) {
    return null;
  }

  const totalGoals =
    storedTotalGoals ??
    homeGoals +
      awayGoals;

  const goalPrediction =
    chooseGoalMarket(
      prediction
    );

  const correct =
    evaluateGoalPrediction(
      goalPrediction.market,
      totalGoals
    );

  return {
    id,

    fixtureId:
      normalizeText(
        data.fixtureId
      ) ||
      id.replace(
        /^fixture-/,
        ""
      ),

    competition: {
      name:
        normalizeText(
          competition.name,
          "Football"
        ),

      country:
        normalizeText(
          competition.country
        ) ||
        null,
    },

    teams: {
      home: {
        name:
          normalizeText(
            homeTeam.name,
            "Home team"
          ),

        logo:
          normalizeText(
            homeTeam.logo
          ) ||
          null,
      },

      away: {
        name:
          normalizeText(
            awayTeam.name,
            "Away team"
          ),

        logo:
          normalizeText(
            awayTeam.logo
          ) ||
          null,
      },
    },

    fixtureDate:
      serializeTimestamp(
        data.fixtureDate
      ),

    prediction: {
      market:
        goalPrediction.market,

      confidence:
        Number(
          goalPrediction
            .confidence
            .toFixed(1)
        ),
    },

    result: {
      correct,

      status:
        correct
          ? "correct"
          : "incorrect",

      finalScore:
        `${homeGoals}-${awayGoals}`,

      homeGoals,

      awayGoals,

      totalGoals,
    },

    settledAt:
      serializeTimestamp(
        data.settledAt
      ),
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const limit =
      getSafeLimit(
        request.nextUrl
          .searchParams
          .get("limit")
      );

    const {
      start,
      end,
    } =
      getYesterdayRange();

    /*
     * We query settled predictions
     * first and perform the exact
     * fixture-date filtering in
     * memory.
     *
     * This avoids requiring a new
     * Firestore composite index for:
     *
     * status + fixtureDate
     *
     * The maximum read size is
     * intentionally capped.
     */
    const snapshot =
      await adminDb
        .collection(
          COLLECTION_NAME
        )
        .where(
          "status",
          "==",
          "settled"
        )
        .limit(200)
        .get();

    const yesterdayResults =
      snapshot.docs
        .filter(
          (
            document
          ) => {
            const data =
              document.data();

            const fixtureDate =
              serializeTimestamp(
                data.fixtureDate
              );

            if (
              !fixtureDate
            ) {
              return false;
            }

            const timestamp =
              Date.parse(
                fixtureDate
              );

            return (
              Number.isFinite(
                timestamp
              ) &&
              timestamp >=
                start.getTime() &&
              timestamp <
                end.getTime()
            );
          }
        )
        .map(
          (
            document
          ) =>
            toYesterdayResult(
              document.id,
              document.data()
            )
        )
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            item !== null
        )
        .sort(
          (
            first,
            second
          ) => {
            const firstDate =
              Date.parse(
                first.fixtureDate ||
                  ""
              );

            const secondDate =
              Date.parse(
                second.fixtureDate ||
                  ""
              );

            return (
              secondDate -
              firstDate
            );
          }
        );

    const correct =
      yesterdayResults.filter(
        (
          item
        ) =>
          item.result
            .correct
      ).length;

    const incorrect =
      yesterdayResults.length -
      correct;

    const accuracy =
      yesterdayResults.length ===
      0
        ? 0
        : Number(
            (
              (
                correct /
                yesterdayResults.length
              ) *
              100
            ).toFixed(1)
          );

    const results =
      yesterdayResults.slice(
        0,
        limit
      );

    return NextResponse.json(
      {
        success: true,

        engine:
          "ZERRA AI Prediction Engine",

        type:
          "yesterday-goal-predictions",

        date: {
          from:
            start.toISOString(),

          to:
            end.toISOString(),
        },

        summary: {
          totalPredictions:
            yesterdayResults.length,

          correctPredictions:
            correct,

          incorrectPredictions:
            incorrect,

          accuracyRate:
            accuracy,
        },

        count:
          results.length,

        results,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[YESTERDAY_GOAL_RESULTS_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load yesterday's goal prediction results.";

    return NextResponse.json(
      {
        success: false,
        error:
          message,
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}