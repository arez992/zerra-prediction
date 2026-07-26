import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getZerraDayWindow } from "@/lib/zerra-time";

export type AutopilotStatus = "running" | "paused" | "stopped";

export async function getAutopilotConfig() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_ceo_autopilot_config")
    .select("*")
    .eq("id", "main")
    .single();

  if (error) throw error;
  return data;
}

export async function setAutopilotStatus(
  status: AutopilotStatus,
  actor: string
) {
  const supabase = getSupabaseAdmin();
  const patch: Database["public"]["Tables"]["ai_ceo_autopilot_config"]["Update"] = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "running") {
    patch.kill_switch = false;
    patch.started_at = new Date().toISOString();
    patch.started_by = actor;
  }

  const { data, error } = await supabase
    .from("ai_ceo_autopilot_config")
    .update(patch)
    .eq("id", "main")
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function activateKillSwitch(actor: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_ceo_autopilot_config")
    .update({
      status: "stopped",
      kill_switch: true,
      started_by: actor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "main")
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createAutopilotRun(triggerSource: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_ceo_autopilot_runs")
    .insert({
      trigger_source: triggerSource,
      status: "running",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function completeAutopilotRun(
  id: string,
  input: {
    status: string;
    fingerprint?: string | null;
    skippedReason?: string | null;
    aiSource?: string | null;
    aiCallUsed?: boolean;
    decisionId?: string | null;
    autoApproved?: boolean;
    autoExecuted?: boolean;
    result?: Json;
    error?: string | null;
  }
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("ai_ceo_autopilot_runs")
    .update({
      status: input.status,
      snapshot_fingerprint: input.fingerprint ?? null,
      skipped_reason: input.skippedReason ?? null,
      ai_source: input.aiSource ?? null,
      ai_call_used: input.aiCallUsed ?? false,
      decision_id: input.decisionId ?? null,
      auto_approved: input.autoApproved ?? false,
      auto_executed: input.autoExecuted ?? false,
      result: input.result ?? {},
      error: input.error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function getTodayAutopilotUsage() {
  const supabase = getSupabaseAdmin();
  const { start } = getZerraDayWindow();
  const startIso = start.toISOString();

  const { data, error } = await supabase
    .from("ai_ceo_autopilot_runs")
    .select("ai_call_used,status,started_at")
    .gte("started_at", startIso);

  if (error) throw error;

  return {
    cycles: data.length,
    aiCalls: data.filter((item) => item.ai_call_used).length,
  };
}

export async function updateAutopilotRuntimeState(input: {
  fingerprint?: string | null;
  aiCallUsed?: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const patch: Database["public"]["Tables"]["ai_ceo_autopilot_config"]["Update"] = {
    last_cycle_at: now,
    updated_at: now,
  };

  if (input.fingerprint !== undefined) {
    patch.last_snapshot_fingerprint = input.fingerprint;
  }

  if (input.aiCallUsed === true) {
    patch.last_ai_call_at = now;
  }

  const { error } = await supabase
    .from("ai_ceo_autopilot_config")
    .update(patch)
    .eq("id", "main");

  if (error) throw error;
}

export async function claimAutopilotLease(
  owner: string,
  leaseSeconds = 600
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "claim_ai_ceo_autopilot_lease",
    {
      p_owner: owner,
      p_lease_seconds: leaseSeconds,
    }
  );

  if (error) throw error;
  return data === true;
}

export async function releaseAutopilotLease(owner: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "release_ai_ceo_autopilot_lease",
    { p_owner: owner }
  );

  if (error) throw error;
  return data === true;
}