import "server-only";

import type { AICEODataSnapshot } from "@/lib/ai-ceo/dataCollector";
import type { CEOMetrics } from "@/lib/ai/ceo/types";

function failedPaymentRate(snapshot: AICEODataSnapshot) {
  if (snapshot.internal.totalPayments <= 0) return 0;
  return Number(((snapshot.internal.failedPayments / snapshot.internal.totalPayments) * 100).toFixed(2));
}

export function convertAutopilotSnapshotToCEOMetrics(snapshot: AICEODataSnapshot): CEOMetrics {
  return {
    generatedAt: snapshot.generatedAt,
    revenue: { total: snapshot.internal.totalRevenue, currency: "USD", trendPercent: null },
    vip: {
      activeMembers: snapshot.internal.vipUsers,
      newMembers: null,
      conversionRate: snapshot.internal.vipConversionRate,
      revenue: snapshot.internal.totalRevenue,
    },
    users: {
      total: snapshot.internal.totalUsers,
      active: snapshot.googleAnalytics.connected ? snapshot.googleAnalytics.totalActiveUsers : null,
      newUsers: null,
    },
    traffic: {
      sessions: snapshot.googleAnalytics.connected ? snapshot.googleAnalytics.totalActiveUsers : null,
      users: snapshot.googleAnalytics.connected ? snapshot.googleAnalytics.totalActiveUsers : null,
      trendPercent: null,
    },
    seo: {
      publishedPages: snapshot.searchConsole.pages.length,
      averageQualityScore: null,
      pagesNeedingReview: null,
      organicClicks: snapshot.searchConsole.totals.clicks,
    },
    predictions: { total: null, published: null, pendingReview: null, checked: null, correct: null, accuracyPercent: null },
    apiHealth: {
      apiFootballAvailable: null,
      openAiAvailable: Boolean(process.env.OPENAI_API_KEY),
      paymentProviderAvailable: snapshot.internal.totalPayments > 0 ? true : null,
      recentErrors: snapshot.internal.failedPayments,
    },
    costs: { total: null, apiFootball: null, openAi: null, infrastructure: null },
    competitors: {
      monitored: snapshot.competitors.trackedCompetitors,
      notableChanges: snapshot.competitors.notableGaps.map((gap) => `${gap.competitor}: ${gap.gapType} priority ${gap.priority}`),
    },
    custom: {
      totalPayments: snapshot.internal.totalPayments,
      failedPayments: snapshot.internal.failedPayments,
      failedPaymentRate: failedPaymentRate(snapshot),
      completedPayments: snapshot.internal.completedPayments,
      paymentSuccessRate: snapshot.internal.paymentSuccessRate,
      googleAnalyticsConnected: snapshot.googleAnalytics.connected,
      totalActiveUsers: snapshot.googleAnalytics.totalActiveUsers,
      registeredUsers: snapshot.internal.totalUsers,
      searchCtr: snapshot.searchConsole.totals.ctr,
      searchAveragePosition: snapshot.searchConsole.totals.averagePosition,
    },
  };
}