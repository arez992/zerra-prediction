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

export const revalidate =
  3600;

type PredictionData = {
  correct?: boolean;
  prediction?: {
    valueBet?: string;
  };
};

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
          (document) =>
            document.data() as PredictionData
        );

      const total =
        predictions.length;

      if (total === 0) {
        return {
          success: true,
          totalPredictions: 0,
          overallAccuracy: 0,
          homeWinAccuracy: 0,
          over25Accuracy: 0,
          bttsAccuracy: 0,
          correct: 0,
          incorrect: 0,
        };
      }

      const correct =
        predictions.filter(
          (prediction) =>
            prediction.correct === true
        ).length;

      const incorrect =
        predictions.filter(
          (prediction) =>
            prediction.correct === false
        ).length;

      const settledTotal =
        correct + incorrect;

      const overallAccuracy =
        settledTotal === 0
          ? 0
          : Number(
              (
                (correct /
                  settledTotal) *
                100
              ).toFixed(1)
            );

      const homeWin =
        predictions.filter(
          (prediction) =>
            prediction.correct ===
              true &&
            prediction.prediction
              ?.valueBet
              ?.toLowerCase()
              .includes("home")
        ).length;

      const over25 =
        predictions.filter(
          (prediction) =>
            prediction.correct ===
              true &&
            prediction.prediction
              ?.valueBet
              ?.toLowerCase()
              .includes("over")
        ).length;

      const btts =
        predictions.filter(
          (prediction) =>
            prediction.correct ===
              true &&
            prediction.prediction
              ?.valueBet
              ?.toLowerCase()
              .includes("btts")
        ).length;

      return {
        success: true,
        totalPredictions:
          total,
        correct,
        incorrect,
        overallAccuracy,

        homeWinAccuracy:
          total > 0
            ? Number(
                (
                  (homeWin /
                    total) *
                  100
                ).toFixed(1)
              )
            : 0,

        over25Accuracy:
          total > 0
            ? Number(
                (
                  (over25 /
                    total) *
                  100
                ).toFixed(1)
              )
            : 0,

        bttsAccuracy:
          total > 0
            ? Number(
                (
                  (btts /
                    total) *
                  100
                ).toFixed(1)
              )
            : 0,
      };
    },
    [
      "zerra-ai-accuracy",
    ],
    {
      revalidate: 3600,
    }
  );

export async function GET() {
  try {
    const accuracy =
      await getCachedAccuracy();

    return NextResponse.json(
      accuracy,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error(
      "[AI_ACCURACY_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to calculate AI accuracy.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}