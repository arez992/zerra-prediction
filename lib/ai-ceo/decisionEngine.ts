import type { AICEODataSnapshot } from "@/lib/ai-ceo/dataCollector";
import type { CEOPriority } from "@/types/ceo";

export type CEODecision = {
  title: string;
  description: string;
  category: string;
  country?: string | null;
  priority: CEOPriority;
  confidence: number;
  expectedImpact: string;
  source: string;
  risk: "low" | "medium" | "high";
  executionType?: string | null;
  executionPayload?: Record<string, unknown>;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function confidenceFromSignals(...signals: number[]) {
  if (signals.length === 0) return 50;

  const average =
    signals.reduce((total, value) => total + value, 0) /
    signals.length;

  return Number(clamp(average).toFixed(1));
}

function getRisk(
  priority: CEOPriority,
  confidence: number
): "low" | "medium" | "high" {
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

export function generateCEODecisions(
  snapshot: AICEODataSnapshot
): CEODecision[] {
  const decisions: CEODecision[] = [];

  const {
    internal,
    googleAnalytics,
    searchConsole,
  } = snapshot;

  const failedPaymentRate =
    internal.totalPayments === 0
      ? 0
      : (internal.failedPayments / internal.totalPayments) *
        100;

  /*
   * Payment health
   */
  if (
    internal.failedPayments >= 3 ||
    failedPaymentRate >= 15
  ) {
    const priority: CEOPriority =
      failedPaymentRate >= 25 ? "critical" : "high";

    const confidence = confidenceFromSignals(
      Math.min(100, internal.failedPayments * 20),
      Math.min(100, failedPaymentRate * 4)
    );

    decisions.push({
      title: "Investigate Failed Payments",
      description:
        "Payment failures are high enough to affect revenue and VIP conversion. Review NOWPayments statuses, expired invoices, webhook delivery, and checkout friction.",
      category: "Payments",
      priority,
      confidence,
      expectedImpact:
        "Improve payment success and recover lost revenue",
      source: "Internal Data",
      risk: getRisk(priority, confidence),
      executionType: "payment-audit",
      executionPayload: {
        totalPayments: internal.totalPayments,
        failedPayments: internal.failedPayments,
        failedPaymentRate: Number(
          failedPaymentRate.toFixed(2)
        ),
      },
    });
  }

  /*
   * Revenue and VIP conversion
   */
  if (
    internal.totalUsers >= 5 &&
    internal.completedPayments === 0
  ) {
    const confidence = confidenceFromSignals(
      Math.min(100, internal.totalUsers * 8),
      Math.min(100, internal.vipConversionRate * 2)
    );

    decisions.push({
      title: "Improve VIP Monetization",
      description:
        "The platform has registered users but no completed payments. Improve pricing clarity, checkout trust, VIP benefits, and conversion messaging.",
      category: "Revenue",
      priority: "high",
      confidence,
      expectedImpact:
        "Generate the first completed VIP payments",
      source: "Internal Data",
      risk: getRisk("high", confidence),
      executionType: "vip-conversion-review",
      executionPayload: {
        totalUsers: internal.totalUsers,
        vipUsers: internal.vipUsers,
        completedPayments:
          internal.completedPayments,
        vipConversionRate:
          internal.vipConversionRate,
      },
    });
  }

  /*
   * Visitor-to-registration conversion
   */
  if (
    googleAnalytics.connected &&
    googleAnalytics.totalActiveUsers > 0 &&
    internal.totalUsers === 0
  ) {
    const confidence = confidenceFromSignals(
      Math.min(
        100,
        googleAnalytics.totalActiveUsers * 10
      ),
      75
    );

    decisions.push({
      title: "Improve Visitor Registration Conversion",
      description:
        "Google Analytics shows active visitors but no registered users. Review registration visibility, form friction, landing page messaging, and calls to action.",
      category: "Conversion",
      priority: "high",
      confidence,
      expectedImpact:
        "Convert more visitors into registered users",
      source: "Google Analytics + Internal Data",
      risk: getRisk("high", confidence),
      executionType: "registration-funnel-review",
      executionPayload: {
        activeUsers:
          googleAnalytics.totalActiveUsers,
        registeredUsers: internal.totalUsers,
      },
    });
  }

  /*
   * Search CTR opportunity
   */
  if (
    searchConsole.totals.impressions >= 50 &&
    searchConsole.totals.ctr < 2
  ) {
    const confidence = confidenceFromSignals(
      Math.min(
        100,
        searchConsole.totals.impressions / 2
      ),
      Math.min(
        100,
        (2 - searchConsole.totals.ctr) * 30
      )
    );

    decisions.push({
      title: "Improve Google Search CTR",
      description:
        "Search impressions are growing but CTR is weak. Improve page titles, descriptions, structured data, and keyword alignment.",
      category: "SEO",
      priority: "high",
      confidence,
      expectedImpact:
        "Increase organic clicks without requiring more impressions",
      source: "Google Search Console",
      risk: getRisk("high", confidence),
      executionType: "seo-metadata-optimization",
      executionPayload: {
        impressions:
          searchConsole.totals.impressions,
        ctr: searchConsole.totals.ctr,
        averagePosition:
          searchConsole.totals.averagePosition,
      },
    });
  }

  /*
   * New country opportunities from GA4
   */
  for (const country of googleAnalytics.countries.slice(
    0,
    5
  )) {
    const matchingInternalCountry =
      internal.countries.find(
        (item) =>
          item.country.toLowerCase() ===
          country.country.toLowerCase()
      );

    const registeredUsers =
      matchingInternalCountry?.users || 0;

    if (
      country.activeUsers >= 10 &&
      registeredUsers === 0
    ) {
      const confidence = confidenceFromSignals(
        Math.min(100, country.activeUsers * 6),
        80
      );

      decisions.push({
        title: `Create Local Landing Page for ${country.country}`,
        description:
          `${country.country} is generating active traffic but has no registered users yet. Create localized copy, local trust signals, and a country-specific landing page.`,
        category: "Market Expansion",
        country: country.country,
        priority: "medium",
        confidence,
        expectedImpact:
          "Increase registration and VIP conversion in a new market",
        source: "Google Analytics + Internal Data",
        risk: getRisk("medium", confidence),
        executionType:
          "create-country-landing-page",
        executionPayload: {
          country: country.country,
          activeUsers: country.activeUsers,
          registeredUsers,
        },
      });
    }
  }

  /*
   * Expand validated search queries
   */
  if (
    searchConsole.queries.length > 0 &&
    searchConsole.totals.clicks > 0
  ) {
    const topQuery = searchConsole.queries[0];

    const confidence = confidenceFromSignals(
      Math.min(100, topQuery.impressions / 2),
      Math.min(100, topQuery.clicks * 10),
      Math.min(100, topQuery.ctr * 10)
    );

    decisions.push({
      title: `Expand SEO Content for "${topQuery.query}"`,
      description:
        "This query is already producing Google visibility. Publish supporting pages, internal links, and deeper prediction content around it.",
      category: "SEO",
      priority: "medium",
      confidence,
      expectedImpact:
        "Grow organic traffic around an already validated search query",
      source: "Google Search Console",
      risk: getRisk("medium", confidence),
      executionType:
        "create-seo-content-cluster",
      executionPayload: {
        query: topQuery.query,
        clicks: topQuery.clicks,
        impressions: topQuery.impressions,
        ctr: topQuery.ctr,
        position: topQuery.position,
        pageCount: 10,
      },
    });
  }

  /*
   * Low overall traffic
   */
  if (
    googleAnalytics.connected &&
    googleAnalytics.totalActiveUsers < 5 &&
    internal.totalUsers < 10
  ) {
    const confidence = confidenceFromSignals(
      70,
      Math.max(
        0,
        100 - googleAnalytics.totalActiveUsers * 10
      )
    );

    decisions.push({
      title: "Increase Early Traffic Acquisition",
      description:
        "Current traffic and registered user volume are still low. Focus on SEO foundations, targeted country testing, and content distribution before scaling paid advertising.",
      category: "Growth",
      priority: "medium",
      confidence,
      expectedImpact:
        "Build a larger traffic and registration baseline",
      source:
        "Google Analytics + Internal Data",
      risk: getRisk("medium", confidence),
      executionType:
        "growth-foundation-plan",
      executionPayload: {
        activeUsers:
          googleAnalytics.totalActiveUsers,
        registeredUsers: internal.totalUsers,
      },
    });
  }

  /*
   * Strong VIP conversion with low user volume
   */
  if (
    internal.totalUsers > 0 &&
    internal.vipConversionRate >= 20 &&
    internal.totalUsers < 20
  ) {
    const confidence = confidenceFromSignals(
      Math.min(
        100,
        internal.vipConversionRate * 2
      ),
      80
    );

    decisions.push({
      title: "Scale User Acquisition Carefully",
      description:
        "VIP conversion is strong, but total user volume is still low. Increase traffic gradually while monitoring payment success and retention.",
      category: "Growth",
      priority: "medium",
      confidence,
      expectedImpact:
        "Increase VIP users while protecting conversion quality",
      source: "Internal Data",
      risk: getRisk("medium", confidence),
      executionType:
        "controlled-user-acquisition",
      executionPayload: {
        totalUsers: internal.totalUsers,
        vipUsers: internal.vipUsers,
        vipConversionRate:
          internal.vipConversionRate,
      },
    });
  }

  const priorityWeight: Record<
    CEOPriority,
    number
  > = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return decisions
    .sort((first, second) => {
      const priorityDifference =
        priorityWeight[second.priority] -
        priorityWeight[first.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return second.confidence - first.confidence;
    })
    .slice(0, 20);
}