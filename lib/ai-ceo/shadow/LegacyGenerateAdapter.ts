import "server-only";

import type {
  AICEODataSnapshot,
} from "@/lib/ai-ceo/dataCollector";
import type {
  CEODecision as LegacyGeneratedDecision,
} from "@/lib/ai-ceo/decisionEngine";
import type {
  CEOActionKey,
  CEOActions,
  CEODecision,
  CEOEngineInput,
  CEOEngineResult,
  CEOMetrics,
  CEOOpportunity,
  CEOPriority,
  CEORisk,
} from "@/lib/ai/ceo/types";
import {
  runCEOThroughZAOS,
} from "@/lib/ai/ceo/zaosAdapter";
import {
  compareCEOShadowResults,
  type ShadowComparisonResult,
} from "@/lib/ai/ceo/shadow/ShadowComparison";
import {
  getCEOShadowConfig,
  isShadowScoreAcceptable,
  shouldRunCEOShadow,
  withCEOShadowTimeout,
  type CEOShadowConfig,
} from "@/lib/ai/ceo/shadow/ShadowConfig";
import {
  mapShadowRunToHistoryRecord,
} from "@/lib/ai/ceo/shadow/storage/ShadowHistory";
import {
  createFirestoreShadowHistoryStore,
  isFirestoreShadowPersistenceEnabled,
} from "@/lib/ai/ceo/shadow/storage/FirestoreShadowHistoryStore";
import type {
  CEOShadowRunResult,
} from "@/lib/ai/ceo/shadow/ShadowRunner";
import type {
  OrchestratorResult,
} from "@/lib/zaos/orchestration/DecisionOrchestrator";

export const AI_CEO_LEGACY_GENERATE_ADAPTER_VERSION =
  "1.0.0";

export type LegacyGenerateShadowMetadata = {
  requestedBy?: string;
  route?: string;
  generatedRecommendationIds?: string[];
  createdRecommendationIds?: string[];
  [key: string]: unknown;
};

export type LegacyGenerateShadowResult = {
  version: string;
  attempted: boolean;
  skipped: boolean;
  persisted: boolean;
  historyRecordId: string | null;
  comparison: ShadowComparisonResult | null;
  zaos: OrchestratorResult | null;
  acceptable: boolean | null;
  score: number | null;
  error: string | null;
  persistenceError: string | null;
};

const ACTION_KEYS: CEOActionKey[] = [
  "publishPredictions",
  "publishArticles",
  "promoteVip",
  "pauseMarketing",
  "improveSeo",
  "retrainAi",
  "investigateApi",
];

function createEmptyActions(): CEOActions {
  return ACTION_KEYS.reduce(
    (result, key) => {
      result[key] = {
        enabled: false,
        requiresApproval: true,
        reason:
          "The production recommendation engine did not request this action.",
      };

      return result;
    },
    {} as CEOActions
  );
}

function mapExecutionTypeToActionKey(
  executionType?: string | null
): CEOActionKey | null {
  switch (executionType) {
    case "create-country-landing-page":
    case "create-seo-content-cluster":
    case "seo-metadata-optimization":
      return "improveSeo";

    case "vip-conversion-review":
    case "controlled-user-acquisition":
      return "promoteVip";

    case "payment-audit":
      return "investigateApi";

    case "growth-foundation-plan":
    case "registration-funnel-review":
      return "publishArticles";

    default:
      return null;
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getCanonicalPriorityId(
  decision: LegacyGeneratedDecision,
  index: number
): string {
  switch (decision.executionType) {
    case "payment-audit":
      return "investigate-failed-payments";

    case "vip-conversion-review":
      return "improve-vip-conversion";

    case "registration-funnel-review":
      return "improve-registration-conversion";

    case "seo-metadata-optimization":
      return "improve-search-ctr";

    case "create-country-landing-page":
      return `create-country-landing-page-${slugify(
        decision.country || "unknown"
      )}`;

    case "create-seo-content-cluster":
      return "expand-seo-content";

    case "growth-foundation-plan":
      return "increase-early-traffic";

    case "controlled-user-acquisition":
      return "scale-user-acquisition";

    default:
      return `legacy-generate-${index + 1}-${slugify(
        decision.title
      )}`;
  }
}

function mapPriority(
  decision: LegacyGeneratedDecision,
  index: number
): CEOPriority {
  return {
    id: getCanonicalPriorityId(
      decision,
      index
    ),
    title: decision.title,
    reason: decision.description,
    impact:
      decision.priority === "critical" ||
      decision.priority === "high"
        ? "High"
        : decision.priority === "medium"
          ? "Medium"
          : "Low",
    urgency:
      decision.priority === "critical" ||
      decision.priority === "high"
        ? "High"
        : decision.priority === "medium"
          ? "Medium"
          : "Low",
    requiresApproval:
      decision.executionType !== "payment-audit",
    actionKey:
      mapExecutionTypeToActionKey(
        decision.executionType
      ),
  };
}

function mapRisks(
  decisions: LegacyGeneratedDecision[]
): CEORisk[] {
  return decisions
    .filter(
      (decision) =>
        decision.risk === "high" ||
        decision.priority === "critical"
    )
    .map((decision) => ({
      title: decision.title,
      level:
        decision.priority === "critical"
          ? "Critical"
          : "High",
      reason: decision.description,
      mitigation:
        `Review and execute the recommended ${decision.category.toLowerCase()} action with human oversight.`,
    }));
}

function mapOpportunities(
  decisions: LegacyGeneratedDecision[]
): CEOOpportunity[] {
  return decisions
    .filter(
      (decision) =>
        decision.risk === "low" &&
        (
          decision.category === "Growth" ||
          decision.category === "SEO" ||
          decision.category ===
            "Market Expansion"
        )
    )
    .map((decision) => ({
      title: decision.title,
      reason: decision.description,
      expectedImpact:
        decision.priority === "high"
          ? "High"
          : decision.priority === "medium"
            ? "Medium"
            : "Low",
      nextStep:
        decision.expectedImpact,
    }));
}

function buildLegacyEngineResult(
  snapshot: AICEODataSnapshot,
  decisions: LegacyGeneratedDecision[]
): CEOEngineResult {
  const actions = createEmptyActions();

  for (const decision of decisions) {
    const actionKey =
      mapExecutionTypeToActionKey(
        decision.executionType
      );

    if (!actionKey) {
      continue;
    }

    actions[actionKey] = {
      enabled: true,
      requiresApproval:
        decision.executionType !==
        "payment-audit",
      reason: decision.description,
    };
  }

  const confidence =
    decisions.length === 0
      ? 70
      : Number(
          (
            decisions.reduce(
              (sum, decision) =>
                sum + decision.confidence,
              0
            ) / decisions.length
          ).toFixed(1)
        );

  const hasCritical =
    decisions.some(
      (decision) =>
        decision.priority === "critical"
    );

  const hasHighRisk =
    decisions.some(
      (decision) =>
        decision.risk === "high"
    );

  const decision: CEODecision = {
    version:
      AI_CEO_LEGACY_GENERATE_ADAPTER_VERSION,
    generatedAt: snapshot.generatedAt,
    summary:
      decisions.length > 0
        ? `The production recommendation engine generated ${decisions.length} executive recommendation(s) from internal, analytics, and search data.`
        : "The production recommendation engine found no urgent executive recommendation from the current data snapshot.",
    confidence,
    overallHealth:
      hasCritical
        ? "Critical"
        : hasHighRisk
          ? "Warning"
          : decisions.length > 0
            ? "Good"
            : "Excellent",
    insufficientData: [
      !snapshot.googleAnalytics.connected
        ? "googleAnalytics"
        : null,
      !snapshot.searchConsole.connected
        ? "searchConsole"
        : null,
    ].filter(
      (value): value is string =>
        value !== null
    ),
    todayPriorities:
      decisions.map(mapPriority),
    actions,
    risks:
      mapRisks(decisions),
    opportunities:
      mapOpportunities(decisions),
    evidence: [
      `Snapshot generated at ${snapshot.generatedAt}.`,
      `Internal users: ${snapshot.internal.totalUsers}.`,
      `VIP users: ${snapshot.internal.vipUsers}.`,
      `Completed payments: ${snapshot.internal.completedPayments}.`,
      `Total revenue: ${snapshot.internal.totalRevenue}.`,
      `GA active users: ${snapshot.googleAnalytics.totalActiveUsers}.`,
      `Search clicks: ${snapshot.searchConsole.totals.clicks}.`,
      `Search impressions: ${snapshot.searchConsole.totals.impressions}.`,
    ],
  };

  return {
    success: true,
    source: "rules",
    decision,
  };
}

function convertSnapshotToCEOMetrics(
  snapshot: AICEODataSnapshot,
  decisions: LegacyGeneratedDecision[]
): CEOMetrics {
  return {
    generatedAt:
      snapshot.generatedAt,

    revenue: {
      total:
        snapshot.internal.totalRevenue,
      currency: "USD",
      trendPercent: null,
    },

    vip: {
      activeMembers:
        snapshot.internal.vipUsers,
      newMembers: null,
      conversionRate:
        snapshot.internal.vipConversionRate,
      revenue:
        snapshot.internal.totalRevenue,
    },

    users: {
      total:
        snapshot.internal.totalUsers,
      active:
        snapshot.googleAnalytics.connected
          ? snapshot.googleAnalytics
              .totalActiveUsers
          : null,
      newUsers: null,
    },

    traffic: {
      sessions:
        snapshot.googleAnalytics.connected
          ? snapshot.googleAnalytics
              .totalActiveUsers
          : null,
      users:
        snapshot.googleAnalytics.connected
          ? snapshot.googleAnalytics
              .totalActiveUsers
          : null,
      trendPercent: null,
    },

    seo: {
      publishedPages:
        snapshot.searchConsole.pages.length,
      averageQualityScore: null,
      pagesNeedingReview: null,
      organicClicks:
        snapshot.searchConsole.totals.clicks,
    },

    predictions: {
      total: null,
      published: null,
      pendingReview: null,
      checked: null,
      correct: null,
      accuracyPercent: null,
    },

    apiHealth: {
      apiFootballAvailable: null,
      openAiAvailable: null,
      paymentProviderAvailable:
        snapshot.internal.totalPayments > 0
          ? true
          : null,
      recentErrors:
        snapshot.internal.failedPayments,
    },

    costs: {
      total: null,
      apiFootball: null,
      openAi: null,
      infrastructure: null,
    },

    competitors: {
      monitored: 0,
      notableChanges: [],
    },

    custom: {
      legacyGeneratedRecommendations:
        decisions.length,
      totalPayments:
        snapshot.internal.totalPayments,
      failedPayments:
        snapshot.internal.failedPayments,
      failedPaymentRate:
        snapshot.internal.totalPayments > 0
          ? Number(
              (
                snapshot.internal.failedPayments /
                snapshot.internal.totalPayments *
                100
              ).toFixed(2)
            )
          : 0,
      completedPayments:
        snapshot.internal.completedPayments,
      paymentSuccessRate:
        snapshot.internal.paymentSuccessRate,
      googleAnalyticsConnected:
        snapshot.googleAnalytics.connected,
      totalActiveUsers:
        snapshot.googleAnalytics.totalActiveUsers,
      registeredUsers:
        snapshot.internal.totalUsers,
      searchCtr:
        snapshot.searchConsole.totals.ctr,
      searchAveragePosition:
        snapshot.searchConsole.totals
          .averagePosition,
    },
  };
}

function createSkippedResult(): LegacyGenerateShadowResult {
  return {
    version:
      AI_CEO_LEGACY_GENERATE_ADAPTER_VERSION,
    attempted: false,
    skipped: true,
    persisted: false,
    historyRecordId: null,
    comparison: null,
    zaos: null,
    acceptable: null,
    score: null,
    error: null,
    persistenceError: null,
  };
}

export async function runLegacyGenerateShadow(
  snapshot: AICEODataSnapshot,
  decisions: LegacyGeneratedDecision[],
  metadata: LegacyGenerateShadowMetadata = {},
  configOverride?: Partial<CEOShadowConfig>
): Promise<LegacyGenerateShadowResult> {
  const baseConfig =
    getCEOShadowConfig();

  const config: CEOShadowConfig = {
    ...baseConfig,
    ...configOverride,
  };

  if (
    config.mode !== "enabled" ||
    !config.enabled ||
    !shouldRunCEOShadow(config)
  ) {
    return createSkippedResult();
  }

  try {
    const legacyResult =
      buildLegacyEngineResult(
        snapshot,
        decisions
      );

    const engineInput: CEOEngineInput = {
      metrics:
        convertSnapshotToCEOMetrics(
          snapshot,
          decisions
        ),
      instruction:
        "Compare ZAOS with the production Generate Recommendations engine without changing production behavior.",
    };

    const previousOpenAISetting =
      process.env.AI_CEO_OPENAI_ENABLED;

    let orchestration:
      OrchestratorResult;
    const zaosStartedAt = Date.now();

    try {
      if (config.forceRuleBasedZAOS) {
        process.env.AI_CEO_OPENAI_ENABLED =
          "false";
      }

      const zaosResult =
        await withCEOShadowTimeout(
          runCEOThroughZAOS(
            engineInput,
            {
              autoExecuteAllowedDelegations:
                false,
              stopAfterPolicyReview:
                false,
            }
          ),
          config.timeoutMs
        );

      orchestration =
        zaosResult.orchestration;
    } finally {
      if (config.forceRuleBasedZAOS) {
        if (
          previousOpenAISetting ===
          undefined
        ) {
          delete process.env
            .AI_CEO_OPENAI_ENABLED;
        } else {
          process.env.AI_CEO_OPENAI_ENABLED =
            previousOpenAISetting;
        }
      }
    }

    const zaosDurationMs =
      Date.now() - zaosStartedAt;

    const comparison =
      compareCEOShadowResults(
        legacyResult,
        orchestration
      );

    const acceptable =
      isShadowScoreAcceptable(
        comparison.overallScore,
        config
      );

    const shadowRun: CEOShadowRunResult = {
      version:
        AI_CEO_LEGACY_GENERATE_ADAPTER_VERSION,
      runAt:
        new Date().toISOString(),
      success:
        legacyResult.success &&
        orchestration.success,
      skipped: false,
      acceptable,
      config,
      legacy:
        legacyResult,
      zaos:
        orchestration,
      comparison,
      legacyDurationMs: 0,
      zaosDurationMs,
      error:
        orchestration.error,
    };

    let persisted = false;
    let historyRecordId:
      | string
      | null = null;
    let persistenceError:
      | string
      | null = null;

    if (
      config.persistComparisons &&
      isFirestoreShadowPersistenceEnabled()
    ) {
      try {
        const record =
          mapShadowRunToHistoryRecord(
            shadowRun,
            {
              ...metadata,
              source:
                metadata.route ||
                "legacy-generate-adapter",
              legacyEngine:
                "generateCEODecisions",
              automatic: true,
              adapterVersion:
                AI_CEO_LEGACY_GENERATE_ADAPTER_VERSION,
              legacyDecisionCount:
                decisions.length,
            }
          );

        const store =
          createFirestoreShadowHistoryStore();

        await store.save(record);

        persisted = true;
        historyRecordId =
          record.id;
      } catch (error) {
        persistenceError =
          error instanceof Error
            ? error.message
            : "Unable to persist legacy generate shadow comparison.";

        console.error(
          "[AI_CEO_LEGACY_GENERATE_SHADOW_PERSIST_ERROR]",
          error
        );
      }
    }

    return {
      version:
        AI_CEO_LEGACY_GENERATE_ADAPTER_VERSION,
      attempted: true,
      skipped: false,
      persisted,
      historyRecordId,
      comparison,
      zaos:
        orchestration,
      acceptable,
      score:
        comparison.overallScore,
      error:
        orchestration.error,
      persistenceError,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Legacy Generate Recommendations shadow comparison failed.";

    console.error(
      "[AI_CEO_LEGACY_GENERATE_SHADOW_ERROR]",
      error
    );

    return {
      version:
        AI_CEO_LEGACY_GENERATE_ADAPTER_VERSION,
      attempted: true,
      skipped: false,
      persisted: false,
      historyRecordId: null,
      comparison: null,
      zaos: null,
      acceptable: false,
      score: null,
      error: message,
      persistenceError: null,
    };
  }
}