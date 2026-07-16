import "server-only";

import {
  collectAICEOData,
} from "@/lib/ai-ceo/dataCollector";

import type {
  ExecutionHandler,
} from "../types";

type GrowthPriority =
  | "high"
  | "medium"
  | "low";

type GrowthAction = {
  priority: GrowthPriority;
  area:
    | "growth"
    | "traffic"
    | "registration"
    | "vip-conversion"
    | "seo"
    | "payments";
  title: string;
  reason: string;
  action: string;
  expectedKPI: string;
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

function createGrowthActions(input: {
  activeUsers: number;
  totalUsers: number;
  vipUsers: number;
  vipConversionRate: number;
  organicClicks: number;
  searchImpressions: number;
  searchCtr: number;
  averagePosition: number;
  paymentSuccessRate: number;
}): GrowthAction[] {
  const actions: GrowthAction[] = [];

  if (
    input.activeUsers < 100
  ) {
    actions.push({
      priority: "high",
      area: "traffic",
      title:
        "Strengthen verified traffic acquisition",
      reason:
        "Active user volume is still low, so paid scaling would create unnecessary risk.",
      action:
        "Prioritize SEO foundations, country-level content testing, and measurable distribution experiments before increasing advertising spend.",
      expectedKPI:
        "Increase verified active users without increasing paid acquisition cost.",
    });
  }

  if (
    input.searchImpressions > 0 &&
    input.searchCtr < 2
  ) {
    actions.push({
      priority: "high",
      area: "seo",
      title:
        "Improve organic search click-through rate",
      reason:
        `Search CTR is ${round(
          input.searchCtr
        )}%, which indicates that existing impressions are not converting into enough visits.`,
      action:
        "Review page titles and meta descriptions for high-impression pages while preserving human approval.",
      expectedKPI:
        "Raise organic CTR while maintaining ranking quality.",
    });
  }

  if (
    input.averagePosition > 15
  ) {
    actions.push({
      priority: "medium",
      area: "seo",
      title:
        "Improve search visibility before expansion",
      reason:
        `Average Search Console position is ${round(
          input.averagePosition
        )}.`,
      action:
        "Focus on internal linking, content quality, and pages already close to page one.",
      expectedKPI:
        "Improve average ranking position for validated priority queries.",
    });
  }

  if (
    input.totalUsers > 0 &&
    input.vipConversionRate < 3
  ) {
    actions.push({
      priority: "high",
      area: "vip-conversion",
      title:
        "Review the VIP conversion funnel",
      reason:
        `VIP conversion is ${round(
          input.vipConversionRate
        )}% across ${input.totalUsers} registered user(s).`,
      action:
        "Review VIP value communication, CTA placement, onboarding friction, and offer clarity before changing price.",
      expectedKPI:
        "Increase verified VIP conversion without reducing trust.",
    });
  }

  if (
    input.paymentSuccessRate < 80
  ) {
    actions.push({
      priority: "high",
      area: "payments",
      title:
        "Resolve payment friction before growth scaling",
      reason:
        `Payment success rate is ${round(
          input.paymentSuccessRate
        )}%.`,
      action:
        "Audit failed and pending payment states before sending more traffic into the purchase funnel.",
      expectedKPI:
        "Improve payment completion rate and reduce lost conversion.",
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "low",
      area: "growth",
      title:
        "Maintain controlled growth experiments",
      reason:
        "No critical growth bottleneck was detected in the current verified snapshot.",
      action:
        "Continue small, measurable experiments and compare results against the stored baseline.",
      expectedKPI:
        "Maintain stable growth efficiency.",
    });
  }

  return actions.slice(0, 6);
}

export const growthExecutor:
  ExecutionHandler =
  async ({
    recommendationId,
    executionType,
    payload,
  }) => {
    const snapshot =
      await collectAICEOData();

    const baseline = {
      generatedAt:
        snapshot.generatedAt,

      activeUsers:
        snapshot.googleAnalytics
          .totalActiveUsers,

      totalUsers:
        snapshot.internal.totalUsers,

      vipUsers:
        snapshot.internal.vipUsers,

      vipConversionRate:
        snapshot.internal
          .vipConversionRate,

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
          .totals.averagePosition,

      paymentSuccessRate:
        snapshot.internal
          .paymentSuccessRate,

      totalRevenue:
        snapshot.internal
          .totalRevenue,
    };

    const actions =
      createGrowthActions(
        baseline
      );

    const primaryAction =
      actions[0];

    return {
      success: true,
      completed: true,

      message:
        `Growth analysis completed for ${executionType}. ` +
        "A verified baseline and controlled action plan were created. No paid campaign, publishing action, or pricing change was executed automatically.",

      data: {
        recommendationId,
        executionType,
        payload,

        analysisCompleted: true,
        planCreated: true,

        baseline,

        primaryBottleneck:
          primaryAction.area,

        primaryRecommendation:
          primaryAction,

        actions,

        guardrails: {
          humanApprovalRequired:
            true,
          paidSpendChanged:
            false,
          pricingChanged:
            false,
          contentPublished:
            false,
          externalActionExecuted:
            false,
        },

        actualImpact: {
          users: 0,
          seo: 0,
          vipConversion: 0,
          revenue: 0,
        },

        requiresFollowUpMeasurement:
          true,

        recommendedMeasurementWindowDays:
          14,
      },
    };
  };
