import "server-only";

import {
  generatePredictionsForDate,
  type PredictionGenerationMode,
} from "@/lib/ai-ceo/prediction/generator";

import type {
  ExecutionContext,
  ExecutionResult,
} from "../types";

function getTodayUTC(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function normalizeDate(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return getTodayUTC();
  }

  const date =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      "Prediction generation date must use YYYY-MM-DD format."
    );
  }

  return date;
}

function normalizeMode(
  value: unknown
): PredictionGenerationMode {
  return value === "basic"
    ? "basic"
    : "enriched";
}

function normalizeLimit(
  value: unknown,
  mode: PredictionGenerationMode
): number {
  const parsed =
    Number(value);

  const defaultLimit =
    mode === "enriched"
      ? 3
      : 10;

  const maximumLimit =
    mode === "enriched"
      ? 5
      : 25;

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return defaultLimit;
  }

  return Math.min(
    maximumLimit,
    Math.max(
      1,
      Math.floor(
        parsed
      )
    )
  );
}

function normalizeOverwrite(
  value: unknown
): boolean {
  return value === true;
}

function getPerformedBy(
  context: ExecutionContext
): string {
  const executedBy =
    context.metadata
      ?.executedBy;

  if (
    typeof executedBy ===
      "string" &&
    executedBy.trim()
  ) {
    return executedBy.trim();
  }

  return "ai-ceo";
}

/*
 * AI CEO Prediction Executor
 *
 * Purpose:
 *
 * Allow ZAOS / AI CEO to execute the
 * existing canonical prediction-generation
 * pipeline.
 *
 * This executor does NOT create a second
 * prediction engine.
 *
 * It delegates all prediction work to:
 *
 * generatePredictionsForDate()
 *
 * Therefore all existing safeguards remain:
 *
 * - pre-match checks
 * - API-Football enrichment controls
 * - quality gate
 * - generation decision
 * - prediction audit logs
 * - deterministic prediction IDs
 * - duplicate protection
 *
 * Auto-approval / auto-publication is handled
 * separately by the AI CEO publishing policy.
 */
export async function predictionExecutor(
  context: ExecutionContext
): Promise<ExecutionResult> {
  try {
    const payload =
      context.payload || {};

    const date =
      normalizeDate(
        payload.date
      );

    const mode =
      normalizeMode(
        payload.mode
      );

    const limit =
      normalizeLimit(
        payload.limit,
        mode
      );

    const overwrite =
      normalizeOverwrite(
        payload.overwrite
      );

    const performedBy =
      getPerformedBy(
        context
      );

    const summary =
      await generatePredictionsForDate({
        date,
        mode,
        limit,
        overwrite,

        performedBy:
          `ai-ceo:${performedBy}`,
      });

    const generated =
      summary.generatedPredictions;

    const blocked =
      summary.withheldPredictions +
      summary.insufficientDataPredictions;

    const failed =
      summary.failedPredictions;

    let message =
      "AI CEO prediction generation completed.";

    if (
      generated >
      0
    ) {
      message =
        `AI CEO generated ${generated} prediction(s) successfully.`;
    } else if (
      failed >
      0
    ) {
      message =
        `AI CEO prediction generation completed with ${failed} failed prediction(s).`;
    } else if (
      blocked >
      0
    ) {
      message =
        `AI CEO prediction generation completed. ${blocked} prediction(s) were blocked by ZERRA safety or data-quality rules.`;
    } else if (
      summary.existingPredictions >
      0
    ) {
      message =
        "AI CEO prediction generation completed. Existing predictions were preserved and skipped.";
    }

    return {
      success:
        failed === 0,

      /*
       * The execution itself is complete even
       * when no prediction qualifies.
       *
       * A prediction being withheld by the
       * quality gate is a valid system outcome,
       * not an incomplete executor run.
       */
      completed:
        true,

      message,

      data: {
        executor:
          "prediction",

        action:
          "generate-predictions",

        requestedBy:
          "ai-ceo",

        date,

        mode,

        limit,

        overwrite,

        generatedPredictions:
          summary.generatedPredictions,

        skippedPredictions:
          summary.skippedPredictions,

        existingPredictions:
          summary.existingPredictions,

        withheldPredictions:
          summary.withheldPredictions,

        insufficientDataPredictions:
          summary.insufficientDataPredictions,

        failedPredictions:
          summary.failedPredictions,

        fixturesFound:
          summary.fixturesFound,

        eligibleFixtures:
          summary.eligibleFixtures,

        apiDateRequests:
          summary.apiDateRequests,

        enrichedFixtureRequests:
          summary.enrichedFixtureRequests,

        summary,
      },
    };
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "AI CEO prediction generation failed.";

    return {
      success:
        false,

      completed:
        false,

      message,

      data: {
        executor:
          "prediction",

        action:
          "generate-predictions",

        requestedBy:
          "ai-ceo",

        error:
          message,
      },
    };
  }
}