import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCompleteFixtureData,
} from "@/lib/api-football/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBooleanParam(
  value: string | null,
  fallback: boolean
): boolean {
  if (value === null) {
    return fallback;
  }

  return value === "true";
}

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "fixture id"
    ) ||
    normalized.includes(
      "valid numeric"
    )
  ) {
    return 400;
  }

  if (
    normalized.includes(
      "not found"
    )
  ) {
    return 404;
  }

  if (
    normalized.includes(
      "api_football_key"
    )
  ) {
    return 500;
  }

  return 502;
}

export async function GET(
  request: NextRequest
) {
  try {
    const fixtureId =
      request.nextUrl.searchParams.get(
        "fixture"
      );

    if (!fixtureId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "fixture id is required",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await getCompleteFixtureData(
        fixtureId,
        {
          includeHeadToHead:
            getBooleanParam(
              request.nextUrl.searchParams.get(
                "h2h"
              ),
              true
            ),
          includeInjuries:
            getBooleanParam(
              request.nextUrl.searchParams.get(
                "injuries"
              ),
              true
            ),
          includeOdds:
            getBooleanParam(
              request.nextUrl.searchParams.get(
                "odds"
              ),
              false
            ),
        }
      );

    return NextResponse.json(
      {
        success: true,
        ...data,
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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch match details.";

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch match details.",
        error: message,
      },
      {
        status:
          getErrorStatus(message),
      }
    );
  }
}