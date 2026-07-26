import "server-only";

import { getAutopilotConfig, getTodayAutopilotUsage } from "./repository";

export type AutopilotCostDecision = {
  allowed: boolean;
  allowAiCall: boolean;
  reason: string | null;
  usage: { cycles: number; aiCalls: number };
};

export async function evaluateAutopilotCostGuard(): Promise<AutopilotCostDecision> {
  const [config, usage] = await Promise.all([
    getAutopilotConfig(),
    getTodayAutopilotUsage(),
  ]);

  if (config.kill_switch) {
    return { allowed: false, allowAiCall: false, reason: "kill_switch_active", usage };
  }

  if (config.status !== "running") {
    return { allowed: false, allowAiCall: false, reason: `autopilot_${config.status}`, usage };
  }

  if (usage.cycles >= config.max_cycles_per_day) {
    return { allowed: false, allowAiCall: false, reason: "daily_cycle_limit_reached", usage };
  }

  let allowAiCall = usage.aiCalls < config.max_ai_calls_per_day;

  if (allowAiCall && config.last_ai_call_at) {
    const lastAiCallMs = Date.parse(config.last_ai_call_at);
    if (Number.isFinite(lastAiCallMs)) {
      const gapMs = config.min_ai_gap_minutes * 60 * 1000;
      if (Date.now() - lastAiCallMs < gapMs) allowAiCall = false;
    }
  }

  return {
    allowed: true,
    allowAiCall,
    reason: allowAiCall ? null : "ai_call_cost_guard_active",
    usage,
  };
}