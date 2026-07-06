import { NextResponse } from "next/server";

function formatDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

export async function GET() {
  try {
    const apiKey = process.env.API_SPORTS_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "API_SPORTS_KEY is missing" },
        { status: 500 }
      );
    }

    const dates = [formatDate(0), formatDate(1), formatDate(-1)];

    for (const date of dates) {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures?date=${date}`,
        {
          method: "GET",
          headers: {
            "x-apisports-key": apiKey,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data },
          { status: 400 }
        );
      }

      if (Array.isArray(data.response) && data.response.length > 0) {
        return NextResponse.json({
          success: true,
          date,
          count: data.results,
          fixtures: data.response,
        });
      }
    }

    return NextResponse.json({
      success: true,
      date: dates[0],
      count: 0,
      fixtures: [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch football fixtures",
        error: error.message,
      },
      { status: 500 }
    );
  }
}