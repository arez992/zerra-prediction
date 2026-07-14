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
import type {
  OrchestratorResult,
} from "@/lib/zaos/orchestration/DecisionOrchestrator";

export const AI_CEO_SHADOW_RUNNER_VERSION = "1.0.0";

export type CEOShadowRunResult = {
  version: string;
  runAt: string;
  success: boolean;

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
  input: CEOEngineInput
): Promise<{
  result: OrchestratorResult;
  durationMs: number;
}> {
  const startedAt = Date.now();

  const { orchestration } =
    await runCEOThroughZAOS(
      input,
      {
        autoExecuteAllowedDelegations: false,
        stopAfterPolicyReview: false,
      }
    );

  return {
    result: orchestration,
    durationMs: Date.now() - startedAt,
  };
}

export async function runCEOShadowMode(
  input: CEOEngineInput
): Promise<CEOShadowRunResult> {
  const runAt = new Date().toISOString();

  const [legacySettled, zaosSettled] =
    await Promise.allSettled([
      runLegacy(input),
      runZAOS(input),
    ]);

  const legacy =
    legacySettled.status === "fulfilled"
      ? legacySettled.value.result
      : {
          success: false as const,
          error:
            legacySettled.reason instanceof Error
              ? legacySettled.reason.message
              : "Legacy CEO shadow execution failed.",
        };

  const zaos =
    zaosSettled.status === "fulfilled"
      ? zaosSettled.value.result
      : null;

  const comparison =
    zaos !== null
      ? compareCEOShadowResults(
          legacy,
          zaos
        )
      : null;

  const errors: string[] = [];

  if (legacySettled.status === "rejected") {
    errors.push(
      legacySettled.reason instanceof Error
        ? legacySettled.reason.message
        : "Legacy CEO execution failed."
    );
  }

  if (zaosSettled.status === "rejected") {
    errors.push(
      zaosSettled.reason instanceof Error
        ? zaosSettled.reason.message
        : "ZAOS CEO execution failed."
    );
  }

  return {
    version:
      AI_CEO_SHADOW_RUNNER_VERSION,
    runAt,
    success:
      legacy.success &&
      zaos !== null &&
      zaos.success,
    legacy,
    zaos,
    comparison,
    legacyDurationMs:
      legacySettled.status === "fulfilled"
        ? legacySettled.value.durationMs
        : 0,
    zaosDurationMs:
      zaosSettled.status === "fulfilled"
        ? zaosSettled.value.durationMs
        : 0,
    error:
      errors.length > 0
        ? errors.join(" ")
        : null,
  };
}