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

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

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
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  ) {
    throw new Error(
      "Generation date must use YYYY-MM-DD format."
    );
  }

  return value.trim();
}

function normalizeLimit(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return 10;
  }

  return Math.min(
    25,
    Math.max(
      1,
      Math.floor(parsed)
    )
  );
}

function normalizeMode(
  value: unknown
): PredictionGenerationMode {
  return value === "enriched"
    ? "enriched"
    : "basic";
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

    const limit =
      normalizeLimit(
        body.limit
      );

    const mode =
      normalizeMode(
        body.mode
      );

    const summary =
      await generatePredictionsForDate({
        date,
        limit,
        mode,
        overwrite:
          body.overwrite ===
          true,
        performedBy:
          admin.email ||
          admin.uid ||
          "unknown-admin",
      });

    return NextResponse.json(
      {
        success: true,

        message:
          summary.generatedPredictions >
          0
            ? `${summary.generatedPredictions} prediction(s) generated successfully.`
            : "Generation completed. No new prediction was generated.",

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
        error:
          message,
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