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

const DEFAULT_LIMIT =
  100;

const MAX_LIMIT =
  200;

function normalizeLimit(
  value: unknown
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
      "admin access required"
    ) ||
    normalized.includes(
      "forbidden"
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

function getBearerToken(
  request: NextRequest
): string {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith(
        "bearer "
      )
  ) {
    return "";
  }

  return authorization
    .slice(
      7
    )
    .trim();
}

function verifyCronRequest(
  request: NextRequest
): {
  valid: boolean;
  reason?: string;
} {
  const cronSecret =
    process.env
      .CRON_SECRET;

  if (
    !cronSecret
  ) {
    return {
      valid:
        false,

      reason:
        "CRON_SECRET is not configured.",
    };
  }

  const token =
    getBearerToken(
      request
    );

  if (
    !token ||
    token !==
      cronSecret
  ) {
    return {
      valid:
        false,

      reason:
        "Unauthorized cron request.",
    };
  }

  return {
    valid:
      true,
  };
}

async function runSettlement(
  limit:
    number
) {
  return settlePendingPredictions({
    limit,
  });
}

/*
 * Automated settlement endpoint.
 *
 * Intended for the scheduled cron job
 * configured in vercel.json.
 *
 * This route never generates new
 * predictions. It only checks existing
 * unsettled predictions against finished
 * fixture results.
 */
export async function GET(
  request:
    NextRequest
) {
  try {
    const verification =
      verifyCronRequest(
        request
      );

    if (
      !verification.valid
    ) {
      console.warn(
        "[PREDICTION_SETTLEMENT_CRON_UNAUTHORIZED]",
        verification.reason
      );

      return NextResponse.json(
        {
          success:
            false,

          error:
            verification.reason ||
            "Unauthorized cron request.",
        },
        {
          status:
            verification.reason ===
            "CRON_SECRET is not configured."
              ? 500
              : 401,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const limit =
      normalizeLimit(
        request
          .nextUrl
          .searchParams
          .get(
            "limit"
          )
      );

    const summary =
      await runSettlement(
        limit
      );

    return NextResponse.json(
      {
        success:
          true,

        source:
          "cron",

        checked:
          summary
            .eligiblePredictions,

        updated:
          summary
            .settledPredictions,

        message:
          summary
            .settledPredictions >
          0
            ? `${summary.settledPredictions} prediction(s) settled automatically.`
            : "Automated settlement completed. No eligible prediction was settled.",

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
      "[VALIDATE_PREDICTIONS_CRON_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to validate predictions.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "cron",

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

/*
 * Manual Admin settlement endpoint.
 *
 * Keeps the existing Admin workflow.
 *
 * Authentication uses the normal
 * server-side Admin session.
 */
export async function POST(
  request:
    NextRequest
) {
  try {
    const admin =
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
          await request
            .json();
      } catch {
        return NextResponse.json(
          {
            success:
              false,

            error:
              "Invalid JSON request body.",
          },
          {
            status:
              400,

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
      await runSettlement(
        limit
      );

    return NextResponse.json(
      {
        success:
          true,

        source:
          "admin",

        requestedBy:
          admin.email ||
          admin.uid ||
          "unknown-admin",

        checked:
          summary
            .eligiblePredictions,

        updated:
          summary
            .settledPredictions,

        message:
          summary
            .settledPredictions >
          0
            ? `${summary.settledPredictions} prediction(s) settled successfully.`
            : "Settlement completed. No eligible prediction was settled.",

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
      "[VALIDATE_PREDICTIONS_ADMIN_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to validate predictions.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "admin",

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