import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PostMatchReport, PostMatchReportUpsertInput } from "@/lib/post-match/types";
import type { Json } from "@/lib/supabase/database.types";

type ReportRow = {
  id: string;
  fixture_id: number | string;
  locale: string;
  slug: string;
  source_fingerprint: string;
  fixture_status: string;
  home_score: number | null;
  away_score: number | null;
  headline: string;
  summary: string;
  match_report: string;
  post_match_analysis: string;
  facts: Json;
  statistics: Json;
  events: Json;
  data_quality: string;
  model: string | null;
  status: PostMatchReport["status"];
  generated_at: string | null;
  updated_at: string | null;
  published_at: string | null;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

function mapRow(row: ReportRow): PostMatchReport {
  return {
    id: row.id,
    fixtureId: String(row.fixture_id),
    locale: row.locale,
    slug: row.slug,
    sourceFingerprint: row.source_fingerprint,
    fixtureStatus: row.fixture_status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    headline: row.headline,
    summary: row.summary,
    matchReport: row.match_report,
    postMatchAnalysis: row.post_match_analysis,
    facts: row.facts && typeof row.facts === "object" && !Array.isArray(row.facts) ? (row.facts as Record<string, unknown>) : {},
    statistics: Array.isArray(row.statistics) ? row.statistics : [],
    events: Array.isArray(row.events) ? row.events : [],
    dataQuality: row.data_quality,
    model: row.model,
    status: row.status,
    generatedAt: row.generated_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export async function getPostMatchReport(fixtureId: string, locale = "en"): Promise<PostMatchReport | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("seo_match_reports")
    .select("*")
    .eq("fixture_id", Number(fixtureId))
    .eq("locale", locale)
    .maybeSingle();

  if (error) throw new Error(`Supabase report read failed: ${error.message}`);
  return data ? mapRow(data as ReportRow) : null;
}

export async function upsertPostMatchReport(input: PostMatchReportUpsertInput): Promise<PostMatchReport> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("seo_match_reports")
    .upsert({
      fixture_id: Number(input.fixtureId),
      locale: input.locale,
      slug: input.slug,
      source_fingerprint: input.sourceFingerprint,
      fixture_status: input.fixtureStatus,
      home_score: input.homeScore,
      away_score: input.awayScore,
      headline: input.headline,
      summary: input.summary,
      match_report: input.matchReport,
      post_match_analysis: input.postMatchAnalysis,
      facts: toJson(input.facts),
      statistics: toJson(input.statistics),
      events: toJson(input.events),
      data_quality: input.dataQuality,
      model: input.model,
      status: input.status,
      generated_at: input.generatedAt,
      published_at: input.publishedAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fixture_id,locale" })
    .select("*")
    .single();

  if (error) throw new Error(`Supabase report write failed: ${error.message}`);
  return mapRow(data as ReportRow);
}