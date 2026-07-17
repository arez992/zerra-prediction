import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

import {
  generatePredictionsForDate,
  type PredictionGenerationMode,
} from "@/lib/ai-ceo/prediction/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
 * Enriched mode may trigger several
 * API-Football calls for each fixture.
 *
 * Keep batches intentionally small
 * to protect the API quota.
 */
const DEFAULT_ENRICHED_LIMIT = 3;
const MAX_ENRICHED_LIMIT = 5;

const DEFAULT_BASIC_LIMIT = 10;
const MAX_BASIC_LIMIT = 25;

type GeneratePredictionsBody = {
  date?: string;
  limit?: number;
  mode?: PredictionGenerationMode;
  overwrite?: boolean;
};

function getTodayUTC(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function normalizeDate(
  value: unknown
): string {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return getTodayUTC();
  }

  if (
    typeof value !== "string"
  ) {
    throw new Error(
      "Generation date must use YYYY-MM-DD format."
    );
  }

  const date = value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      "Generation date must use YYYY-MM-DD format."
    );
  }

  return date;
}

function normalizeMode(
  value: unknown
): PredictionGenerationMode {
  /*
   * Enriched mode is the default
   * for higher prediction quality.
   *
   * Basic mode must be requested
   * explicitly.
   */
  return value === "basic"
    ? "basic"
    : "enriched";
}

function normalizeLimit(
  value: unknown,
  mode: PredictionGenerationMode
): number {
  const defaultLimit =
    mode === "enriched"
      ? DEFAULT_ENRICHED_LIMIT
      : DEFAULT_BASIC_LIMIT;

  const maximumLimit =
    mode === "enriched"
      ? MAX_ENRICHED_LIMIT
      : MAX_BASIC_LIMIT;

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultLimit;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return defaultLimit;
  }

  return Math.min(
    maximumLimit,
    Math.max(
      1,
      Math.floor(parsed)
    )
  );
}

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "unauthorized"
    ) ||
    normalized.includes(
      "authentication required"
    ) ||
    normalized.includes(
      "not authenticated"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes(
      "forbidden"
    ) ||
    normalized.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  if (
    normalized.includes(
      "yyyy-mm-dd"
    ) ||
    normalized.includes(
      "required"
    ) ||
    normalized.includes(
      "invalid"
    )
  ) {
    return 400;
  }

  if (
    normalized.includes(
      "api_football_key"
    )
  ) {
    return 500;
  }

  if (
    normalized.includes(
      "api-football"
    )
  ) {
    return 502;
  }

  return 500;
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    let body:
      GeneratePredictionsBody = {};

    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      try {
        body =
          await request.json() as
            GeneratePredictionsBody;
      } catch {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid JSON request body.",
          },
          {
            status: 400,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }
    }

    const date =
      normalizeDate(
        body.date
      );

    const mode =
      normalizeMode(
        body.mode
      );

    const limit =
      normalizeLimit(
        body.limit,
        mode
      );

    /*
     * Overwrite is opt-in only.
     *
     * Existing predictions are skipped
     * before enriched API data is fetched,
     * which protects the API quota.
     */
    const overwrite =
      body.overwrite === true;

    const summary =
      await generatePredictionsForDate({
        date,
        limit,
        mode,
        overwrite,
        performedBy:
          admin.email ||
          admin.uid ||
          "unknown-admin",
      });

    const message =
      summary.generatedPredictions > 0
        ? `${summary.generatedPredictions} high-quality prediction(s) generated successfully.`
        : summary.existingPredictions > 0
          ? "Generation completed. Existing predictions were skipped."
          : summary.withheldPredictions > 0 ||
              summary.insufficientDataPredictions > 0
            ? "Generation completed, but some predictions were blocked by the quality gate."
            : "Generation completed. No new prediction was generated.";

    return NextResponse.json(
      {
        success: true,
        message,

        safeguards: {
          mode,
          requestedLimit:
            limit,
          maximumLimit:
            mode === "enriched"
              ? MAX_ENRICHED_LIMIT
              : MAX_BASIC_LIMIT,
          overwrite,
          apiDateRequests:
            summary.apiDateRequests,
          enrichedFixtureRequests:
            summary.enrichedFixtureRequests,
          existingPredictionsSkipped:
            summary.existingPredictions,
        },

        summary,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[ADMIN_PREDICTIONS_GENERATE_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate predictions.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(
            message
          ),
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}