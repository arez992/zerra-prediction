import "server-only";

import {
  collectAICEOData,
} from "@/lib/ai-ceo/dataCollector";

import {
  getDailyUsers,
  getDevices,
  getTrafficSources,
} from "@/lib/google/analytics";

import type {
  ExecutionHandler,
} from "../types";

type MarketingPriority =
  | "high"
  | "medium"
  | "low";

type MarketingArea =
  | "traffic-source"
  | "device"
  | "country"
  | "conversion"
  | "retention"
  | "measurement";

type MarketingAction = {
  priority: MarketingPriority;
  area: MarketingArea;
  title: string;
  reason: string;
  action: string;
  expectedKPI: string;
  target?: string | null;
};

type MetricRow = {
  label: string;
  value: number;
};

type DailyUserRow = {
  date: string;
  activeUsers: number;
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

function readMetricRows(
  report: unknown
): MetricRow[] {
  if (
    !report ||
    typeof report !== "object"
  ) {
    return [];
  }

  const rows =
    (
      report as {
        rows?: Array<{
          dimensionValues?: Array<{
            value?: string | null;
          }>;
          metricValues?: Array<{
            value?: string | null;
          }>;
        }>;
      }
    ).rows || [];

  return rows
    .map((row) => ({
      label:
        row.dimensionValues?.[0]?.value ||
        "Unknown",
      value:
        Number(
          row.metricValues?.[0]?.value || 0
        ),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.value)
    )
    .sort(
      (left, right) =>
        right.value - left.value
    );
}

function readDailyUsers(
  report: unknown
): DailyUserRow[] {
  return readMetricRows(report)
    .map((row) => ({
      date: row.label,
      activeUsers: row.value,
    }))
    .sort(
      (left, right) =>
        left.date.localeCompare(
          right.date
        )
    );
}

function calculateTrend(
  dailyUsers: DailyUserRow[]
): number {
  if (
    dailyUsers.length < 4
  ) {
    return 0;
  }

  const midpoint =
    Math.floor(
      dailyUsers.length / 2
    );

  const previous =
    dailyUsers.slice(
      0,
      midpoint
    );

  const recent =
    dailyUsers.slice(
      midpoint
    );

  const previousAverage =
    previous.length === 0
      ? 0
      : previous.reduce(
          (total, item) =>
            total +
            item.activeUsers,
          0
        ) /
        previous.length;

  const recentAverage =
    recent.length === 0
      ? 0
      : recent.reduce(
          (total, item) =>
            total +
            item.activeUsers,
          0
        ) /
        recent.length;

  if (
    previousAverage <= 0
  ) {
    return recentAverage > 0
      ? 100
      : 0;
  }

  return round(
    (
      (
        recentAverage -
        previousAverage
      ) /
      previousAverage
    ) *
      100
  );
}

function createMarketingActions(input: {
  totalActiveUsers: number;
  totalUsers: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  trafficSources: MetricRow[];
  devices: MetricRow[];
  countries: Array<{
    country: string;
    activeUsers: number;
  }>;
  userTrend: number;
}): MarketingAction[] {
  const actions:
    MarketingAction[] = [];

  const topSource =
    input.trafficSources[0];

  const topDevice =
    input.devices[0];

  const topCountry =
    input.countries[0];

  if (
    input.totalActiveUsers < 100
  ) {
    actions.push({
      priority: "high",
      area: "traffic-source",
      title:
        "Increase qualified traffic carefully",
      reason:
        `Only ${input.totalActiveUsers} active user(s) were verified in the current Analytics window.`,
      action:
        "Run small, trackable distribution experiments around the strongest existing source and avoid broad paid scaling.",
      expectedKPI:
        "Increase qualified active users while keeping acquisition risk low.",
      target:
        topSource?.label || null,
    });
  }

  if (
    topSource &&
    input.trafficSources.length > 1
  ) {
    const totalSessions =
      input.trafficSources.reduce(
        (total, source) =>
          total + source.value,
        0
      );

    const topShare =
      totalSessions <= 0
        ? 0
        : round(
            (
              topSource.value /
              totalSessions
            ) *
              100
          );

    if (topShare >= 70) {
      actions.push({
        priority: "medium",
        area: "traffic-source",
        title:
          "Reduce overdependence on one traffic source",
        reason:
          `${topSource.label} contributes ${topShare}% of tracked sessions.`,
        action:
          "Test one additional low-cost organic or partner channel with separate campaign tracking.",
        expectedKPI:
          "Improve traffic-source resilience without increasing uncontrolled spend.",
        target:
          topSource.label,
      });
    }
  }

  if (
    input.vipConversionRate < 3 &&
    input.totalUsers > 0
  ) {
    actions.push({
      priority: "high",
      area: "conversion",
      title:
        "Improve VIP conversion messaging",
      reason:
        `VIP conversion is ${round(
          input.vipConversionRate
        )}% across ${input.totalUsers} registered user(s).`,
      action:
        "Test clearer VIP value communication, CTA placement, and onboarding messaging before changing price.",
      expectedKPI:
        "Increase VIP conversion without reducing trust.",
    });
  }

  if (
    input.paymentSuccessRate < 80
  ) {
    actions.push({
      priority: "high",
      area: "conversion",
      title:
        "Fix payment friction before campaign scaling",
      reason:
        `Payment success rate is ${round(
          input.paymentSuccessRate
        )}%.`,
      action:
        "Resolve failed and pending payment friction before directing more campaign traffic to checkout.",
      expectedKPI:
        "Improve completed-payment conversion.",
    });
  }

  if (
    input.userTrend < -10
  ) {
    actions.push({
      priority: "high",
      area: "retention",
      title:
        "Investigate declining user activity",
      reason:
        `Recent active-user trend is ${round(
          input.userTrend
        )}%.`,
      action:
        "Review returning-user behavior, content freshness, notification timing, and funnel drop-off before increasing acquisition.",
      expectedKPI:
        "Stabilize active-user trend and improve retention.",
    });
  }

  if (topDevice) {
    actions.push({
      priority: "medium",
      area: "device",
      title:
        "Prioritize the strongest device experience",
      reason:
        `${topDevice.label} is the leading tracked device category with ${topDevice.value} active user(s).`,
      action:
        "Review landing-page speed, CTA clarity, and checkout usability on the leading device category.",
      expectedKPI:
        "Improve conversion quality on the highest-volume device.",
      target:
        topDevice.label,
    });
  }

  if (topCountry) {
    actions.push({
      priority: "medium",
      area: "country",
      title:
        "Build a measured country campaign hypothesis",
      reason:
        `${topCountry.country} is the leading verified Analytics country with ${topCountry.activeUsers} active user(s).`,
      action:
        "Validate language, content intent, and existing conversion quality before launching any country-specific campaign.",
      expectedKPI:
        "Increase qualified country-level traffic without duplicative or low-quality targeting.",
      target:
        topCountry.country,
    });
  }

  if (
    actions.length === 0
  ) {
    actions.push({
      priority: "low",
      area: "measurement",
      title:
        "Maintain controlled marketing experiments",
      reason:
        "No urgent marketing bottleneck was detected in the current verified data.",
      action:
        "Continue small experiments with explicit UTM tracking and review results before scaling.",
      expectedKPI:
        "Maintain stable acquisition efficiency and measurement quality.",
    });
  }

  return actions.slice(
    0,
    8
  );
}

export const marketingExecutor:
  ExecutionHandler =
  async ({
    recommendationId,
    executionType,
    payload,
  }) => {
    const [
      snapshot,
      trafficSourceReport,
      deviceReport,
      dailyUserReport,
    ] = await Promise.all([
      collectAICEOData(),

      getTrafficSources().catch(
        (error) => {
          console.error(
            "[MARKETING_EXECUTOR_TRAFFIC_SOURCE_ERROR]",
            error
          );

          return null;
        }
      ),

      getDevices().catch(
        (error) => {
          console.error(
            "[MARKETING_EXECUTOR_DEVICE_ERROR]",
            error
          );

          return null;
        }
      ),

      getDailyUsers().catch(
        (error) => {
          console.error(
            "[MARKETING_EXECUTOR_DAILY_USERS_ERROR]",
            error
          );

          return null;
        }
      ),
    ]);

    const trafficSources =
      readMetricRows(
        trafficSourceReport
      );

    const devices =
      readMetricRows(
        deviceReport
      );

    const dailyUsers =
      readDailyUsers(
        dailyUserReport
      );

    const userTrend =
      calculateTrend(
        dailyUsers
      );

    const baseline = {
      generatedAt:
        snapshot.generatedAt,

      analyticsConnected:
        snapshot.googleAnalytics
          .connected,

      totalActiveUsers:
        snapshot.googleAnalytics
          .totalActiveUsers,

      totalUsers:
        snapshot.internal
          .totalUsers,

      vipUsers:
        snapshot.internal
          .vipUsers,

      vipConversionRate:
        snapshot.internal
          .vipConversionRate,

      paymentSuccessRate:
        snapshot.internal
          .paymentSuccessRate,

      totalRevenue:
        snapshot.internal
          .totalRevenue,

      trafficSources,

      devices,

      dailyUsers,

      activeUserTrendPercent:
        userTrend,

      topCountries:
        snapshot.googleAnalytics
          .countries.slice(
            0,
            10
          ),
    };

    const actions =
      createMarketingActions({
        totalActiveUsers:
          baseline.totalActiveUsers,

        totalUsers:
          baseline.totalUsers,

        vipConversionRate:
          baseline.vipConversionRate,

        paymentSuccessRate:
          baseline.paymentSuccessRate,

        trafficSources,

        devices,

        countries:
          baseline.topCountries,

        userTrend,
      });

    return {
      success: true,
      completed: true,

      message:
        `Marketing analysis completed for ${executionType}. ` +
        "A verified acquisition baseline and controlled campaign hypothesis were created. No advertising budget, campaign, audience, pricing, or publishing action was changed automatically.",

      data: {
        recommendationId,
        executionType,
        payload,

        analysisCompleted:
          true,

        planCreated:
          true,

        baseline,

        primaryOpportunity:
          actions[0],

        actions,

        guardrails: {
          humanApprovalRequired:
            true,

          advertisingBudgetChanged:
            false,

          campaignCreated:
            false,

          campaignPaused:
            false,

          audienceChanged:
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