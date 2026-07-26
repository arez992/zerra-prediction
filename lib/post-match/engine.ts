import "server-only";

import { evaluatePostMatchGeneration } from "@/lib/post-match/guard";
import { generatePostMatchNewsroomReport } from "@/lib/post-match/newsroomWriter";
import { getPostMatchReport, upsertPostMatchReport } from "@/lib/post-match/repository";
import { invalidatePostMatchReportCache } from "@/lib/post-match/cache";
import type { PostMatchReport } from "@/lib/post-match/types";

export type PostMatchEngineResult = {
  generated: boolean;
  reason: "missing-report" | "source-changed" | "up-to-date";
  report: PostMatchReport;
};

function getDataQuality(statistics: unknown[], events: unknown[]): string {
  if (statistics.length > 0 && events.length > 0) return "high";
  if (statistics.length > 0 || events.length > 0) return "medium";
  return "limited";
}

export async function runPostMatchReportEngine(input: {
  fixtureId: string;
  slug: string;
  locale?: string;
}): Promise<PostMatchEngineResult> {
  const locale = input.locale?.trim() || "en";
  const slug = input.slug.trim();

  if (!slug) {
    throw new Error("Post-match report slug is required.");
  }

  const decision = await evaluatePostMatchGeneration(input.fixtureId, locale);

  if (!decision.shouldGenerate) {
    const existing = await getPostMatchReport(input.fixtureId, locale);
    if (!existing) {
      throw new Error("Post-match report guard returned up-to-date but no report exists.");
    }

    return {
      generated: false,
      reason: "up-to-date",
      report: existing,
    };
  }

  const generated = await generatePostMatchNewsroomReport(decision.snapshot);
  const now = new Date().toISOString();

  const report = await upsertPostMatchReport({
    fixtureId: decision.snapshot.fixtureId,
    locale,
    slug,
    sourceFingerprint: decision.snapshot.sourceFingerprint,
    fixtureStatus: decision.snapshot.status,
    homeScore: decision.snapshot.homeScore,
    awayScore: decision.snapshot.awayScore,
    headline: generated.report.headline,
    summary: generated.report.summary,
    matchReport: generated.report.matchReport,
    postMatchAnalysis: generated.report.postMatchAnalysis,
    facts: decision.snapshot.facts,
    statistics: decision.snapshot.statistics,
    events: decision.snapshot.events,
    dataQuality: getDataQuality(decision.snapshot.statistics, decision.snapshot.events),
    model: generated.model,
    status: "published",
    generatedAt: now,
    publishedAt: now,
  });

  await invalidatePostMatchReportCache(input.fixtureId, locale);

  return {
    generated: true,
    reason: decision.reason,
    report,
  };
}