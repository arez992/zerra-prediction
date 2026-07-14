import "server-only";

import {
  runCEOBrain,
} from "../brain";
import {
  runCEOThroughZAOS,
} from "../zaosAdapter";
import type {
  CEOEngineInput,
  CEOEngineResult,
} from "../types";
import {
  compareCEOShadowResults,
  type ShadowComparisonResult,
} from "./ShadowComparison";
import {
  getCEOShadowConfig,
  isShadowScoreAcceptable,
  shouldRunCEOShadow,
  withCEOShadowTimeout,
  type CEOShadowConfig,
} from "./ShadowConfig";
import type {
  OrchestratorResult,
} from "@/lib/zaos/orchestration/DecisionOrchestrator";

export const AI_CEO_SHADOW_RUNNER_VERSION = "1.1.0";

export type CEOShadowRunResult = {
  version: string;
  runAt: string;
  success: boolean;
  skipped: boolean;
  acceptable: boolean | null;

  config: CEOShadowConfig;

  legacy: CEOEngineResult;
  zaos: OrchestratorResult | null;
  comparison: ShadowComparisonResult | null;

  legacyDurationMs: number;
  zaosDurationMs: number;

  error: string | null;
};

async function runLegacy(
  input: CEOEngineInput
): Promise<{
  result: CEOEngineResult;
  durationMs: number;
}> {
  const startedAt = Date.now();
  const result = await runCEOBrain(input);

  return {
    result,
    durationMs: Date.now() - startedAt,
  };
}

async function runZAOS(
  input: CEOEngineInput,
  config: CEOShadowConfig
): Promise<{
  result: OrchestratorResult;
  durationMs: number;
}> {
  const startedAt = Date.now();

  const previousOpenAISetting =
    process.env.AI_CEO_OPENAI_ENABLED;

  try {
    if (config.forceRuleBasedZAOS) {
      process.env.AI_CEO_OPENAI_ENABLED = "false";
    }

    const { orchestration } =
      await withCEOShadowTimeout(
        runCEOThroughZAOS(
          input,
          {
            autoExecuteAllowedDelegations: false,
            stopAfterPolicyReview: false,
          }
        ),
        config.timeoutMs
      );

    return {
      result: orchestration,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (config.forceRuleBasedZAOS) {
      if (
        previousOpenAISetting === undefined
      ) {
        delete process.env
          .AI_CEO_OPENAI_ENABLED;
      } else {
        process.env.AI_CEO_OPENAI_ENABLED =
          previousOpenAISetting;
      }
    }
  }
}

export async function runCEOShadowMode(
  input: CEOEngineInput,
  config: CEOShadowConfig =
    getCEOShadowConfig()
): Promise<CEOShadowRunResult> {
  const runAt = new Date().toISOString();

  const legacyExecution =
    await runLegacy(input);

  if (!shouldRunCEOShadow(config)) {
    return {
      version:
        AI_CEO_SHADOW_RUNNER_VERSION,
      runAt,
      success:
        legacyExecution.result.success,
      skipped: true,
      acceptable: null,
      config,
      legacy:
        legacyExecution.result,
      zaos: null,
      comparison: null,
      legacyDurationMs:
        legacyExecution.durationMs,
      zaosDurationMs: 0,
      error: null,
    };
  }

  try {
    const zaosExecution =
      await runZAOS(
        input,
        config
      );

    const comparison =
      compareCEOShadowResults(
        legacyExecution.result,
        zaosExecution.result
      );

    const acceptable =
      isShadowScoreAcceptable(
        comparison.overallScore,
        config
      );

    return {
      version:
        AI_CEO_SHADOW_RUNNER_VERSION,
      runAt,
      success:
        legacyExecution.result.success &&
        zaosExecution.result.success,
      skipped: false,
      acceptable,
      config,
      legacy:
        legacyExecution.result,
      zaos:
        zaosExecution.result,
      comparison,
      legacyDurationMs:
        legacyExecution.durationMs,
      zaosDurationMs:
        zaosExecution.durationMs,
      error:
        zaosExecution.result.error,
    };
  } catch (error) {
    return {
      version:
        AI_CEO_SHADOW_RUNNER_VERSION,
      runAt,
      success: false,
      skipped: false,
      acceptable: false,
      config,
      legacy:
        legacyExecution.result,
      zaos: null,
      comparison: null,
      legacyDurationMs:
        legacyExecution.durationMs,
      zaosDurationMs: 0,
      error:
        error instanceof Error
          ? error.message
          : "AI CEO ZAOS shadow execution failed.",
    };
  }
}