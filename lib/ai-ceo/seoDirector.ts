import { createHash } from "node:crypto";
import {
  getSearchPages,
  getSearchQueries,
} from "@/lib/google/search-console";
import type {
  SEOOpportunity,
  SEODirectorReport,
  SEOPriority,
  SEORisk,
  SearchMetric,
} from "@/types/seo";

type SearchQueryItem = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type SearchPageItem = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createOpportunityId(...values: string[]) {
  return createHash("sha256")
    .update(values.join("|").toLowerCase())
    .digest("hex")
    .slice(0, 20);
}

function normalizeMetric(
  item?: Partial<SearchMetric>
): SearchMetric {
  return {
    clicks: Number(item?.clicks || 0),
    impressions: Number(item?.impressions || 0),
    ctr: Number(item?.ctr || 0),
    position: Number(item?.position || 0),
  };
}

function getRisk(
  priority: SEOPriority,
  confidence: number
): SEORisk {
  if (priority === "critical" && confidence < 75) {
    return "high";
  }

  if (confidence >= 85) {
    return "low";
  }

  if (confidence >= 65) {
    return "medium";
  }

  return "high";
}

function calculateTotals(
  queries: SearchQueryItem[]
) {
  const clicks = queries.reduce(
    (total, item) => total + Number(item.clicks || 0),
    0
  );

  const impressions = queries.reduce(
    (total, item) =>
      total + Number(item.impressions || 0),
    0
  );

  const ctr =
    impressions === 0
      ? 0
      : Number(((clicks / impressions) * 100).toFixed(2));

  const weightedPositions = queries.reduce(
    (total, item) => {
      const impressions =
        Number(item.impressions || 0);

      const position =
        Number(item.position || 0);

      return (
        impressions > 0 &&
        position > 0
      )
        ? total +
            position *
              impressions
        : total;
    },
    0
  );

  const positionWeight = queries.reduce(
    (total, item) => {
      const impressions =
        Number(item.impressions || 0);

      const position =
        Number(item.position || 0);

      return (
        impressions > 0 &&
        position > 0
      )
        ? total +
            impressions
        : total;
    },
    0
  );

  const averagePosition =
    positionWeight === 0
      ? 0
      : Number(
          (weightedPositions / positionWeight).toFixed(2)
        );

  return {
    clicks,
    impressions,
    ctr,
    averagePosition,
  };
}

function buildQueryOpportunities(
  queries: SearchQueryItem[]
): SEOOpportunity[] {
  const opportunities: SEOOpportunity[] = [];

  for (const queryItem of queries) {
    const query = queryItem.query?.trim();

    if (!query) continue;

    const metrics = normalizeMetric(queryItem);

    /*
     * High impressions but weak CTR:
     * improve title, description, and search intent alignment.
     */
    if (
      metrics.impressions >= 25 &&
      metrics.ctr < 2.5 &&
      metrics.position > 0 &&
      metrics.position <= 20
    ) {
      const priority: SEOPriority =
        metrics.impressions >= 250
          ? "high"
          : "medium";

      const confidence = Number(
        clamp(
          60 +
            Math.min(25, metrics.impressions / 20) +
            Math.min(15, (2.5 - metrics.ctr) * 5)
        ).toFixed(1)
      );

      opportunities.push({
        id: createOpportunityId(
          "low-ctr",
          query
        ),
        type: "low-ctr",
        title: `Improve Google CTR for "${query}"`,
        description:
          "This query is receiving Google impressions but the click-through rate is weak. Review the title, meta description, search intent, and visible page value.",
        priority,
        confidence,
        risk: getRisk(priority, confidence),
        expectedImpact:
          "Increase organic clicks without increasing advertising spend",
        query,
        page: null,
        metrics,
        executionType: "seo-metadata-optimization",
        executionPayload: {
          query,
          currentClicks: metrics.clicks,
          currentImpressions: metrics.impressions,
          currentCtr: metrics.ctr,
          currentPosition: metrics.position,
        },
        reasons: [
          "Google impressions have already been recorded",
          "CTR is below the current optimization threshold",
          "The query ranks within a potentially actionable range",
        ],
        source: "Google Search Console",
      });
    }

    /*
     * Queries in positions 8â€“20 can be practical quick wins.
     */
    if (
      metrics.impressions >= 15 &&
      metrics.position >= 8 &&
      metrics.position <= 20
    ) {
      const priority: SEOPriority =
        metrics.position <= 12
          ? "high"
          : "medium";

      const confidence = Number(
        clamp(
          65 +
            Math.min(20, metrics.impressions / 15) +
            Math.max(0, 15 - metrics.position)
        ).toFixed(1)
      );

      opportunities.push({
        id: createOpportunityId(
          "ranking-opportunity",
          query
        ),
        type: "ranking-opportunity",
        title: `Move "${query}" toward Google page one`,
        description:
          "This query is ranking close to the first page. Improve content depth, internal links, headings, supporting evidence, and intent coverage.",
        priority,
        confidence,
        risk: getRisk(priority, confidence),
        expectedImpact:
          "Improve ranking and grow organic impressions and clicks",
        query,
        page: null,
        metrics,
        executionType: "create-seo-content-cluster",
        executionPayload: {
          query,
          currentPosition: metrics.position,
          currentImpressions: metrics.impressions,
          supportingPageCount: 3,
          requireUniqueHelpfulContent: true,
        },
        reasons: [
          "The query already has measurable search visibility",
          "The current position is close to page one",
          "Internal linking and deeper coverage may improve relevance",
        ],
        source: "Google Search Console",
      });
    }
  }

  return opportunities;
}

function buildPageOpportunities(
  pages: SearchPageItem[]
): SEOOpportunity[] {
  const opportunities: SEOOpportunity[] = [];

  for (const pageItem of pages) {
    const page = pageItem.page?.trim();

    if (!page) continue;

    const metrics = normalizeMetric(pageItem);

    if (
      metrics.impressions >= 30 &&
      metrics.ctr < 2 &&
      metrics.position > 0
    ) {
      const priority: SEOPriority =
        metrics.impressions >= 300
          ? "high"
          : "medium";

      const confidence = Number(
        clamp(
          65 +
            Math.min(20, metrics.impressions / 25) +
            Math.min(15, (2 - metrics.ctr) * 6)
        ).toFixed(1)
      );

      opportunities.push({
        id: createOpportunityId(
          "content-refresh",
          page
        ),
        type: "content-refresh",
        title: `Refresh SEO content for ${shortenPage(page)}`,
        description:
          "This page has search visibility but weak engagement from Google results. Refresh outdated sections, strengthen the introduction, improve metadata, and add useful internal links.",
        priority,
        confidence,
        risk: getRisk(priority, confidence),
        expectedImpact:
          "Improve CTR, relevance, and organic traffic",
        query: null,
        page,
        metrics,
        executionType: "seo-content-refresh",
        executionPayload: {
          page,
          currentClicks: metrics.clicks,
          currentImpressions: metrics.impressions,
          currentCtr: metrics.ctr,
          currentPosition: metrics.position,
          preserveCanonical: true,
          requireOriginalAnalysis: true,
        },
        reasons: [
          "The page already appears in Google results",
          "The page has impressions but a weak click-through rate",
          "Refreshing an existing page is safer than creating a duplicate",
        ],
        source: "Google Search Console",
      });
    }
  }

  return opportunities;
}

function removeDuplicateOpportunities(
  opportunities: SEOOpportunity[]
) {
  const unique = new Map<string, SEOOpportunity>();

  for (const opportunity of opportunities) {
    if (!unique.has(opportunity.id)) {
      unique.set(opportunity.id, opportunity);
    }
  }

  return Array.from(unique.values());
}

function sortOpportunities(
  opportunities: SEOOpportunity[]
) {
  const priorityWeights: Record<SEOPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...opportunities].sort((first, second) => {
    const priorityDifference =
      priorityWeights[second.priority] -
      priorityWeights[first.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    if (
      second.metrics.impressions !==
      first.metrics.impressions
    ) {
      return (
        second.metrics.impressions -
        first.metrics.impressions
      );
    }

    return second.confidence - first.confidence;
  });
}

function shortenPage(value: string) {
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value;
  }
}

export async function generateSEODirectorReport(): Promise<SEODirectorReport> {
  const [queries, pages] = await Promise.all([
    getSearchQueries(250).catch((error) => {
      console.error(
        "SEO Director query collection failed:",
        error
      );

      return null;
    }),

    getSearchPages(250).catch((error) => {
      console.error(
        "SEO Director page collection failed:",
        error
      );

      return null;
    }),
  ]);

  const connected =
    queries !== null &&
    pages !== null;

  const normalizedQueries =
    (queries || []) as SearchQueryItem[];

  const normalizedPages =
    (pages || []) as SearchPageItem[];

  const totals = calculateTotals(normalizedQueries);

  const opportunities = sortOpportunities(
    removeDuplicateOpportunities([
      ...buildQueryOpportunities(normalizedQueries),
      ...buildPageOpportunities(normalizedPages),
    ])
  ).slice(0, 50);

  return {
    connected,

    summary: {
      totalQueries: normalizedQueries.length,
      totalPages: normalizedPages.length,
      opportunities: opportunities.length,
      highPriority: opportunities.filter(
        (item) =>
          item.priority === "high" ||
          item.priority === "critical"
      ).length,
      estimatedQuickWins: opportunities.filter(
        (item) =>
          item.type === "low-ctr" ||
          item.type === "ranking-opportunity"
      ).length,
    },

    searchPerformance: totals,

    opportunities,

    guardrails: {
      peopleFirstContent: true,
      preventDuplicatePages: true,
      requireHumanApproval: true,
      preventScaledContentAbuse: true,
    },

    checkedAt: new Date().toISOString(),
  };
}
