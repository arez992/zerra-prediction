import "server-only";

import {
  buildRuleBasedActions,
  buildRuleBasedOpportunities,
  buildRuleBasedPriorities,
  buildRuleBasedRisks,
  calculateRuleBasedHealth,
} from "./priority";
import {
  parseCEODecision,
} from "./decision";
import {
  buildCEOUserPrompt,
  CEO_SYSTEM_PROMPT,
} from "./prompt";
import {
  CEO_ENGINE_VERSION,
  type CEODecision,
  type CEOEngineInput,
  type CEOEngineResult,
} from "./types";

function collectMissingMetrics(
  input: CEOEngineInput
): string[] {
  const { metrics } = input;

  const checks: Array<
    [string, unknown]
  > = [
    [
      "revenue.total",
      metrics.revenue.total,
    ],
    [
      "revenue.trendPercent",
      metrics.revenue.trendPercent,
    ],
    [
      "vip.conversionRate",
      metrics.vip.conversionRate,
    ],
    [
      "traffic.sessions",
      metrics.traffic.sessions,
    ],
    [
      "seo.averageQualityScore",
      metrics.seo.averageQualityScore,
    ],
    [
      "predictions.accuracyPercent",
      metrics.predictions
        .accuracyPercent,
    ],
    [
      "costs.total",
      metrics.costs.total,
    ],
  ];

  return checks
    .filter(
      ([, value]) =>
        value === null ||
        value === undefined
    )
    .map(([name]) => name);
}

function buildRuleBasedDecision(
  input: CEOEngineInput
): CEODecision {
  const missing =
    collectMissingMetrics(input);

  const priorities =
    buildRuleBasedPriorities(
      input.metrics
    );

  return {
    version:
      CEO_ENGINE_VERSION,
    generatedAt:
      new Date().toISOString(),
    summary:
      missing.length > 0
        ? "ZERRA is operating with incomplete executive data. The current decision focuses on verified operational signals and data collection."
        : "ZERRA executive health was evaluated from the available verified operating metrics.",
    confidence: Math.max(
      30,
      90 - missing.length * 8
    ),
    overallHealth:
      calculateRuleBasedHealth(
        input.metrics
      ),
    insufficientData: missing,
    todayPriorities:
      priorities,
    actions:
      buildRuleBasedActions(
        input.metrics
      ),
    risks:
      buildRuleBasedRisks(
        input.metrics
      ),
    opportunities:
      buildRuleBasedOpportunities(
        input.metrics
      ),
    evidence: [
      `Metrics generated at ${input.metrics.generatedAt}.`,
      `Prediction accuracy: ${
        input.metrics.predictions
          .accuracyPercent ?? "unavailable"
      }.`,
      `SEO average quality: ${
        input.metrics.seo
          .averageQualityScore ??
        "unavailable"
      }.`,
      `Recent operational errors: ${
        input.metrics.apiHealth
          .recentErrors ?? "unavailable"
      }.`,
    ],
  };
}

function getResponseText(
  payload: unknown
): string {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof (
      payload as {
        output_text?: unknown;
      }
    ).output_text === "string"
  ) {
    return (
      payload as {
        output_text: string;
      }
    ).output_text;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "output" in payload &&
    Array.isArray(
      (
        payload as {
          output?: unknown;
        }
      ).output
    )
  ) {
    const text = (
      payload as {
        output: Array<{
          content?: Array<{
            text?: string;
          }>;
        }>;
      }
    ).output
      .flatMap(
        (item) =>
          item.content || []
      )
      .map(
        (item) =>
          item.text || ""
      )
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error(
    "OpenAI response did not contain text output."
  );
}

async function runOpenAIDecision(
  input: CEOEngineInput
): Promise<{
  decision: CEODecision;
  rawResponse: string;
}> {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing"
    );
  }

  const model =
    process.env.OPENAI_CEO_MODEL ||
    "gpt-5-mini";

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${apiKey}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        model,
        instructions:
          CEO_SYSTEM_PROMPT,
        input:
          buildCEOUserPrompt(
            input
          ),
      }),
      cache: "no-store",
    }
  );

  const raw =
    await response.text();

  let payload: unknown;

  try {
    payload = raw
      ? JSON.parse(raw)
      : {};
  } catch {
    throw new Error(
      "OpenAI returned invalid JSON."
    );
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      (
        payload as {
          error?: {
            message?: unknown;
          };
        }
      ).error &&
      typeof (
        payload as {
          error: {
            message?: unknown;
          };
        }
      ).error.message === "string"
        ? (
            payload as {
              error: {
                message: string;
              };
            }
          ).error.message
        : "OpenAI CEO request failed.";

    throw new Error(message);
  }

  const rawResponse =
    getResponseText(payload);

  return {
    decision:
      parseCEODecision(
        rawResponse
      ),
    rawResponse,
  };
}

export async function runCEOBrain(
  input: CEOEngineInput
): Promise<CEOEngineResult> {
  try {
    if (
      process.env
        .AI_CEO_OPENAI_ENABLED ===
      "true"
    ) {
      try {
        const result =
          await runOpenAIDecision(
            input
          );

        return {
          success: true,
          source: "openai",
          decision:
            result.decision,
          rawResponse:
            result.rawResponse,
        };
      } catch (error) {
        console.error(
          "[AI_CEO_OPENAI_ERROR]",
          error
        );
      }
    }

    return {
      success: true,
      source: "rules",
      decision:
        buildRuleBasedDecision(
          input
        ),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to run AI CEO brain.",
    };
  }
}
