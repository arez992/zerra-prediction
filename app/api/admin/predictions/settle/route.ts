import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

import {
  settlePendingPredictions,
} from "@/lib/ai-ceo/prediction/settlement";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type SettlePredictionsBody = {
  limit?: number;
};

function normalizeLimit(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return 100;
  }

  return Math.min(
    200,
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
      SettlePredictionsBody = {};

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
            SettlePredictionsBody;
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

    const limit =
      normalizeLimit(
        body.limit
      );

    const summary =
      await settlePendingPredictions({
        limit,
      });

    return NextResponse.json(
      {
        success: true,

        message:
          summary.settledPredictions >
          0
            ? `${summary.settledPredictions} prediction(s) settled successfully.`
            : "Settlement completed. No eligible prediction was settled.",

        requestedBy:
          admin.email ||
          admin.uid ||
          "unknown-admin",

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
      "[ADMIN_PREDICTIONS_SETTLE_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to settle predictions.";

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