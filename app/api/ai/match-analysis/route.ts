import {
  NextResponse,
} from "next/server";

import {
  buildAIContext,
} from "@/lib/ai/context";

import {
  createAIAnalysisCacheKey,
  getCachedAIAnalysis,
  saveAIAnalysisCache,
} from "@/lib/ai/cache";

import {
  savePredictionHistory,
} from "@/lib/ai/history";

function getFixtureId(
  match: any
) {
  return String(
    match?.fixture?.fixture?.id ||
      match?.fixture?.id ||
      match?.id ||
      "unknown"
  );
}

function getTeamName(
  match: any,
  side: "home" | "away"
): string {
  return (
    match?.fixture
      ?.teams?.[side]?.name ||
    match?.teams
      ?.[side]?.name ||
    (
      side === "home"
        ? "Home team"
        : "Away team"
    )
  );
}

function buildFallbackAnalysis(
  match: any,
  prediction: any
) {
  const homeTeam =
    getTeamName(
      match,
      "home"
    );

  const awayTeam =
    getTeamName(
      match,
      "away"
    );

  const finalPrediction =
    prediction
      ?.vipPrediction
      ?.finalPrediction ||
    prediction
      ?.finalPrediction ||
    "No strong prediction";

  const exactScore =
    prediction
      ?.vipPrediction
      ?.exactScore ||
    prediction
      ?.exactScore ||
    "N/A";

  const valueSignal =
    prediction
      ?.vipPrediction
      ?.valueBet ||
    prediction
      ?.valueBet ||
    "No Value";

  const confidence =
    Number(
      prediction?.confidence ??
      prediction
        ?.vipPrediction
        ?.confidence ??
      0
    );

  const risk =
    prediction?.risk ||
    "Unknown";

  const reasons =
    Array.isArray(
      prediction
        ?.vipPrediction
        ?.reasoning
    )
      ? prediction
          .vipPrediction
          .reasoning
          .slice(
            0,
            4
          )
      : [];

  return {
    summary:
      `ZERRA's internal prediction engine analyzed ${homeTeam} vs ${awayTeam}. ` +
      `The current model prediction is ${finalPrediction} with ${Math.round(
        confidence
      )}% confidence and an estimated score of ${exactScore}.`,

    verdict:
      finalPrediction,

    reasons:
      reasons.length > 0
        ? reasons
        : [
            `Model confidence is ${Math.round(
              confidence
            )}%.`,

            `Current risk level is ${risk}.`,

            `Estimated score is ${exactScore}.`,

            `Current model signal is ${valueSignal}.`,
          ],

    bestPick:
      valueSignal,

    riskNote:
      `Risk level: ${risk}.`,
  };
}

function getOpenAIErrorCode(
  data: any
): string {
  return String(
    data?.error?.code ||
    data?.code ||
    ""
  );
}

export async function POST(
  request: Request
) {
  try {
    const {
      match,
      prediction,
    } =
      await request.json();

    if (
      !match ||
      !prediction
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "match and prediction are required",
        },
        {
          status: 400,
        }
      );
    }

    const context =
      buildAIContext(
        match,
        prediction
      );

    const cacheKey =
      createAIAnalysisCacheKey(
        match
      );

    const fixtureId =
      getFixtureId(
        match
      );

    const cachedAnalysis =
      await getCachedAIAnalysis(
        cacheKey
      );

    if (cachedAnalysis) {
      await savePredictionHistory({
        fixtureId,
        match,
        prediction,
        analysis:
          cachedAnalysis,
        cacheKey,
      });

      return NextResponse.json({
        success: true,
        cached: true,
        fallback: false,
        context,
        analysis:
          cachedAnalysis,
      });
    }

    const fallbackAnalysis =
      buildFallbackAnalysis(
        match,
        prediction
      );

    const apiKey =
      process.env
        .OPENAI_API_KEY;

    /*
     * OpenAI is an enhancement layer,
     * not a dependency for the core
     * ZERRA prediction engine.
     */
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        cached: false,
        fallback: true,
        fallbackReason:
          "openai-key-unavailable",
        context,
        analysis:
          fallbackAnalysis,
      });
    }

    const prompt = `
You are ZERRA AI, a professional football prediction analyst.

Analyze the following football match using the provided AI context.

You must remain consistent with the existing ZERRA prediction.
Do not change the final prediction, exact score logic, or risk classification.

Return ONLY valid JSON.
Do not include markdown.

AI Context:
${JSON.stringify(
  context,
  null,
  2
)}

Return JSON with this exact shape:
{
  "summary": "short professional match analysis",
  "verdict": "final prediction verdict",
  "reasons": ["reason 1", "reason 2", "reason 3", "reason 4"],
  "bestPick": "best model pick",
  "riskNote": "short risk explanation"
}
`;

    let response:
      Response;

    try {
      response =
        await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                model:
                  "gpt-5-mini",

                input:
                  prompt,
              }),
          }
        );
    } catch {
      return NextResponse.json({
        success: true,
        cached: false,
        fallback: true,
        fallbackReason:
          "openai-network-error",
        context,
        analysis:
          fallbackAnalysis,
      });
    }

    let data: any;

    try {
      data =
        await response.json();
    } catch {
      return NextResponse.json({
        success: true,
        cached: false,
        fallback: true,
        fallbackReason:
          "openai-invalid-response",
        context,
        analysis:
          fallbackAnalysis,
      });
    }

    if (!response.ok) {
      const errorCode =
        getOpenAIErrorCode(
          data
        );

      console.warn(
        "[OPENAI_ANALYSIS_FALLBACK]",
        {
          fixtureId,
          status:
            response.status,
          code:
            errorCode,
        }
      );

      return NextResponse.json({
        success: true,
        cached: false,
        fallback: true,

        fallbackReason:
          errorCode ||
          "openai-api-error",

        context,

        analysis:
          fallbackAnalysis,
      });
    }

    const text =
      data.output_text ||
      data.output?.[0]
        ?.content?.[0]
        ?.text ||
      "";

    let analysis:
      any;

    try {
      analysis =
        JSON.parse(
          text
        );
    } catch {
      analysis =
        fallbackAnalysis;
    }

    await saveAIAnalysisCache(
      cacheKey,
      analysis,
      context
    );

    await savePredictionHistory({
      fixtureId,
      match,
      prediction,
      analysis,
      cacheKey,
    });

    return NextResponse.json({
      success: true,
      cached: false,
      fallback: false,
      context,
      analysis,
    });
  } catch (error) {
    console.error(
      "[MATCH_ANALYSIS_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate match analysis.";

    return NextResponse.json(
      {
        success: false,
        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}