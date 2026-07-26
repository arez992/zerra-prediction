import "server-only";

import { randomUUID } from "node:crypto";

import { collectAICEOData } from "@/lib/ai-ceo/dataCollector";
import { evaluateAutopilotCostGuard } from "./costGuard";
import { runAutopilotDecisionCycle } from "./decisionCycle";
import { createAutopilotSnapshotFingerprint } from "./fingerprint";
import {
  claimAutopilotLease,
  completeAutopilotRun,
  createAutopilotRun,
  getAutopilotConfig,
  releaseAutopilotLease,
  updateAutopilotRuntimeState,
} from "./repository";

export async function runAICEOAutopilotCycle(
  triggerSource: "cron" | "manual" = "cron"
) {
  const guard = await evaluateAutopilotCostGuard();

  if (!guard.allowed) {
    return { success: true, skipped: true, reason: guard.reason, usage: guard.usage };
  }

  const leaseOwner = `${triggerSource}:${randomUUID()}`;
  const leaseClaimed = await claimAutopilotLease(leaseOwner, 600);

  if (!leaseClaimed) {
    return {
      success: true,
      skipped: true,
      reason: "concurrent_run_active",
    };
  }

  const run = await createAutopilotRun(triggerSource);

  try {
    const [config, snapshot] = await Promise.all([
      getAutopilotConfig(),
      collectAICEOData(),
    ]);

    const fingerprint = createAutopilotSnapshotFingerprint(snapshot);

    if (config.skip_unchanged && config.last_snapshot_fingerprint === fingerprint) {
      await completeAutopilotRun(run.id, {
        status: "skipped",
        fingerprint,
        skippedReason: "snapshot_unchanged",
        aiCallUsed: false,
        result: { snapshotGeneratedAt: snapshot.generatedAt },
      });

      await updateAutopilotRuntimeState({ fingerprint, aiCallUsed: false });

      return { success: true, skipped: true, reason: "snapshot_unchanged", fingerprint };
    }

    const openAiConfigured =
      process.env.AI_CEO_OPENAI_ENABLED === "true" &&
      Boolean(process.env.OPENAI_API_KEY);

    if (openAiConfigured && !guard.allowAiCall) {
      await completeAutopilotRun(run.id, {
        status: "skipped",
        fingerprint,
        skippedReason: "ai_call_cost_guard_active",
        aiCallUsed: false,
        result: { snapshotGeneratedAt: snapshot.generatedAt },
      });

      await updateAutopilotRuntimeState({ aiCallUsed: false });

      return {
        success: true,
        skipped: true,
        reason: "ai_call_cost_guard_active",
        fingerprint,
      };
    }

    const result = await runAutopilotDecisionCycle({
      snapshot,
      autoExecuteLowRisk: config.auto_execute_low_risk,
    });

    await completeAutopilotRun(run.id, {
      status: result.execution && !result.execution.success ? "failed" : "completed",
      fingerprint,
      aiSource: result.source,
      aiCallUsed: result.aiCallAttempted,
      decisionId: result.decisionId,
      autoApproved: result.autoApproved,
      autoExecuted: result.autoExecuted,
      result: {
        snapshotGeneratedAt: snapshot.generatedAt,
        confidence: result.decision.confidence,
        overallHealth: result.decision.overallHealth,
        enabledActions: result.policy.enabledActions,
        approvalMode: result.policy.mode,
        policyReasons: result.policy.reasons,
        executionStatus: result.execution?.status || null,
      },
    });

    await updateAutopilotRuntimeState({
      fingerprint,
      aiCallUsed: result.aiCallAttempted,
    });

    return {
      success: result.execution?.success !== false,
      skipped: false,
      fingerprint,
      decisionId: result.decisionId,
      source: result.source,
      aiCallUsed: result.aiCallAttempted,
      policy: result.policy,
      autoApproved: result.autoApproved,
      autoExecuted: result.autoExecuted,
      execution: result.execution,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autopilot cycle failed.";

    await completeAutopilotRun(run.id, {
      status: "failed",
      error: message,
      aiCallUsed: false,
    });

    throw error;
  } finally {
    try {
      await releaseAutopilotLease(leaseOwner);
    } catch (releaseError) {
      console.error("[AI_CEO_AUTOPILOT_LEASE_RELEASE_ERROR]", releaseError);
    }
  }
}