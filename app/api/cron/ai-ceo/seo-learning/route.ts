import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runSEOLearningMeasurement,
} from "@/lib/ai-ceo/seoLearning";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const DEFAULT_LIMIT =
  25;

const MAX_LIMIT =
  50;

const DEFAULT_MEASUREMENT_WINDOW_DAYS =
  14;

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

function normalizePositiveInteger(
  value:
    string | null,

  fallback:
    number,

  maximum:
    number
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
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      1,
      Math.floor(
        parsed
      )
    )
  );
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

          source:
            "ai-ceo-seo-learning-cron",

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
      normalizePositiveInteger(
        request
          .nextUrl
          .searchParams
          .get(
            "limit"
          ),

        DEFAULT_LIMIT,

        MAX_LIMIT
      );

    const measurementWindowDays =
      normalizePositiveInteger(
        request
          .nextUrl
          .searchParams
          .get(
            "measurementWindowDays"
          ),

        DEFAULT_MEASUREMENT_WINDOW_DAYS,

        90
      );

    const summary =
      await runSEOLearningMeasurement({
        limit,

        measurementWindowDays,
      });

    return NextResponse.json(
      {
        success:
          true,

        source:
          "ai-ceo-seo-learning-cron",

        autonomous:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        safeguards: {
          cronAuthenticated:
            true,

          readSearchConsoleMetrics:
            true,

          automaticContentChanges:
            false,

          automaticPagePublishing:
            false,

          automaticModelDeployment:
            false,

          deterministicLearningRecords:
            true,

          minimumMeasurementWindowDays:
            measurementWindowDays,

          maximumBatchSize:
            MAX_LIMIT,
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
      "[AI_CEO_SEO_LEARNING_CRON_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "AI CEO SEO learning measurement failed.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "ai-ceo-seo-learning-cron",

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