import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    engine: "ZERRA AI Prediction Engine",
    predictions: [
      {
        sport: "Football",
        league: "Premier League",
        match: "Manchester City vs Arsenal",
        prediction: "Over 2.5 Goals",
        confidence: 92,
        risk: "Medium",
        access: "Free",
      },
      {
        sport: "Basketball",
        league: "NBA",
        match: "Lakers vs Celtics",
        prediction: "Lakers Win",
        confidence: 88,
        risk: "Medium",
        access: "VIP",
      },
    ],
  });
}