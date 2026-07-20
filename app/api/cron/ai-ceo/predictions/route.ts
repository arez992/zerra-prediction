import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  generatePredictionsForDate,
  type PredictionGenerationMode,
} from "@/lib/ai-ceo/prediction/generator";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const DEFAULT_LIMIT =
  3;

const MAX_LIMIT =
  5;

function getTodayUTC(): string {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}

function normalizeDate(
  value:
    string | null
): string {
  if (
    !value ||
    !value.trim()
  ) {
    return getTodayUTC();
  }

  const date =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      "Prediction generation date must use YYYY-MM-DD format."
    );
  }

  return date;
}

function normalizeMode(
  value:
    string | null
): PredictionGenerationMode {
  return value ===
    "basic"
    ? "basic"
    : "enriched";
}

function normalizeLimit(
  value:
    string | null
): number {
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

function isAuthorized(
  request:
    NextRequest
): boolean {
  const cronSecret =
    process.env
      .CRON_SECRET;

  if (
    !cronSecret
  ) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  return authorization ===
    `Bearer ${cronSecret}`;
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

    const date =
      normalizeDate(
        request
          .nextUrl
          .searchParams
          .get(
            "date"
          )
      );

    const mode =
      normalizeMode(
        request
          .nextUrl
          .searchParams
          .get(
            "mode"
          )
      );

    const limit =
      normalizeLimit(
        request
          .nextUrl
          .searchParams
          .get(
            "limit"
          )
      );

    /*
     * AI CEO autonomous prediction run.
     *
     * Existing predictions are preserved.
     *
     * Enriched mode remains the default
     * because autonomous production
     * predictions should use the strongest
     * available controlled data pipeline.
     */
    const summary =
      await generatePredictionsForDate({
        date,

        mode,

        limit,

        overwrite:
          false,

        performedBy:
          "ai-ceo-autonomous-prediction-cron",
      });

    return NextResponse.json(
      {
        success:
          true,

        source:
          "ai-ceo-autonomous-cron",

        autonomous:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        safeguards: {
          cronAuthenticated:
            true,

          overwrite:
            false,

          defaultMode:
            "enriched",

          maximumBatchSize:
            MAX_LIMIT,

          preMatchOnly:
            true,

          qualityGateRequired:
            true,

          autoPublishPolicy:
            "pending-integration",
        },

        summary,
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
      "[AI_CEO_AUTONOMOUS_PREDICTION_CRON_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "AI CEO autonomous prediction generation failed.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "ai-ceo-autonomous-cron",

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