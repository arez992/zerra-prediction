import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?live=all",
      {
        headers: {
          "x-apisports-key": process.env.API_SPORTS_KEY!,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch fixtures",
        error,
      },
      { status: 500 }
    );
  }
}