import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { getPostMatchReport } from "@/lib/post-match/repository";

const REPORT_CACHE_SECONDS = 15 * 60;

export async function getCachedPostMatchReport(fixtureId: string, locale = "en") {
  const key = `post-match-report:${fixtureId}:${locale}`;

  return unstable_cache(
    () => getPostMatchReport(fixtureId, locale),
    ["post-match-report-v2", fixtureId, locale],
    {
      revalidate: REPORT_CACHE_SECONDS,
      tags: [key],
    }
  )();
}

export async function invalidatePostMatchReportCache(fixtureId: string, locale = "en") {
  await revalidateTag(`post-match-report:${fixtureId}:${locale}`, "max");
}