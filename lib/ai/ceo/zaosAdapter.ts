import "server-only";

import { randomUUID } from "crypto";

import {
  runDecisionOrchestrator,
  type DecisionOrchestratorOptions,
  type OrchestratorResult,
} from "@/lib/zaos/orchestration/DecisionOrchestrator";
import type {
  AIRoleContext,
} from "@/lib/zaos";
import {
  ZERRAICEORole,
} from "./ZERRAICEORole";
import type {
  CEOEngineInput,
} from "./types";

export type ZAOSCEOExecutionResult = {
  orchestration: OrchestratorResult;
};

const DEFAULT_OPTIONS: DecisionOrchestratorOptions = {
  autoExecuteAllowedDelegations: false,
  stopAfterPolicyReview: false,
};

export async function runCEOThroughZAOS(
  input: CEOEngineInput,
  options: DecisionOrchestratorOptions =
    DEFAULT_OPTIONS
): Promise<ZAOSCEOExecutionResult> {
  const context: AIRoleContext = {
    runId: randomUUID(),
    roleId: "zerra-ai-ceo",
    startedAt: new Date().toISOString(),
    requestedBy: "zaos-adapter",
    instruction: input.instruction,
    metadata: {
      migrationMode: true,
      legacyBrainPreserved: true,
    },
  };

  const role = new ZERRAICEORole(input);

  const orchestration =
    await runDecisionOrchestrator(
      role,
      context,
      options
    );

  return {
    orchestration,
  };
}