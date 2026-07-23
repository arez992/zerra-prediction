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
} from "@/lib/ai/server-cache";

import {
  savePredictionHistory,
} from "@/lib/ai/history";

const OPENAI_TIMEOUT_MS =
  8_000;

function getFixtureId(
  match: any
) {
  return String(
    match?.fixture
      ?.fixture
      ?.id ||
      match?.fixture
        ?.id ||
      match?.id ||
      "unknown"
  );
}

function getTeamName(
  match: any,
  side:
    | "home"
    | "away"
): string {
  return (
    match?.fixture
      ?.teams
      ?.[side]
      ?.name ||
    match?.teams
      ?.[side]
      ?.name ||
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

  const primaryPrediction =
    prediction
      ?.vipPrediction
      ?.primaryPrediction ||
    {};

  const primaryPick =
    typeof primaryPrediction
      ?.pick === "string" &&
    primaryPrediction
      .pick
      .trim()
      ? primaryPrediction
          .pick
          .trim()
      : "No Strong Prediction";

  const primaryCategory =
    typeof primaryPrediction
      ?.category === "string" &&
    primaryPrediction
      .category
      .trim()
      ? primaryPrediction
          .category
          .trim()
      : "No Strong Prediction";

  const primaryQualified =
    primaryPrediction
      ?.qualified === true;

  const confidence =
    Number(
      primaryPrediction
        ?.confidence ??
      prediction
        ?.vipPrediction
        ?.confidence ??
      prediction
        ?.confidence ??
      0
    );

  const exactScore =
    prediction
      ?.vipPrediction
      ?.exactScore ||
    "N/A";

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
            5
          )
      : [];

  if (
    !primaryQualified
  ) {
    return {
      summary:
        `ZERRA's internal prediction engine analyzed ${homeTeam} vs ${awayTeam} across supported football markets. ` +
        `No market currently meets the required qualification standard for a strong primary prediction.`,

      verdict:
        primaryPick,

      reasons:
        reasons.length > 0
          ? reasons
          : [
              `Primary market category: ${primaryCategory}.`,

              `Current evidence-adjusted confidence is ${Math.round(
                confidence
              )}%.`,

              `Current risk level is ${risk}.`,

              "ZERRA does not force a weak prediction when the available evidence is insufficient.",
            ],

      bestPick:
        primaryPick,

      riskNote:
        `Risk level: ${risk}. No strong market prediction is being forced.`,
    };
  }

  return {
    summary:
      `ZERRA's internal prediction engine analyzed ${homeTeam} vs ${awayTeam} and selected ${primaryPick} ` +
      `from the ${primaryCategory} market family with ${Math.round(
        confidence
      )}% evidence-adjusted confidence.`,

    verdict:
      primaryPick,

    reasons:
      reasons.length > 0
        ? reasons
        : [
            `Primary market category: ${primaryCategory}.`,

            `Primary market pick: ${primaryPick}.`,

            `Evidence-adjusted confidence is ${Math.round(
              confidence
            )}%.`,

            `Current risk level is ${risk}.`,

            exactScore !== "N/A"
              ? `Supplemental exact-score estimate: ${exactScore}.`
              : "No supplemental exact-score estimate is available.",
          ],

    bestPick:
      primaryPick,

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
          success:
            false,

          error:
            "match and prediction are required",
        },
        {
          status:
            400,
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
        match,
        prediction
      );

    const fixtureId =
      getFixtureId(
        match
      );

    /*
     * Cache first.
     *
     * A cache hit performs no
     * predictionHistory write.
     */
    const cachedAnalysis =
      await getCachedAIAnalysis(
        cacheKey
      );

    if (
      cachedAnalysis
    ) {
      return NextResponse.json({
        success:
          true,

        cached:
          true,

        fallback:
          false,

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
     * OpenAI is enhancement only.
     *
     * ZERRA's statistical prediction
     * engine remains the authority for
     * market selection.
     */
    if (
      !apiKey
    ) {
      await saveAIAnalysisCache(
        cacheKey,
        fallbackAnalysis,
        context
      );

      return NextResponse.json({
        success:
          true,

        cached:
          false,

        fallback:
          true,

        fallbackReason:
          "openai-key-unavailable",

        context,

        analysis:
          fallbackAnalysis,
      });
    }

    const prompt = `
You are ZERRA AI, a professional football market-analysis assistant.

Analyze the provided football match using the supplied ZERRA AI context.

IMPORTANT RULES:

1. The canonical ZERRA prediction is:
   vipPrediction.primaryPrediction

2. You MUST NOT change:
   - primaryPrediction.pick
   - primaryPrediction.category
   - primaryPrediction.confidence
   - primaryPrediction.qualified
   - risk classification

3. 1X2 Home/Draw/Away probabilities are supporting analysis only.
   They must NOT replace the canonical primary market prediction.

4. Exact score is supplemental only.
   It must NOT override or redefine the primary market prediction.

5. If primaryPrediction.qualified is false:
   - Do NOT invent a stronger pick.
   - Do NOT recommend another market as the final verdict.
   - Clearly explain that ZERRA is withholding a strong prediction.

6. Do not fabricate football facts, injuries, lineups, statistics,
   form, or external data that are not present in the supplied context.

7. Your role is explanation only.
   ZERRA's internal prediction engine remains the source of truth.

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
  "summary": "short professional market-focused match analysis",
  "verdict": "must exactly match the canonical primary market pick",
  "reasons": ["reason 1", "reason 2", "reason 3", "reason 4"],
  "bestPick": "must exactly match the canonical primary market pick",
  "riskNote": "short risk explanation"
}
`;

    let response:
      Response;

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        OPENAI_TIMEOUT_MS
      );

    try {
      response =
        await fetch(
          "https://api.openai.com/v1/responses",
          {
            method:
              "POST",

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

            signal:
              controller.signal,
          }
        );
    } catch {
      await saveAIAnalysisCache(
        cacheKey,
        fallbackAnalysis,
        context
      );

      return NextResponse.json({
        success:
          true,

        cached:
          false,

        fallback:
          true,

        fallbackReason:
          "openai-network-or-timeout",

        context,

        analysis:
          fallbackAnalysis,
      });
    } finally {
      clearTimeout(
        timeout
      );
    }

    let data:
      any;

    try {
      data =
        await response
          .json();
    } catch {
      await saveAIAnalysisCache(
        cacheKey,
        fallbackAnalysis,
        context
      );

      return NextResponse.json({
        success:
          true,

        cached:
          false,

        fallback:
          true,

        fallbackReason:
          "openai-invalid-response",

        context,

        analysis:
          fallbackAnalysis,
      });
    }

    if (
      !response.ok
    ) {
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

      await saveAIAnalysisCache(
        cacheKey,
        fallbackAnalysis,
        context
      );

      return NextResponse.json({
        success:
          true,

        cached:
          false,

        fallback:
          true,

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

    let usedFallback =
      false;

    try {
      analysis =
        JSON.parse(
          text
        );
    } catch {
      analysis =
        fallbackAnalysis;

      usedFallback =
        true;
    }

    const canonicalPrimary =
      prediction
        ?.vipPrediction
        ?.primaryPrediction;

    const canonicalPick =
      canonicalPrimary
        ?.pick ||
      fallbackAnalysis
        .bestPick;

    /*
     * OpenAI is not allowed to override
     * the prediction engine.
     *
     * Force canonical market fields even
     * if the model returns something else.
     */
    analysis = {
      ...analysis,

      verdict:
        canonicalPick,

      bestPick:
        canonicalPick,
    };

    /*
     * Save the generated analysis once.
     *
     * Future requests use cache and
     * avoid repeated Firestore writes.
     */
    await saveAIAnalysisCache(
      cacheKey,
      analysis,
      context
    );

    if (
      !usedFallback
    ) {
      await savePredictionHistory({
        fixtureId,

        match,

        prediction,

        analysis,

        cacheKey,
      });
    }

    return NextResponse.json({
      success:
        true,

      cached:
        false,

      fallback:
        usedFallback,

      fallbackReason:
        usedFallback
          ? "openai-json-parse-error"
          : undefined,

      context,

      analysis,
    });
  } catch (
    error
  ) {
    console.error(
      "[MATCH_ANALYSIS_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to generate match analysis.";

    return NextResponse.json(
      {
        success:
          false,

        error:
          message,
      },
      {
        status:
          500,
      }
    );
  }
}