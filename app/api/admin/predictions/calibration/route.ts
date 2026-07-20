import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

import {
  getPredictionCalibrationSummary,
} from "@/lib/zaos/learning/predictionCalibration";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const DEFAULT_LIMIT =
  500;

const MAX_LIMIT =
  2000;

function normalizeLimit(
  value:
    unknown
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

function getErrorStatus(
  message:
    string
): number {
  const normalized =
    message
      .toLowerCase();

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

  return 500;
}

export async function GET(
  request:
    NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

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
      await getPredictionCalibrationSummary({
        limit,
      });

    return NextResponse.json(
      {
        success:
          true,

        requestedBy:
          admin.email ||
          admin.uid ||
          "unknown-admin",

        safeguards: {
          readOnly:
            true,

          automaticModelChanges:
            false,

          automaticModelDeployment:
            false,

          humanApprovalRequired:
            true,
        },

        summary,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[ADMIN_PREDICTION_CALIBRATION_GET_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to load prediction calibration summary.";

    return NextResponse.json(
      {
        success:
          false,

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
            "private, no-store",
        },
      }
    );
  }
}