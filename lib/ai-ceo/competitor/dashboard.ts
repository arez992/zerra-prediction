import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCompetitorCEOContext } from "@/lib/ai-ceo/competitor/repository";

export async function getCompetitorIntelligenceDashboard() {
  const supabase = getSupabaseAdmin();

  const [context, gapsResult, observationsResult, runsResult] = await Promise.all([
    getCompetitorCEOContext(),
    supabase.from("competitor_gaps").select("*").order("priority", { ascending: false }).order("detected_at", { ascending: false }).limit(50),
    supabase.from("competitor_observations").select("*").order("last_detected_at", { ascending: false }).limit(50),
    supabase.from("competitor_scan_runs").select("*").order("started_at", { ascending: false }).limit(10),
  ]);

  if (gapsResult.error) throw gapsResult.error;
  if (observationsResult.error) throw observationsResult.error;
  if (runsResult.error) throw runsResult.error;

  return {
    context,
    gaps: gapsResult.data || [],
    observations: observationsResult.data || [],
    runs: runsResult.data || [],
    checkedAt: new Date().toISOString(),
  };
}