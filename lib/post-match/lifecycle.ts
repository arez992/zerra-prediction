import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import { runPostMatchReportEngine } from "@/lib/post-match/engine";

const MAX_REPORTS_PER_RUN = 5;
const CANDIDATE_LIMIT = 50;

export type PostMatchLifecycleSummary = {
  scanned: number;
  generated: number;
  upToDate: number;
  notFinished: number;
  failed: number;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function serializeDate(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(converted.getTime()) ? null : converted.toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function runPublishedSeoPostMatchForFixture(
  fixtureId: string
): Promise<PostMatchLifecycleSummary> {
  const summary: PostMatchLifecycleSummary = {
    scanned: 0,
    generated: 0,
    upToDate: 0,
    notFinished: 0,
    failed: 0,
  };

  const normalizedFixtureId = normalizeText(fixtureId);

  if (!normalizedFixtureId) {
    return summary;
  }

  /*
   * Query by fixtureId only so this immediate settlement bridge
   * does not require a new composite Firestore index.
   *
   * Published status is filtered in memory below.
   */
  const snapshot = await adminDb
    .collection("seoPageDrafts")
    .where("fixtureId", "==", normalizedFixtureId)
    .limit(10)
    .get();

  const seen = new Set<string>();

  const candidates = snapshot.docs
    .map((document) => {
      const data = document.data() || {};

      return {
        status: normalizeText(data.status),
        slug: normalizeText(data.slug),
        language: normalizeText(data.language) || "en",
      };
    })
    .filter(
      (item) =>
        item.status === "published" &&
        item.slug
    )
    .filter((item) => {
      const key = `${item.language}:${item.slug}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

  for (const candidate of candidates) {
    summary.scanned += 1;

    try {
      const result = await runPostMatchReportEngine({
        fixtureId: normalizedFixtureId,
        slug: candidate.slug,
        locale: candidate.language,
      });

      if (result.generated) {
        summary.generated += 1;
      } else {
        summary.upToDate += 1;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      if (message.includes("is not finished")) {
        summary.notFinished += 1;
        continue;
      }

      summary.failed += 1;

      console.error(
        "[POST_MATCH_FIXTURE_REFRESH_ERROR]",
        {
          fixtureId: normalizedFixtureId,
          slug: candidate.slug,
          error: message,
        }
      );
    }
  }

  return summary;
}
export async function runPublishedSeoPostMatchLifecycle(): Promise<PostMatchLifecycleSummary> {
  const summary: PostMatchLifecycleSummary = {
    scanned: 0,
    generated: 0,
    upToDate: 0,
    notFinished: 0,
    failed: 0,
  };

  const snapshot = await adminDb
    .collection("seoPageDrafts")
    .where("status", "==", "published")
    .limit(CANDIDATE_LIMIT)
    .get();

  const now = Date.now();
  let processed = 0;

  const candidates = snapshot.docs
    .map((document) => {
      const data = document.data() || {};
      return {
        fixtureId: normalizeText(data.fixtureId),
        fixtureDate: serializeDate(data.fixtureDate),
        slug: normalizeText(data.slug),
        language: normalizeText(data.language) || "en",
      };
    })
    .filter((item) => item.fixtureId && item.slug && item.fixtureDate)
    .filter((item) => {
      const timestamp = Date.parse(item.fixtureDate as string);
      return Number.isFinite(timestamp) && timestamp < now;
    })
    .sort((a, b) => Date.parse(a.fixtureDate as string) - Date.parse(b.fixtureDate as string));

  for (const candidate of candidates) {
    if (processed >= MAX_REPORTS_PER_RUN) break;
    processed += 1;
    summary.scanned += 1;

    try {
      const result = await runPostMatchReportEngine({
        fixtureId: candidate.fixtureId,
        slug: candidate.slug,
        locale: candidate.language,
      });

      if (result.generated) summary.generated += 1;
      else summary.upToDate += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("is not finished")) {
        summary.notFinished += 1;
        continue;
      }

      summary.failed += 1;
      console.error("[POST_MATCH_LIFECYCLE_ITEM_ERROR]", {
        fixtureId: candidate.fixtureId,
        slug: candidate.slug,
        error: message,
      });
    }
  }

  return summary;
}