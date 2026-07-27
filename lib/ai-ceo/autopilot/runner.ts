import "server-only";

import { randomUUID } from "node:crypto";

import { collectAICEOData } from "@/lib/ai-ceo/dataCollector";
import { adminDb } from "@/lib/firebaseAdmin";
import { approveCEORecommendation, executeCEORecommendation } from "@/lib/ai-ceo/executionEngine";
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

const COMPETITOR_AUTO_CONFIDENCE_MIN = 67;
const COMPETITOR_AUTO_MAX_PER_CYCLE = 4;

async function runCompetitorRecommendationAutopilot(enabled: boolean) {
  if (!enabled) return { scanned: 0, eligible: 0, executed: 0, failed: 0, results: [] as Array<{ recommendationId: string; status: string; error?: string }> };

  const snapshot = await adminDb
    .collection("ceoRecommendations")
    .where("status", "==", "pending")
    .limit(50)
    .get();

  const candidates = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter((item: any) =>
      typeof item.source === "string" &&
      item.source.startsWith("Competitor Intelligence:")
    );

  const eligible = candidates
    .filter((item: any) => {
      const confidence = Number(item.confidence || 0);
      const risk = String(item.risk || "").trim().toLowerCase();
      const executionType = String(item.executionType || "").trim();
      return (
        confidence > COMPETITOR_AUTO_CONFIDENCE_MIN &&
        (risk === "low" || risk === "medium") &&
        executionType.length > 0
      );
    })
    .slice(0, COMPETITOR_AUTO_MAX_PER_CYCLE);

  const actor = {
    uid: "ai-ceo-autopilot",
    email: "ai-ceo-autopilot@system.local",
  };

  const results: Array<{ recommendationId: string; status: string; error?: string }> = [];
  let executed = 0;
  let failed = 0;

  for (const item of eligible) {
    try {
      const approval = await approveCEORecommendation(item.id, actor);
      const execution = await executeCEORecommendation(item.id, actor);
      if (execution.success) executed += 1; else failed += 1;
      results.push({ recommendationId: item.id, status: execution.success ? "executed" : "failed", error: execution.success ? undefined : execution.result.message });
    } catch (error) {
      failed += 1;
      results.push({ recommendationId: item.id, status: "failed", error: error instanceof Error ? error.message : "Competitor recommendation autopilot failed." });
    }
  }

  return {
    scanned: candidates.length,
    eligible: eligible.length,
    executed,
    failed,
    results,
  };
}

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

    const competitorRecommendationAutopilot = await runCompetitorRecommendationAutopilot(config.auto_execute_low_risk);

    const fingerprint = createAutopilotSnapshotFingerprint(snapshot);

    if (config.skip_unchanged && config.last_snapshot_fingerprint === fingerprint) {
      await completeAutopilotRun(run.id, {
        status: "skipped",
        fingerprint,
        skippedReason: "snapshot_unchanged",
        aiCallUsed: false,
        result: { snapshotGeneratedAt: snapshot.generatedAt, competitorRecommendationAutopilot },
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
        result: { snapshotGeneratedAt: snapshot.generatedAt, competitorRecommendationAutopilot },
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
        competitorRecommendationAutopilot,
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
      competitorRecommendationAutopilot,
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