import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  unstable_cache,
} from "next/cache";

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

export const revalidate =
  0;

const COLLECTION_NAME =
  "predictionHistory";

const DEFAULT_LIMIT =
  6;

const MAX_LIMIT =
  50;

const CACHE_SECONDS =
  300;

const MAX_SETTLED_READS =
  200;

type TimestampLike = {
  toDate: () => Date;
};

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
    typeof value ===
      "number"
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
    ).toDate ===
      "function"
  ) {
    return (
      value as TimestampLike
    )
      .toDate()
      .toISOString();
  }

  if (
    value instanceof
      Date
  ) {
    return value
      .toISOString();
  }

  if (
    typeof value ===
      "string"
  ) {
    const parsed =
      Date.parse(
        value
      );

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
      Math.floor(
        parsed
      )
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

function getYesterdayRange() {
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

function getCanonicalPrediction(
  data: DocumentData
): {
  market: string;
  category: string | null;
  confidence: number;
} | null {
  const prediction =
    getObject(
      data.prediction
    );

  const vipPrediction =
    getObject(
      prediction.vipPrediction
    );

  const primaryPrediction =
    getObject(
      vipPrediction.primaryPrediction
    );

  const primaryPick =
    normalizeText(
      primaryPrediction.pick
    );

  const primaryCategory =
    normalizeText(
      primaryPrediction.category
    ) ||
    null;

  const primaryConfidence =
    normalizeNumber(
      primaryPrediction.confidence
    );

  const legacyFinalPrediction =
    normalizeText(
      vipPrediction.finalPrediction
    );

  const legacyValueBet =
    normalizeText(
      prediction.valueBet
    ) ||
    normalizeText(
      vipPrediction.valueBet
    );

  const legacyConfidence =
    normalizeNumber(
      prediction.confidence
    ) ??
    normalizeNumber(
      vipPrediction.confidence
    );

  const market =
    primaryPick ||
    legacyFinalPrediction ||
    legacyValueBet;

  if (
    !market
  ) {
    return null;
  }

  return {
    market,
    category:
      primaryCategory,
    confidence:
      Number(
        (
          primaryConfidence ??
          legacyConfidence ??
          0
        ).toFixed(
          1
        )
      ),
  };
}

function toYesterdayResult(
  id: string,
  data: DocumentData
) {
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

  const correct =
    typeof data.correct ===
      "boolean"
      ? data.correct
      : null;

  if (
    homeGoals ===
      null ||
    awayGoals ===
      null ||
    correct ===
      null
  ) {
    return null;
  }

  const canonicalPrediction =
    getCanonicalPrediction(
      data
    );

  if (
    !canonicalPrediction
  ) {
    return null;
  }

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
        canonicalPrediction.market,

      category:
        canonicalPrediction.category,

      confidence:
        canonicalPrediction.confidence,
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

      label:
        normalizeText(
          data.result
        ) ||
        `${homeGoals}-${awayGoals}`,
    },

    settledAt:
      serializeTimestamp(
        data.settledAt
      ),
  };
}

const getCachedSettledPredictions =
  unstable_cache(
    async () => {
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
          .limit(
            MAX_SETTLED_READS
          )
          .get();

      return snapshot.docs.map(
        (
          document
        ) => ({
          id:
            document.id,

          data:
            document.data(),
        })
      );
    },

    [
      "zerra-yesterday-primary-results",
      "v1",
    ],

    {
      revalidate:
        CACHE_SECONDS,

      tags: [
        "zerra-yesterday-primary-results",
      ],
    }
  );

export async function GET(
  request: NextRequest
) {
  try {
    const limit =
      getSafeLimit(
        request.nextUrl
          .searchParams
          .get(
            "limit"
          )
      );

    const {
      start,
      end,
    } =
      getYesterdayRange();

    const cachedDocuments =
      await getCachedSettledPredictions();

    const yesterdayResults =
      cachedDocuments
        .filter(
          (
            document
          ) => {
            const fixtureDate =
              serializeTimestamp(
                document
                  .data
                  .fixtureDate
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
              document.data
            )
        )
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            item !==
            null
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
          item.result.correct
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
            ).toFixed(
              1
            )
          );

    const results =
      yesterdayResults.slice(
        0,
        limit
      );

    return NextResponse.json(
      {
        success:
          true,

        engine:
          "ZERRA AI Prediction Engine",

        type:
          "yesterday-primary-predictions",

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
        status:
          200,

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
      "[YESTERDAY_PRIMARY_RESULTS_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to load yesterday's primary prediction results.";

    return NextResponse.json(
      {
        success:
          false,

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
