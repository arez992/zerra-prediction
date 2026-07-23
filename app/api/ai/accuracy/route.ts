import {
  NextResponse,
} from "next/server";

import {
  unstable_cache,
} from "next/cache";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

export const runtime =
  "nodejs";

/*
 * IMPORTANT:
 *
 * This route must never be evaluated during
 * `next build`, because the build environment
 * may not have network access to Firestore.
 *
 * Runtime requests still use the internal
 * 1-hour `unstable_cache` below, so this does
 * not increase normal Firebase read cost.
 */
export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type PredictionData = {
  correct?: boolean;

  prediction?: {
    valueBet?: string;
  };
};

type MarketStats = {
  settled: number;
  correct: number;
  accuracy: number;
};

function calculateAccuracy(
  correct: number,
  settled: number
): number {
  if (
    settled <= 0
  ) {
    return 0;
  }

  return Number(
    (
      (
        correct /
        settled
      ) *
      100
    ).toFixed(1)
  );
}

function normalizeValueBet(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
}

function calculateMarketStats(
  predictions:
    PredictionData[],

  matcher: (
    valueBet: string
  ) => boolean
): MarketStats {
  const marketPredictions =
    predictions.filter(
      (
        prediction
      ) => {
        if (
          prediction.correct !==
            true &&
          prediction.correct !==
            false
        ) {
          return false;
        }

        const valueBet =
          normalizeValueBet(
            prediction
              .prediction
              ?.valueBet
          );

        return matcher(
          valueBet
        );
      }
    );

  const settled =
    marketPredictions.length;

  const correct =
    marketPredictions.filter(
      (
        prediction
      ) =>
        prediction.correct ===
        true
    ).length;

  return {
    settled,
    correct,
    accuracy:
      calculateAccuracy(
        correct,
        settled
      ),
  };
}

const getCachedAccuracy =
  unstable_cache(
    async () => {
      const snapshot =
        await adminDb
          .collection(
            "predictionHistory"
          )
          .get();

      const predictions =
        snapshot.docs.map(
          (
            document
          ) =>
            document.data() as
              PredictionData
        );

      const totalPredictions =
        predictions.length;

      const settledPredictions =
        predictions.filter(
          (
            prediction
          ) =>
            prediction.correct ===
              true ||
            prediction.correct ===
              false
        );

      const correct =
        settledPredictions.filter(
          (
            prediction
          ) =>
            prediction.correct ===
            true
        ).length;

      const incorrect =
        settledPredictions.filter(
          (
            prediction
          ) =>
            prediction.correct ===
            false
        ).length;

      const settledTotal =
        settledPredictions.length;

      const overallAccuracy =
        calculateAccuracy(
          correct,
          settledTotal
        );

      const homeWinStats =
        calculateMarketStats(
          predictions,
          (
            valueBet
          ) =>
            valueBet.includes(
              "home"
            )
        );

      const over25Stats =
        calculateMarketStats(
          predictions,
          (
            valueBet
          ) =>
            valueBet.includes(
              "over 2.5"
            ) ||
            valueBet.includes(
              "over"
            )
        );

      const bttsStats =
        calculateMarketStats(
          predictions,
          (
            valueBet
          ) =>
            valueBet.includes(
              "btts"
            )
        );

      return {
        success:
          true,

        totalPredictions,

        settledPredictions:
          settledTotal,

        correct,

        incorrect,

        overallAccuracy,

        homeWinAccuracy:
          homeWinStats.accuracy,

        over25Accuracy:
          over25Stats.accuracy,

        bttsAccuracy:
          bttsStats.accuracy,

        marketStats: {
          homeWin: {
            settled:
              homeWinStats
                .settled,

            correct:
              homeWinStats
                .correct,
          },

          over25: {
            settled:
              over25Stats
                .settled,

            correct:
              over25Stats
                .correct,
          },

          btts: {
            settled:
              bttsStats
                .settled,

            correct:
              bttsStats
                .correct,
          },
        },
      };
    },
    [
      "zerra-ai-accuracy",
      "v2",
    ],
    {
      revalidate:
        3600,

      tags: [
        "zerra-ai-accuracy",
      ],
    }
  );

export async function GET() {
  try {
    const accuracy =
      await getCachedAccuracy();

    return NextResponse.json(
      accuracy,
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[AI_ACCURACY_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to calculate AI accuracy.";

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
