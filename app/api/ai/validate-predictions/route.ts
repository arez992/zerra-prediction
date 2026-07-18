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

export const revalidate =
  0;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

function normalizeLimit(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
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

export async function POST(
  request: NextRequest
) {
  try {
    await requireServerAdmin();

    let body: {
      limit?: number;
    } = {};

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
          await request.json();
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
      await settlePendingPredictions(
        {
          limit,
        }
      );

    return NextResponse.json(
      {
        success: true,
        checked:
          summary
            .eligiblePredictions,
        updated:
          summary
            .settledPredictions,
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
      "[VALIDATE_PREDICTIONS_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to validate predictions.";

    const normalized =
      message.toLowerCase();

    const status =
      normalized.includes(
        "unauthorized"
      ) ||
      normalized.includes(
        "authentication required"
      )
        ? 401
        : normalized.includes(
            "admin access required"
          ) ||
          normalized.includes(
            "forbidden"
          )
        ? 403
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}