import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}`,
      {
        method: "GET",
        headers: {
          "x-apisports-key": process.env.API_SPORTS_KEY || "",
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

    return NextResponse.json({
      success: true,
      date: today,
      count: data.results,
      fixtures: data.response,
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