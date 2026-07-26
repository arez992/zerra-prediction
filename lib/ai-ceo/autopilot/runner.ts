import "server-only";

import { collectAICEOData } from "@/lib/ai-ceo/dataCollector";
import { evaluateAutopilotCostGuard } from "./costGuard";
import { createAutopilotSnapshotFingerprint } from "./fingerprint";
import {
  completeAutopilotRun,
  createAutopilotRun,
  getAutopilotConfig,
  updateAutopilotRuntimeState,
} from "./repository";

export async function runAICEOAutopilotCycle(
  triggerSource: "cron" | "manual" = "cron"
) {
  const guard = await evaluateAutopilotCostGuard();

  if (!guard.allowed) {
    return {
      success: true,
      skipped: true,
      reason: guard.reason,
      usage: guard.usage,
    };
  }

  const run = await createAutopilotRun(triggerSource);

  try {
    const [config, snapshot] = await Promise.all([
      getAutopilotConfig(),
      collectAICEOData(),
    ]);

    const fingerprint =
      createAutopilotSnapshotFingerprint(snapshot);

    if (
      config.skip_unchanged &&
      config.last_snapshot_fingerprint === fingerprint
    ) {
      await completeAutopilotRun(run.id, {
        status: "skipped",
        fingerprint,
        skippedReason: "snapshot_unchanged",
        aiCallUsed: false,
        result: {
          snapshotGeneratedAt: snapshot.generatedAt,
        },
      });

      await updateAutopilotRuntimeState({
        fingerprint,
        aiCallUsed: false,
      });

      return {
        success: true,
        skipped: true,
        reason: "snapshot_unchanged",
        fingerprint,
      };
    }

    await completeAutopilotRun(run.id, {
      status: "ready",
      fingerprint,
      skippedReason: guard.allowAiCall
        ? null
        : "ai_call_cost_guard_active",
      aiCallUsed: false,
      result: {
        snapshotGeneratedAt: snapshot.generatedAt,
        aiCallAllowed: guard.allowAiCall,
      },
    });

    await updateAutopilotRuntimeState({
      fingerprint,
      aiCallUsed: false,
    });

    return {
      success: true,
      skipped: false,
      readyForDecision: true,
      aiCallAllowed: guard.allowAiCall,
      fingerprint,
      snapshotGeneratedAt: snapshot.generatedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Autopilot cycle failed.";

    await completeAutopilotRun(run.id, {
      status: "failed",
      error: message,
      aiCallUsed: false,
    });

    throw error;
  }
}