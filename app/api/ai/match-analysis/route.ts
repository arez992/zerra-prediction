import { NextResponse } from "next/server";
import { buildAIContext } from "@/lib/ai/context";

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

    const context = buildAIContext(match, prediction);

    const prompt = `
You are ZERRA AI, a professional football prediction analyst.

Analyze the following football match using the provided AI context.
Return ONLY valid JSON. Do not include markdown.

AI Context:
${JSON.stringify(context, null, 2)}

Return JSON with this exact shape:
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

    const text = data.output_text || data.output?.[0]?.content?.[0]?.text || "";

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
      context,
      analysis,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}