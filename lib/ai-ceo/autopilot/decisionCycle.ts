import "server-only";

import { runCEOBrain } from "@/lib/ai/ceo/brain";
import {
  approveCEODecision,
  applyCEODecisionPolicy,
  executeCEODecision,
} from "@/lib/ai/ceo/decisionWorkflow";
import { evaluateCEODecisionPolicy } from "@/lib/ai/ceo/policy";
import { saveCEODecision } from "@/lib/ai/ceo/storage";
import type { AICEODataSnapshot } from "@/lib/ai-ceo/dataCollector";
import { convertAutopilotSnapshotToCEOMetrics } from "./metricsAdapter";

const AUTOPILOT_ACTOR = {
  uid: "ai-ceo-autopilot",
  email: "ai-ceo-autopilot@system.local",
};

export async function runAutopilotDecisionCycle(input: {
  snapshot: AICEODataSnapshot;
  autoExecuteLowRisk: boolean;
}) {
  const metrics = convertAutopilotSnapshotToCEOMetrics(input.snapshot);
  const aiCallAttempted =
    process.env.AI_CEO_OPENAI_ENABLED === "true" &&
    Boolean(process.env.OPENAI_API_KEY);

  const engine = await runCEOBrain({
    metrics,
    instruction:
      "Run the guarded ZERRA AI CEO autopilot. Use verified data only. Never bypass approval policy. Large changes, publishing, financial actions, model changes, and new product features require Owner review.",
  });

  if (!engine.success) throw new Error(engine.error);

  const decisionId = await saveCEODecision({
    decision: engine.decision,
    metrics,
    source: engine.source,
    createdBy: AUTOPILOT_ACTOR.email,
    rawResponse: engine.rawResponse,
  });

  const policy = await evaluateCEODecisionPolicy(
    engine.decision,
    input.autoExecuteLowRisk
  );

  await applyCEODecisionPolicy(decisionId, policy);

  let approval: Awaited<ReturnType<typeof approveCEODecision>> | null = null;
  let execution: Awaited<ReturnType<typeof executeCEODecision>> | null = null;

  if (input.autoExecuteLowRisk && policy.eligibleForAutoApproval) {
    approval = await approveCEODecision(
      decisionId,
      AUTOPILOT_ACTOR,
      "auto_low_risk"
    );

    execution = await executeCEODecision(
      decisionId,
      AUTOPILOT_ACTOR
    );
  }

  return {
    decisionId,
    source: engine.source,
    aiCallAttempted,
    decision: engine.decision,
    policy,
    approval,
    execution,
    autoApproved: approval !== null,
    autoExecuted: execution !== null,
  };
}