import "server-only";

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

export async function runCEOThroughZAOS(
  input: CEOEngineInput,
  options: DecisionOrchestratorOptions = {
    autoExecuteAllowedDelegations: false,
    stopAfterPolicyReview: false,
  }
): Promise<ZAOSCEOExecutionResult> {
  const context: AIRoleContext = {
    runId: crypto.randomUUID(),
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