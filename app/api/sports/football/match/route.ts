import { NextRequest, NextResponse } from "next/server";

async function fetchApi(path: string, apiKey: string) {
  const response = await fetch(`https://v3.football.api-sports.io/${path}`, {
    method: "GET",
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  });

  const data = await response.json();
  return { response, data };
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.API_SPORTS_KEY;
    const fixtureId = request.nextUrl.searchParams.get("fixture");

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "API_SPORTS_KEY is missing" },
        { status: 500 }
      );
    }

    if (!fixtureId) {
      return NextResponse.json(
        { success: false, message: "fixture id is required" },
        { status: 400 }
      );
    }

    const [fixtureRes, statsRes, eventsRes, lineupsRes] = await Promise.all([
      fetchApi(`fixtures?id=${fixtureId}`, apiKey),
      fetchApi(`fixtures/statistics?fixture=${fixtureId}`, apiKey),
      fetchApi(`fixtures/events?fixture=${fixtureId}`, apiKey),
      fetchApi(`fixtures/lineups?fixture=${fixtureId}`, apiKey),
    ]);

    if (!fixtureRes.response.ok) {
      return NextResponse.json(
        { success: false, error: fixtureRes.data },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fixture: fixtureRes.data.response?.[0] || null,
      statistics: statsRes.data.response || [],
      events: eventsRes.data.response || [],
      lineups: lineupsRes.data.response || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch match details",
        error: error.message,
      },
      { status: 500 }
    );
  }
}