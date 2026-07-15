import type {
  CEOActionDecision,
  CEOActionKey,
  CEOActions,
  CEOHealth,
  CEOMetrics,
  CEOPriority,
  CEORisk,
  CEOOpportunity,
} from "./types";

const ACTION_KEYS: CEOActionKey[] = [
  "publishPredictions",
  "publishArticles",
  "promoteVip",
  "pauseMarketing",
  "improveSeo",
  "retrainAi",
  "investigateApi",
];

function action(
  enabled: boolean,
  requiresApproval: boolean,
  reason: string
): CEOActionDecision {
  return {
    enabled,
    requiresApproval,
    reason,
  };
}

function getCustomNumber(
  metrics: CEOMetrics,
  key: string
): number | null {
  const value = metrics.custom?.[key];

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return value;
}

function getPaymentSignals(
  metrics: CEOMetrics
) {
  const failedPayments =
    getCustomNumber(
      metrics,
      "failedPayments"
    ) ?? 0;

  const totalPayments =
    getCustomNumber(
      metrics,
      "totalPayments"
    ) ?? 0;

  const storedRate =
    getCustomNumber(
      metrics,
      "failedPaymentRate"
    );

  const failedPaymentRate =
    storedRate ??
    (
      totalPayments > 0
        ? Number(
            (
              failedPayments /
              totalPayments *
              100
            ).toFixed(2)
          )
        : 0
    );

  const needsInvestigation =
    failedPayments >= 3 ||
    failedPaymentRate >= 15;

  return {
    failedPayments,
    totalPayments,
    failedPaymentRate,
    needsInvestigation,
    critical:
      failedPaymentRate >= 25,
  };
}

export function createDefaultActions(): CEOActions {
  return ACTION_KEYS.reduce(
    (result, key) => {
      result[key] = action(
        false,
        true,
        "No verified evidence supports this action yet."
      );

      return result;
    },
    {} as CEOActions
  );
}

export function calculateRuleBasedHealth(
  metrics: CEOMetrics
): CEOHealth {
  const payments =
    getPaymentSignals(metrics);

  const severeSignals = [
    metrics.apiHealth.apiFootballAvailable === false,
    metrics.apiHealth.openAiAvailable === false,
    (metrics.apiHealth.recentErrors ?? 0) >= 20,
    (metrics.predictions.accuracyPercent ?? 100) < 45,
    payments.critical,
  ].filter(Boolean).length;

  if (severeSignals >= 2) {
    return "Critical";
  }

  const warningSignals = [
    severeSignals === 1,
    (metrics.apiHealth.recentErrors ?? 0) >= 5,
    (metrics.predictions.accuracyPercent ?? 100) < 60,
    (metrics.seo.pagesNeedingReview ?? 0) > 20,
    (metrics.revenue.trendPercent ?? 0) < -10,
    payments.needsInvestigation,
  ].filter(Boolean).length;

  if (warningSignals >= 2) {
    return "Warning";
  }

  const positiveSignals = [
    (metrics.revenue.trendPercent ?? 0) > 10,
    (metrics.vip.conversionRate ?? 0) >= 3,
    (metrics.predictions.accuracyPercent ?? 0) >= 70,
    (metrics.seo.averageQualityScore ?? 0) >= 85,
    (metrics.apiHealth.recentErrors ?? 1) === 0,
    !payments.needsInvestigation,
  ].filter(Boolean).length;

  return positiveSignals >= 4
    ? "Excellent"
    : "Good";
}

export function buildRuleBasedPriorities(
  metrics: CEOMetrics
): CEOPriority[] {
  const priorities: CEOPriority[] = [];
  const payments =
    getPaymentSignals(metrics);

  if (payments.needsInvestigation) {
    priorities.push({
      id: "investigate-failed-payments",
      title: "Investigate Failed Payments",
      reason:
        "Payment failures are high enough to affect revenue and VIP conversion. Review NOWPayments statuses, expired invoices, webhook delivery, and checkout friction.",
      impact: "High",
      urgency: "High",
      requiresApproval: false,
      actionKey: "investigateApi",
    });
  }

  if (
    metrics.apiHealth.apiFootballAvailable === false ||
    (metrics.apiHealth.recentErrors ?? 0) >= 5
  ) {
    priorities.push({
      id: "investigate-api",
      title: "Investigate API health",
      reason:
        "A provider is unavailable or recent API errors are elevated.",
      impact: "High",
      urgency: "High",
      requiresApproval: false,
      actionKey: "investigateApi",
    });
  }

  if (
    metrics.predictions.accuracyPercent !== null &&
    metrics.predictions.accuracyPercent < 60
  ) {
    priorities.push({
      id: "review-model",
      title: "Review prediction model quality",
      reason:
        "Verified prediction accuracy is below the minimum quality threshold.",
      impact: "High",
      urgency: "High",
      requiresApproval: true,
      actionKey: "retrainAi",
    });
  }

  if (
    (metrics.seo.pagesNeedingReview ?? 0) > 0 ||
    (
      metrics.seo.averageQualityScore !== null &&
      metrics.seo.averageQualityScore < 80
    )
  ) {
    priorities.push({
      id: "improve-seo",
      title: "Improve priority SEO pages",
      reason:
        "Some SEO pages need review or the average quality score is below target.",
      impact: "Medium",
      urgency: "Medium",
      requiresApproval: true,
      actionKey: "improveSeo",
    });
  }

  if (
    metrics.vip.conversionRate !== null &&
    metrics.vip.conversionRate < 2
  ) {
    priorities.push({
      id: "improve-vip-conversion",
      title: "Review VIP conversion funnel",
      reason:
        "The verified VIP conversion rate is below the working target.",
      impact: "High",
      urgency: "Medium",
      requiresApproval: true,
      actionKey: "promoteVip",
    });
  }

  if (
    (metrics.predictions.pendingReview ?? 0) > 0
  ) {
    priorities.push({
      id: "review-predictions",
      title: "Complete human review of prediction drafts",
      reason:
        "Prediction drafts are awaiting mandatory human approval.",
      impact: "High",
      urgency: "Medium",
      requiresApproval: true,
      actionKey: "publishPredictions",
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      id: "collect-more-data",
      title: "Collect more verified operating data",
      reason:
        "No urgent operational issue was detected from the available metrics.",
      impact: "Medium",
      urgency: "Low",
      requiresApproval: false,
      actionKey: null,
    });
  }

  return priorities.slice(0, 7);
}

export function buildRuleBasedActions(
  metrics: CEOMetrics
): CEOActions {
  const actions = createDefaultActions();
  const payments =
    getPaymentSignals(metrics);

  const hasPredictionDrafts =
    (metrics.predictions.pendingReview ?? 0) > 0;

  actions.publishPredictions = action(
    hasPredictionDrafts,
    true,
    hasPredictionDrafts
      ? "Draft predictions exist, but publication requires human review."
      : "No reviewed prediction draft is currently available."
  );

  const seoNeedsWork =
    (metrics.seo.pagesNeedingReview ?? 0) > 0;

  actions.publishArticles = action(
    false,
    true,
    seoNeedsWork
      ? "SEO pages require review before publication."
      : "No approved article publication request is available."
  );

  actions.promoteVip = action(
    metrics.vip.conversionRate !== null &&
      metrics.vip.conversionRate < 2,
    true,
    metrics.vip.conversionRate === null
      ? "VIP conversion data is unavailable."
      : "VIP promotion may help if conversion remains below target."
  );

  actions.pauseMarketing = action(
    metrics.revenue.trendPercent !== null &&
      metrics.revenue.trendPercent < -20,
    true,
    metrics.revenue.trendPercent === null
      ? "Revenue trend data is unavailable."
      : "A severe negative revenue trend requires campaign review."
  );

  actions.improveSeo = action(
    seoNeedsWork,
    true,
    seoNeedsWork
      ? "One or more SEO pages need quality improvement."
      : "No verified SEO quality issue is currently detected."
  );

  actions.retrainAi = action(
    metrics.predictions.accuracyPercent !== null &&
      metrics.predictions.accuracyPercent < 60,
    true,
    metrics.predictions.accuracyPercent === null
      ? "Verified historical accuracy is unavailable."
      : "Accuracy is below the working model-quality threshold."
  );

  const apiNeedsInvestigation =
    metrics.apiHealth.apiFootballAvailable === false ||
    metrics.apiHealth.openAiAvailable === false ||
    (metrics.apiHealth.recentErrors ?? 0) >= 5;

  actions.investigateApi = action(
    payments.needsInvestigation ||
      apiNeedsInvestigation,
    false,
    payments.needsInvestigation
      ? `Payment health requires investigation: ${payments.failedPayments} failed payment(s), ${payments.failedPaymentRate}% failure rate.`
      : "Provider availability and recent errors determine this operational check."
  );

  return actions;
}

export function buildRuleBasedRisks(
  metrics: CEOMetrics
): CEORisk[] {
  const risks: CEORisk[] = [];
  const payments =
    getPaymentSignals(metrics);

  if (payments.needsInvestigation) {
    risks.push({
      title: "Payment failures affecting revenue",
      level:
        payments.critical
          ? "Critical"
          : "High",
      reason:
        `${payments.failedPayments} failed payment(s) were detected with a ${payments.failedPaymentRate}% failure rate.`,
      mitigation:
        "Review NOWPayments statuses, expired invoices, webhook delivery, and checkout friction before scaling acquisition.",
    });
  }

  if (metrics.apiHealth.apiFootballAvailable === false) {
    risks.push({
      title: "API-Football unavailable",
      level: "High",
      reason:
        "Live football data cannot currently be fetched.",
      mitigation:
        "Keep generation disabled and retest after the subscription is renewed.",
    });
  }

  if (
    metrics.predictions.accuracyPercent !== null &&
    metrics.predictions.accuracyPercent < 60
  ) {
    risks.push({
      title: "Prediction quality below target",
      level: "High",
      reason:
        "Verified accuracy is below the working quality threshold.",
      mitigation:
        "Pause model promotion and review calibration before scaling.",
    });
  }

  if ((metrics.apiHealth.recentErrors ?? 0) >= 5) {
    risks.push({
      title: "Elevated operational errors",
      level: "Medium",
      reason:
        "Recent API or application errors are above the normal range.",
      mitigation:
        "Review logs, isolate the failing service, and verify recovery.",
    });
  }

  return risks;
}

export function buildRuleBasedOpportunities(
  metrics: CEOMetrics
): CEOOpportunity[] {
  const opportunities: CEOOpportunity[] = [];

  if (
    metrics.seo.averageQualityScore !== null &&
    metrics.seo.averageQualityScore >= 85
  ) {
    opportunities.push({
      title: "Scale high-quality SEO publishing",
      reason:
        "Current SEO quality is strong enough to support measured expansion.",
      expectedImpact: "Medium",
      nextStep:
        "Prioritize approved pages with verified demand and low duplication.",
    });
  }

  if (
    metrics.predictions.accuracyPercent !== null &&
    metrics.predictions.accuracyPercent >= 70
  ) {
    opportunities.push({
      title: "Promote verified model performance",
      reason:
        "Historical prediction accuracy is above the working quality threshold.",
      expectedImpact: "High",
      nextStep:
        "Publish transparent performance summaries without guaranteeing outcomes.",
    });
  }

  if (
    metrics.vip.conversionRate !== null &&
    metrics.vip.conversionRate >= 3
  ) {
    opportunities.push({
      title: "Expand the proven VIP funnel",
      reason:
        "VIP conversion is performing above the working threshold.",
      expectedImpact: "High",
      nextStep:
        "Test careful expansion while preserving subscription quality.",
    });
  }

  return opportunities;
}