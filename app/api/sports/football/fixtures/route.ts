import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getFixturesByDate,
} from "@/lib/api-football/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getErrorStatus(message: string): number {
  const normalized = message.toLowerCase();

  if (normalized.includes("yyyy-mm-dd")) {
    return 400;
  }

  if (normalized.includes("api_football_key")) {
    return 500;
  }

  return 502;
}

export async function GET(request: NextRequest) {
  try {
    const date =
      request.nextUrl.searchParams.get("date")?.trim() ||
      getTodayUTC();

    const fixtures = await getFixturesByDate(date);

    return NextResponse.json(
      {
        success: true,
        date,
        count: fixtures.length,
        fixtures,
        cachedForSeconds: 900,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch football fixtures.";

    return NextResponse.json(
      {
        success: false,
        fixtures: [],
        message: "Failed to fetch football fixtures.",
        error: message,
      },
      {
        status: getErrorStatus(message),
      }
    );
  }
}