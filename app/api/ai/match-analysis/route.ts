import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { match, prediction } = await request.json();

    if (!match || !prediction) {
      return NextResponse.json(
        { success: false, error: "match and prediction are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const home = match?.fixture?.teams?.home?.name || "Home team";
    const away = match?.fixture?.teams?.away?.name || "Away team";
    const league = match?.fixture?.league?.name || "Football match";

    const prompt = `
You are ZERRA AI, a professional football prediction analyst.

Analyze this match and return ONLY valid JSON.

Match:
${home} vs ${away}
League: ${league}

Prediction data:
Confidence: ${prediction.confidence}%
Home Win: ${prediction.homeWin}%
Draw: ${prediction.draw}%
Away Win: ${prediction.awayWin}%
Over 2.5: ${prediction.over25}%
Under 2.5: ${prediction.under25}%
BTTS: ${prediction.btts}%
Risk: ${prediction.risk}
Value Bet: ${prediction.valueBet}

Return JSON with this shape:
{
  "summary": "short professional match analysis",
  "verdict": "final prediction verdict",
  "reasons": ["reason 1", "reason 2", "reason 3", "reason 4"],
  "bestPick": "best pick",
  "riskNote": "short risk explanation"
}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.5-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data },
        { status: response.status }
      );
    }

    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    let analysis;

    try {
      analysis = JSON.parse(text);
    } catch {
      analysis = {
        summary: text || "AI analysis unavailable.",
        verdict: prediction.valueBet,
        reasons: [],
        bestPick: prediction.valueBet,
        riskNote: `Risk level: ${prediction.risk}`,
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}