import "server-only";

import { load } from "cheerio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { getFixturesByDate } from "@/lib/api-football/service";
import { getZerraToday, getZerraTomorrow } from "@/lib/zerra-time";

type SourceConfig = { competitor: string; url: string; language: string };
type Observation = { competitor: string; url: string; title: string; homeTeam: string | null; awayTeam: string | null; country: string | null; language: string };

const SOURCES: SourceConfig[] = [
  { competitor: "Forebet", url: "https://www.forebet.com/en/sitemap", language: "en" },
  { competitor: "PredictZ", url: "https://www.predictz.com/predictions/", language: "en" },
  { competitor: "BetClan", url: "https://www.betclan.com/sitemap.html", language: "en" },
  { competitor: "WinDrawWin", url: "https://www.windrawwin.com/predictions/", language: "en" },
];

const USER_AGENT = "ZERRA-Competitor-Intelligence/1.0 (+https://zerraprediction.com)";
const MAX_OBSERVATIONS_PER_SOURCE = 40;
const OBSERVATION_CONCURRENCY = 5;

function clean(value: string) { return value.replace(/\s+/g, " ").trim(); }
function normalizeTeam(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(fc|cf|sc|afc|club|fk|ac)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }

function parseMatchTitle(value: string) {
  const title = clean(value);
  const match = title.match(/^(.+?)\s+(?:vs\.?|v|-)\s+(.+?)(?:\s+-\s+Prediction|\s+\|\s+|$)/i);
  if (!match) return null;
  const home = clean(match[1]);
  const away = clean(match[2]);
  return home.length >= 2 && away.length >= 2 ? { home, away } : null;
}

function inferCountry(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const blocked = new Set(["en","predictions","prediction","football","soccer","sitemap","tips"]);
    const candidate = parts.find((part) => /^[a-z-]{3,30}$/i.test(part) && !blocked.has(part.toLowerCase()));
    return candidate ? candidate.replace(/-/g, " ") : null;
  } catch { return null; }
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal, headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally { clearTimeout(timeout); }
}

function discoverObservations(source: SourceConfig, html: string): Observation[] {
  const $ = load(html);
  const seen = new Set<string>();
  const observations: Observation[] = [];
  $("a[href]").each((_, element) => {
    if (observations.length >= MAX_OBSERVATIONS_PER_SOURCE) return false;
    const text = clean($(element).text());
    const href = String($(element).attr("href") || "").trim();
    if (!text || !href) return;
    const teams = parseMatchTitle(text);
    if (!teams) return;
    let url: string;
    try { url = new URL(href, source.url).toString(); if (new URL(url).hostname !== new URL(source.url).hostname) return; } catch { return; }
    const key = `${source.competitor}:${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    observations.push({ competitor: source.competitor, url, title: text.slice(0,300), homeTeam: teams.home, awayTeam: teams.away, country: inferCountry(url), language: source.language });
  });
  return observations;
}

function fixtureMatchesTeams(fixture: any, observation: Observation) {
  const home = normalizeTeam(String(fixture?.teams?.home?.name || ""));
  const away = normalizeTeam(String(fixture?.teams?.away?.name || ""));
  const observedHome = normalizeTeam(observation.homeTeam || "");
  const observedAway = normalizeTeam(observation.awayTeam || "");
  return Boolean(home && away && observedHome && observedAway && ((home === observedHome && away === observedAway) || (home === observedAway && away === observedHome)));
}

async function zerraCoverage(fixtureId: string) {
  const [prediction, seo] = await Promise.all([
    adminDb.collection("predictionHistory").doc(`fixture-${fixtureId}`).get(),
    adminDb.collection("seoPageDrafts").where("fixtureId", "==", fixtureId).limit(1).get(),
  ]);
  return { prediction: prediction.exists, seo: !seo.empty };
}

export async function runCompetitorScanner(source = "cron") {
  const supabase = getSupabaseAdmin();
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await supabase
    .from("competitor_scan_runs")
    .update({
      status: "failed",
      error: "Scanner run exceeded the 15-minute stale-run limit.",
      completed_at: new Date().toISOString(),
    })
    .eq("status", "running")
    .lt("started_at", staleCutoff);
  const runInsert = await supabase.from("competitor_scan_runs").insert({ source, status: "running" }).select("id").single();
  if (runInsert.error) throw runInsert.error;
  const runId = runInsert.data.id;
  let observationsFound = 0; let gapsFound = 0; let competitorsScanned = 0; const errors: string[] = [];
  let resolvedGapCount = 0;
  const sourceStatuses: Array<{ competitor: string; status: "ok" | "blocked" | "failed"; observations: number; message?: string }> = [];
  try {
    const [todayFixtures, tomorrowFixtures] = await Promise.all([getFixturesByDate(getZerraToday()), getFixturesByDate(getZerraTomorrow())]);
    const fixtures = [...todayFixtures, ...tomorrowFixtures];
    let countryBackfilled = 0;
    const fixtureCountryById = new Map<string, string>();
    for (const fixture of fixtures) {
      const fixtureId = fixture?.fixture?.id ? String(fixture.fixture.id) : null;
      const country = fixture?.league?.country ? String(fixture.league.country).trim() : null;
      if (fixtureId && country) fixtureCountryById.set(fixtureId, country);
    }
    const openGapResult = await supabase.from("competitor_gaps").select("id,fixture_id,country").eq("status","open").not("fixture_id","is",null).limit(1000);
    if (!openGapResult.error && openGapResult.data) {
      const countryGroups = new Map<string, string[]>();
      for (const gap of openGapResult.data) {
        const fixtureId = gap.fixture_id ? String(gap.fixture_id) : null;
        const country = fixtureId ? fixtureCountryById.get(fixtureId) : null;
        if (!country || gap.country === country) continue;
        const ids = countryGroups.get(country) || [];
        ids.push(String(gap.id));
        countryGroups.set(country, ids);
      }
      await Promise.all(Array.from(countryGroups.entries()).map(async ([country, ids]) => {
        const result = await supabase.from("competitor_gaps").update({ country }).in("id", ids);
        if (!result.error) countryBackfilled += ids.length; else errors.push(`Country backfill: ${result.error.message}`);
      }));
    }
    for (const sourceConfig of SOURCES) {
      try {
        const html = await fetchHtml(sourceConfig.url);
        const observations = discoverObservations(sourceConfig, html);
        competitorsScanned += 1;
        sourceStatuses.push({ competitor: sourceConfig.competitor, status: "ok", observations: observations.length });
        for (let offset = 0; offset < observations.length; offset += OBSERVATION_CONCURRENCY) {
          const batch = observations.slice(offset, offset + OBSERVATION_CONCURRENCY);
          await Promise.all(batch.map(async (observation) => {
            const fixture = fixtures.find((item) => fixtureMatchesTeams(item, observation));
            const fixtureId = fixture?.fixture?.id ? String(fixture.fixture.id) : null;
            const resolvedCountry = fixture?.league?.country
              ? String(fixture.league.country).trim()
              : observation.country;
            const upsert = await supabase.from("competitor_observations").upsert({ competitor: observation.competitor, url: observation.url, content_type: "prediction", title: observation.title, fixture_id: fixtureId, home_team: observation.homeTeam, away_team: observation.awayTeam, topic: observation.title, country: resolvedCountry, language: observation.language, source: "public-web", last_detected_at: new Date().toISOString(), raw_metadata: { discoveryUrl: sourceConfig.url }, updated_at: new Date().toISOString() }, { onConflict: "competitor,url" }).select("id").single();
            if (upsert.error || !upsert.data) { errors.push(`${observation.competitor}: ${upsert.error?.message || "Observation upsert returned no data."}`); return; }
            observationsFound += 1;
            const observationId = upsert.data.id;
            if (!fixtureId) return;
            const coverage = await zerraCoverage(fixtureId);
            const resolveCandidates: string[] = [];
            if (coverage.prediction) resolveCandidates.push("prediction_missing");
            if (coverage.seo) resolveCandidates.push("seo_missing");
            if (resolveCandidates.length > 0) {
              const resolved = await supabase
                .from("competitor_gaps")
                .update({ status: "resolved", metadata: { resolvedBy: "coverage-check", resolvedAt: new Date().toISOString() } })
                .eq("competitor", observation.competitor)
                .eq("fixture_id", fixtureId)
                .eq("status", "open")
                .in("gap_type", resolveCandidates)
                .select("id");
              if (resolved.error) errors.push(`${observation.competitor}: ${resolved.error.message}`);
              else resolvedGapCount += resolved.data?.length || 0;
            }
            const gaps = [];
            if (!coverage.prediction) gaps.push({ type: "prediction_missing", priority: 85, reason: `${observation.competitor} covers this fixture but ZERRA has no prediction.` });
            if (!coverage.seo) gaps.push({ type: "seo_missing", priority: coverage.prediction ? 80 : 70, reason: `${observation.competitor} covers this fixture but ZERRA has no SEO page.` });
            for (const gap of gaps) {
              const existing = await supabase.from("competitor_gaps").select("id").eq("competitor", observation.competitor).eq("fixture_id", fixtureId).eq("gap_type", gap.type).eq("status","open").limit(1).maybeSingle();
              if (existing.error) { errors.push(`${observation.competitor}: ${existing.error.message}`); continue; } if (existing.data) { await supabase.from("competitor_gaps").update({ observation_id: observationId, topic: observation.title, country: resolvedCountry, language: observation.language, zerra_prediction_exists: coverage.prediction, zerra_seo_exists: coverage.seo, priority: gap.priority, reason: gap.reason, metadata: { sourceUrl: observation.url } }).eq("id", existing.data.id); continue; }
              const inserted = await supabase.from("competitor_gaps").insert({ observation_id: observationId, competitor: observation.competitor, gap_type: gap.type, fixture_id: fixtureId, topic: observation.title, country: resolvedCountry, language: observation.language, zerra_prediction_exists: coverage.prediction, zerra_seo_exists: coverage.seo, priority: gap.priority, status: "open", reason: gap.reason, metadata: { sourceUrl: observation.url } });
              if (!inserted.error) gapsFound += 1;
            }

          }));
        }
      } catch (error) { const message = error instanceof Error ? error.message : "scan failed"; const blocked = /403|forbidden|just a moment/i.test(message); sourceStatuses.push({ competitor: sourceConfig.competitor, status: blocked ? "blocked" : "failed", observations: 0, message }); errors.push(`${sourceConfig.competitor}: ${message}`); }
    }
    await supabase.from("competitor_scan_runs").update({ status: errors.length ? "partial" : "completed", competitors_scanned: competitorsScanned, observations_found: observationsFound, gaps_found: gapsFound, error: errors.length ? errors.slice(0,10).join(" | ") : null, metadata: { scannerVersion: "4D-4", maxObservationsPerSource: MAX_OBSERVATIONS_PER_SOURCE, concurrency: OBSERVATION_CONCURRENCY, countryBackfilled, resolvedGapCount, sources: SOURCES.map((item) => item.competitor), sourceStatuses }, completed_at: new Date().toISOString() }).eq("id", runId);
    return { success: true, runId, competitorsScanned, observationsFound, gapsFound, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Competitor scanner failed.";
    await supabase.from("competitor_scan_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", runId);
    throw error;
  }
}