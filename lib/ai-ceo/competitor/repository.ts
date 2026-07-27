import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CEO_COMPETITORS } from "@/lib/ai-ceo/competitorEngine";

export type CompetitorCEOContext = {
  connected: boolean;
  trackedCompetitors: number;
  openGaps: number;
  highPriorityGaps: number;
  missingPredictions: number;
  missingSeo: number;
  topCountries: Array<{ country: string; count: number }>;
  topLanguages: Array<{ language: string; count: number }>;
  topCompetitors: Array<{ competitor: string; count: number }>;
  notableGaps: Array<{
    competitor: string;
    gapType: string;
    fixtureId: string | null;
    topic: string | null;
    country: string | null;
    language: string | null;
    priority: number;
    reason: string | null;
  }>;
  lastScanAt: string | null;
};

function rank(values: Array<string | null>, key: string) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const clean = typeof value === "string" ? value.trim() : "";
    if (!clean) continue;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 5);
}

export async function getCompetitorCEOContext(): Promise<CompetitorCEOContext> {
  try {
    const supabase = getSupabaseAdmin();

    const [gapsResult, scanResult] = await Promise.all([
      supabase
        .from("competitor_gaps")
        .select("competitor,gap_type,fixture_id,topic,country,language,priority,reason,status,detected_at")
        .eq("status", "open")
        .order("priority", { ascending: false })
        .order("detected_at", { ascending: false })
        .limit(100),
      supabase
        .from("competitor_scan_runs")
        .select("started_at,status")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (gapsResult.error) throw gapsResult.error;

    const gaps = gapsResult.data || [];

    return {
      connected: true,
      trackedCompetitors: CEO_COMPETITORS.length,
      openGaps: gaps.length,
      highPriorityGaps: gaps.filter((gap) => Number(gap.priority || 0) >= 75).length,
      missingPredictions: gaps.filter((gap) => gap.gap_type === "prediction_missing").length,
      missingSeo: gaps.filter((gap) => gap.gap_type === "seo_missing").length,
      topCountries: rank(gaps.map((gap) => gap.country), "country") as Array<{ country: string; count: number }>,
      topLanguages: rank(gaps.map((gap) => gap.language), "language") as Array<{ language: string; count: number }>,
      topCompetitors: rank(gaps.map((gap) => gap.competitor), "competitor") as Array<{ competitor: string; count: number }>,
      notableGaps: gaps.slice(0, 8).map((gap) => ({
        competitor: gap.competitor,
        gapType: gap.gap_type,
        fixtureId: gap.fixture_id,
        topic: gap.topic,
        country: gap.country,
        language: gap.language,
        priority: Number(gap.priority || 0),
        reason: gap.reason,
      })),
      lastScanAt: scanResult.data?.started_at || null,
    };
  } catch (error) {
    console.error("[COMPETITOR_CEO_CONTEXT_ERROR]", error);
    return {
      connected: false,
      trackedCompetitors: CEO_COMPETITORS.length,
      openGaps: 0,
      highPriorityGaps: 0,
      missingPredictions: 0,
      missingSeo: 0,
      topCountries: [],
      topLanguages: [],
      topCompetitors: [],
      notableGaps: [],
      lastScanAt: null,
    };
  }
}