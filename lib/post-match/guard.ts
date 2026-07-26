import "server-only";

import { collectVerifiedPostMatchSnapshot } from "@/lib/post-match/collector";
import { getPostMatchReport } from "@/lib/post-match/repository";

export type PostMatchGenerationDecision = {
  shouldGenerate: boolean;
  reason: "missing-report" | "source-changed" | "up-to-date";
  existingReportId: string | null;
  snapshot: Awaited<ReturnType<typeof collectVerifiedPostMatchSnapshot>>;
};

export async function evaluatePostMatchGeneration(
  fixtureId: string,
  locale = "en"
): Promise<PostMatchGenerationDecision> {
  const snapshot = await collectVerifiedPostMatchSnapshot(fixtureId);
  const existing = await getPostMatchReport(fixtureId, locale);

  if (!existing) {
    return {
      shouldGenerate: true,
      reason: "missing-report",
      existingReportId: null,
      snapshot,
    };
  }

  if (existing.sourceFingerprint !== snapshot.sourceFingerprint) {
    return {
      shouldGenerate: true,
      reason: "source-changed",
      existingReportId: existing.id,
      snapshot,
    };
  }

  return {
    shouldGenerate: false,
    reason: "up-to-date",
    existingReportId: existing.id,
    snapshot,
  };
}