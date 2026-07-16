import "server-only";

import {
  collectAICEOData,
} from "@/lib/ai-ceo/dataCollector";

import type {
  ExecutionHandler,
} from "../types";

type SEOActionPriority =
  | "high"
  | "medium"
  | "low";

type SEOActionArea =
  | "metadata"
  | "content"
  | "internal-links"
  | "country-pages"
  | "technical-seo"
  | "monitoring";

type SEOAction = {
  priority: SEOActionPriority;
  area: SEOActionArea;
  title: string;
  reason: string;
  action: string;
  expectedKPI: string;
  target?: string | null;
};

function round(
  value: number,
  digits = 2
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(
    value.toFixed(digits)
  );
}

function calculateWeightedAverage(
  values: Array<{
    value: number;
    weight: number;
  }>
): number {
  const validValues =
    values.filter(
      (item) =>
        Number.isFinite(
          item.value
        ) &&
        Number.isFinite(
          item.weight
        ) &&
        item.weight > 0
    );

  if (
    validValues.length === 0
  ) {
    return 0;
  }

  const totalWeight =
    validValues.reduce(
      (total, item) =>
        total + item.weight,
      0
    );

  const weightedTotal =
    validValues.reduce(
      (total, item) =>
        total +
        item.value *
          item.weight,
      0
    );

  return round(
    weightedTotal /
      totalWeight
  );
}

function createSEOActions(input: {
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  pages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  countries: Array<{
    countryCode: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}): SEOAction[] {
  const actions: SEOAction[] = [];

  const highImpressionLowCTRPages =
    input.pages
      .filter(
        (page) =>
          page.impressions >= 20 &&
          page.ctr < 2
      )
      .sort(
        (left, right) =>
          right.impressions -
          left.impressions
      )
      .slice(0, 5);

  for (
    const page of
      highImpressionLowCTRPages
  ) {
    actions.push({
      priority: "high",
      area: "metadata",
      title:
        "Improve page click-through rate",
      reason:
        `${page.page} has ${page.impressions} impression(s) but only ${round(
          page.ctr
        )}% CTR.`,
      action:
        "Review the title and meta description for relevance, clarity, and search intent. Keep human approval required before publishing.",
      expectedKPI:
        "Increase organic CTR without reducing ranking quality.",
      target:
        page.page,
    });
  }

  const nearPageOneQueries =
    input.queries
      .filter(
        (query) =>
          query.impressions >= 10 &&
          query.position > 8 &&
          query.position <= 20
      )
      .sort(
        (left, right) =>
          right.impressions -
          left.impressions
      )
      .slice(0, 5);

  for (
    const query of
      nearPageOneQueries
  ) {
    actions.push({
      priority: "high",
      area: "content",
      title:
        "Strengthen a near-page-one query",
      reason:
        `"${query.query}" is ranking at position ${round(
          query.position
        )} with ${query.impressions} impression(s).`,
      action:
        "Improve the most relevant page with clearer coverage, stronger internal links, and verified helpful content. Do not create duplicate pages.",
      expectedKPI:
        "Move the query closer to page one while preserving content quality.",
      target:
        query.query,
    });
  }

  const internalLinkCandidates =
    input.pages
      .filter(
        (page) =>
          page.impressions >= 10 &&
          page.position > 10 &&
          page.position <= 30
      )
      .sort(
        (left, right) =>
          right.impressions -
          left.impressions
      )
      .slice(0, 5);

  for (
    const page of
      internalLinkCandidates
  ) {
    actions.push({
      priority: "medium",
      area: "internal-links",
      title:
        "Add reviewed internal-link support",
      reason:
        `${page.page} is receiving impressions but remains at position ${round(
          page.position
        )}.`,
      action:
        "Identify contextually relevant published pages that can link to this page with natural anchor text.",
      expectedKPI:
        "Improve crawl discovery and ranking support.",
      target:
        page.page,
    });
  }

  const countryOpportunities =
    input.countries
      .filter(
        (country) =>
          country.impressions >= 20 &&
          country.ctr < 2
      )
      .sort(
        (left, right) =>
          right.impressions -
          left.impressions
      )
      .slice(0, 3);

  for (
    const country of
      countryOpportunities
  ) {
    actions.push({
      priority: "medium",
      area: "country-pages",
      title:
        "Review a country-level SEO opportunity",
      reason:
        `${country.countryCode} has ${country.impressions} impression(s) and ${round(
          country.ctr
        )}% CTR.`,
      action:
        "Validate search intent and existing page coverage before proposing a unique country landing page.",
      expectedKPI:
        "Increase qualified country-level organic traffic without scaled-content duplication.",
      target:
        country.countryCode,
    });
  }

  if (
    input.impressions > 0 &&
    input.ctr < 2 &&
    actions.length === 0
  ) {
    actions.push({
      priority: "high",
      area: "metadata",
      title:
        "Improve site-wide search click-through rate",
      reason:
        `Overall Search Console CTR is ${round(
          input.ctr
        )}% across ${input.impressions} impression(s).`,
      action:
        "Prioritize high-impression pages for title and description review.",
      expectedKPI:
        "Increase organic clicks from existing search visibility.",
    });
  }

  if (
    input.averagePosition > 20
  ) {
    actions.push({
      priority: "medium",
      area: "technical-seo",
      title:
        "Improve ranking foundations",
      reason:
        `Average search position is ${round(
          input.averagePosition
        )}.`,
      action:
        "Review indexability, canonical consistency, internal linking, content quality, and sitemap coverage before expanding content volume.",
      expectedKPI:
        "Improve average ranking position for validated pages and queries.",
    });
  }

  if (
    actions.length === 0
  ) {
    actions.push({
      priority: "low",
      area: "monitoring",
      title:
        "Maintain SEO monitoring",
      reason:
        "No urgent SEO bottleneck was detected in the current verified Search Console snapshot.",
      action:
        "Continue monitoring CTR, ranking position, impressions, and page-level opportunities.",
      expectedKPI:
        "Maintain stable organic visibility and detect new opportunities early.",
    });
  }

  return actions.slice(0, 10);
}

export const seoExecutor:
  ExecutionHandler =
  async ({
    recommendationId,
    executionType,
    payload,
  }) => {
    const snapshot =
      await collectAICEOData();

    const pages =
      snapshot.searchConsole.pages;

    const queries =
      snapshot.searchConsole.queries;

    const countries =
      snapshot.searchConsole
        .countries;

    const weightedPagePosition =
      calculateWeightedAverage(
        pages.map((page) => ({
          value:
            page.position,
          weight:
            Math.max(
              1,
              page.impressions
            ),
        }))
      );

    const baseline = {
      generatedAt:
        snapshot.generatedAt,

      searchConsoleConnected:
        snapshot.searchConsole
          .connected,

      googleAnalyticsConnected:
        snapshot.googleAnalytics
          .connected,

      organicClicks:
        snapshot.searchConsole
          .totals.clicks,

      searchImpressions:
        snapshot.searchConsole
          .totals.impressions,

      searchCtr:
        snapshot.searchConsole
          .totals.ctr,

      averagePosition:
        snapshot.searchConsole
          .totals
          .averagePosition,

      weightedPagePosition,

      activeUsers:
        snapshot.googleAnalytics
          .totalActiveUsers,

      trackedPages:
        pages.length,

      trackedQueries:
        queries.length,

      trackedCountries:
        countries.length,
    };

    const actions =
      createSEOActions({
        clicks:
          baseline.organicClicks,
        impressions:
          baseline.searchImpressions,
        ctr:
          baseline.searchCtr,
        averagePosition:
          baseline.averagePosition,
        pages,
        queries,
        countries,
      });

    const primaryAction =
      actions[0];

    const topPages =
      [...pages]
        .sort(
          (left, right) =>
            right.clicks -
            left.clicks
        )
        .slice(0, 10);

    const topQueries =
      [...queries]
        .sort(
          (left, right) =>
            right.clicks -
            left.clicks
        )
        .slice(0, 10);

    return {
      success: true,
      completed: true,

      message:
        `SEO analysis completed for ${executionType}. ` +
        "A verified Search Console baseline and reviewed optimization plan were created. No metadata, page, sitemap, canonical, or publishing change was executed automatically.",

      data: {
        recommendationId,
        executionType,
        payload,

        analysisCompleted: true,
        planCreated: true,

        baseline,

        primaryOpportunity:
          primaryAction,

        actions,

        topPages,
        topQueries,

        guardrails: {
          humanApprovalRequired:
            true,
          metadataChanged:
            false,
          pagePublished:
            false,
          sitemapChanged:
            false,
          canonicalChanged:
            false,
          duplicatePageCreated:
            false,
          externalActionExecuted:
            false,
        },

        actualImpact: {
          seo: 0,
          users: 0,
          revenue: 0,
        },

        requiresFollowUpMeasurement:
          true,

        recommendedMeasurementWindowDays:
          14,
      },
    };
  };