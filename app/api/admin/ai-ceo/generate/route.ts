import {
  NextResponse,
} from "next/server";
import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  collectAICEOData,
  type AICEODataSnapshot,
} from "@/lib/ai-ceo/dataCollector";
import {
  generateCEODecisions,
  type CEODecision,
} from "@/lib/ai-ceo/decisionEngine";
import {
  runCEOCanary,
} from "@/lib/ai/ceo/migration/CEOCanaryRouter";
import {
  runCEOThroughZAOS,
} from "@/lib/ai/ceo/zaosAdapter";
import type {
  CEOMetrics,
} from "@/lib/ai/ceo/types";
import {
  runLegacyGenerateShadow,
} from "@/lib/ai-ceo/shadow/LegacyGenerateAdapter";
import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";
import {
  findSimilarDecisions,
} from "@/src/lib/ai/ceo/similar/findSimilar";
import {
  calculateDecisionHistoryScore,
  summarizeSimilarDecisions,
} from "@/src/lib/ai/ceo/similar/score";
import type {
  SimilarDecisionMatch,
  SimilarDecisionSummary,
} from "@/src/lib/ai/ceo/similar/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreatedRecommendation =
  CEODecision & {
    id: string;
    status: "pending";
  };


type DecisionHistoryContext = {
  evaluated: boolean;
  historyScore: number;
  summary:
    SimilarDecisionSummary | null;
  matches:
    SimilarDecisionMatch[];
  generatedAt: string;
  reason: string | null;
};

type HistoryEnrichedDecision =
  CEODecision & {
    decisionHistory:
      DecisionHistoryContext;
  };

const MAX_HISTORY_LOOKUPS_PER_RUN = 5;

function getHistoryLookupPriority(
  decision: CEODecision
): number {
  switch (decision.priority) {
    case "critical":
      return 4;

    case "high":
      return 3;

    case "medium":
      return 2;

    case "low":
    default:
      return 1;
  }
}

function buildHistoryTags(
  decision: CEODecision
): string[] {
  return Array.from(
    new Set(
      [
        decision.category,
        decision.priority,
        decision.risk,
        decision.source,
        decision.executionType,
      ]
        .filter(
          (
            value
          ): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        )
        .map((value) =>
          value.trim().toLowerCase()
        )
    )
  );
}

function emptyHistoryContext(
  reason: string
): DecisionHistoryContext {
  return {
    evaluated: false,
    historyScore: 0,
    summary: null,
    matches: [],
    generatedAt:
      new Date().toISOString(),
    reason,
  };
}

async function enrichDecisionWithHistory(
  decision: CEODecision
): Promise<HistoryEnrichedDecision> {
  try {
    const result =
      await findSimilarDecisions({
        input: {
          recommendationType:
            decision.category ||
            "Executive",
          title:
            decision.title,
          description:
            decision.description,
          executionType:
            decision.executionType ||
            null,
          tags:
            buildHistoryTags(
              decision
            ),
          metadata: {
            priority:
              decision.priority,
            risk:
              decision.risk,
            source:
              decision.source,
            expectedImpact:
              decision.expectedImpact,
          },
        },
        minimumScore: 35,
        limit: 5,
        candidateLimit: 100,
        includeFailed: true,
        includeNeutral: true,
      });

    const summary =
      summarizeSimilarDecisions(
        result.matches
      );

    return {
      ...decision,
      decisionHistory: {
        evaluated: true,
        historyScore:
          calculateDecisionHistoryScore(
            result.matches
          ),
        summary,
        matches:
          result.matches,
        generatedAt:
          result.generatedAt,
        reason: null,
      },
    };
  } catch (error) {
    console.warn(
      "[AI_CEO_SIMILAR_HISTORY_WARNING]",
      {
        title:
          decision.title,
        error:
          error instanceof Error
            ? error.message
            : "Unknown similar decision error",
      }
    );

    return {
      ...decision,
      decisionHistory:
        emptyHistoryContext(
          "Historical intelligence could not be evaluated for this recommendation."
        ),
    };
  }
}

async function enrichDecisionsWithHistory(
  decisions: CEODecision[]
): Promise<
  HistoryEnrichedDecision[]
> {
  const lookupIndexes =
    decisions
      .map(
        (
          decision,
          index
        ) => ({
          index,
          priority:
            getHistoryLookupPriority(
              decision
            ),
          confidence:
            Number(
              decision.confidence ||
              0
            ),
        })
      )
      .sort(
        (left, right) =>
          right.priority -
            left.priority ||
          right.confidence -
            left.confidence
      )
      .slice(
        0,
        MAX_HISTORY_LOOKUPS_PER_RUN
      )
      .map((item) =>
        item.index
      );

  const lookupSet =
    new Set(
      lookupIndexes
    );

  return Promise.all(
    decisions.map(
      (
        decision,
        index
      ) => {
        if (
          !lookupSet.has(index)
        ) {
          return Promise.resolve({
            ...decision,
            decisionHistory:
              emptyHistoryContext(
                "Skipped by the bounded history lookup policy."
              ),
          });
        }

        return enrichDecisionWithHistory(
          decision
        );
      }
    )
  );
}

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "unauthorized"
    ) ||
    normalized.includes(
      "authentication required"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes(
      "forbidden"
    ) ||
    normalized.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  return 500;
}

function getFailedPaymentRate(
  snapshot: AICEODataSnapshot
): number {
  if (
    snapshot.internal.totalPayments <= 0
  ) {
    return 0;
  }

  return Number(
    (
      snapshot.internal.failedPayments /
      snapshot.internal.totalPayments *
      100
    ).toFixed(2)
  );
}

function convertSnapshotToCEOMetrics(
  snapshot: AICEODataSnapshot
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
        snapshot.internal
          .vipConversionRate,
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
      totalPayments:
        snapshot.internal.totalPayments,
      failedPayments:
        snapshot.internal.failedPayments,
      failedPaymentRate:
        getFailedPaymentRate(snapshot),
      completedPayments:
        snapshot.internal.completedPayments,
      paymentSuccessRate:
        snapshot.internal.paymentSuccessRate,
      googleAnalyticsConnected:
        snapshot.googleAnalytics.connected,
      totalActiveUsers:
        snapshot.googleAnalytics
          .totalActiveUsers,
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

function mapZAOSExecutionType(
  category: string
): string | null {
  switch (category) {
    case "investigateApi":
      return "payment-audit";

    case "promoteVip":
      return "controlled-user-acquisition";

    case "publishArticles":
      return "growth-foundation-plan";

    case "improveSeo":
      return "seo-metadata-optimization";

    case "retrainAi":
      return "prediction-model-review";

    case "publishPredictions":
      return "prediction-review";

    case "pauseMarketing":
      return "marketing-review";

    default:
      return null;
  }
}

function mapZAOSPriority(
  priority: string
): CEODecision["priority"] {
  if (priority === "high") {
    return "high";
  }

  if (priority === "low") {
    return "low";
  }

  return "medium";
}

function mapZAOSRisk(
  priority: CEODecision["priority"],
  confidence: number
): CEODecision["risk"] {
  if (
    priority === "critical" ||
    confidence < 60
  ) {
    return "high";
  }

  if (confidence >= 85) {
    return "low";
  }

  return "medium";
}

async function generateZAOSDecisions(
  snapshot: AICEODataSnapshot
): Promise<CEODecision[]> {
  const {
    orchestration,
  } = await runCEOThroughZAOS(
    {
      metrics:
        convertSnapshotToCEOMetrics(
          snapshot
        ),
      instruction:
        "Generate production-safe executive recommendations. Do not execute or publish any action automatically.",
    },
    {
      autoExecuteAllowedDelegations:
        false,
      stopAfterPolicyReview: false,
    }
  );

  if (!orchestration.success) {
    throw new Error(
      orchestration.error ||
        "ZAOS recommendation generation failed."
    );
  }

  return orchestration.recommendations
    .slice(0, 20)
    .map((recommendation) => {
      const priority =
        mapZAOSPriority(
          recommendation.priority
        );

      const confidence =
        Math.min(
          100,
          Math.max(
            0,
            Number(
              recommendation.confidence ||
              0
            )
          )
        );

      return {
        title:
          recommendation.title,
        description:
          recommendation.description,
        category:
          recommendation.category ||
          "Executive",
        priority,
        confidence,
        expectedImpact:
          recommendation.expectedImpact ||
          "Improve verified business performance",
        source: "ZAOS",
        risk:
          mapZAOSRisk(
            priority,
            confidence
          ),
        executionType:
          mapZAOSExecutionType(
            recommendation.category
          ),
        executionPayload: {
          zaosRecommendationId:
            recommendation.id,
          evidence:
            recommendation.evidence,
          requiresApproval:
            recommendation
              .requiresApproval,
        },
      };
    });
}

function isValidCanaryResult(
  decisions: CEODecision[]
): boolean {
  return (
    Array.isArray(decisions) &&
    decisions.length <= 20 &&
    decisions.every(
      (decision) =>
        typeof decision.title ===
          "string" &&
        decision.title.trim().length > 0 &&
        typeof decision.description ===
          "string" &&
        decision.description.trim()
          .length > 0 &&
        Number.isFinite(
          decision.confidence
        )
    )
  );
}

export async function POST() {
  try {
    const admin =
      await requireServerAdmin();

    const snapshot =
      await collectAICEOData();

    /*
     * The legacy baseline is generated on every run.
     * It remains the default and is also required for
     * shadow comparison while the canary is evaluated.
     */
    const legacyDecisions =
      generateCEODecisions(
        snapshot
      );

    const requestId =
      `ai-ceo-generate:${snapshot.generatedAt}`;

    const canary =
      await runCEOCanary<
        CEODecision[]
      >({
        requestId,

        runLegacy: async () =>
          legacyDecisions,

        runZAOS: async () =>
          generateZAOSDecisions(
            snapshot
          ),

        validateZAOSResult:
          isValidCanaryResult,

        metadata: {
          route:
            "/api/admin/ai-ceo/generate",
          requestedBy:
            admin.email ||
            admin.uid ||
            "unknown-admin",
          snapshotGeneratedAt:
            snapshot.generatedAt,
        },
      });

    const decisions =
      await enrichDecisionsWithHistory(
        canary.result
      );

    const createdRecommendations:
      CreatedRecommendation[] = [];

    for (const decision of decisions) {
      const duplicateSnapshot =
        await adminDb
          .collection(
            "ceoRecommendations"
          )
          .where(
            "title",
            "==",
            decision.title
          )
          .where(
            "status",
            "in",
            [
              "pending",
              "approved",
              "executing",
            ]
          )
          .limit(1)
          .get();

      if (
        !duplicateSnapshot.empty
      ) {
        continue;
      }

      const recommendation = {
        ...decision,
        executionPayload: {
          ...(
            decision.executionPayload ||
            {}
          ),
          similarDecisionContext: {
            evaluated:
              decision.decisionHistory
                .evaluated,
            historyScore:
              decision.decisionHistory
                .historyScore,
            recommendedAction:
              decision.decisionHistory
                .summary
                ?.recommendedAction ||
              "insufficient-history",
            totalMatches:
              decision.decisionHistory
                .summary
                ?.totalMatches ||
              0,
            strongestMatch:
              decision.decisionHistory
                .summary
                ?.strongestMatch ||
              null,
            generatedAt:
              decision.decisionHistory
                .generatedAt,
            reason:
              decision.decisionHistory
                .reason,
          },
        },
        status: "pending" as const,

        createdBy:
          admin.email ||
          admin.uid ||
          "ai-ceo",

        generationSource:
          canary.source,

        canaryRequestId:
          canary.requestId,

        dataSnapshotAt:
          snapshot.generatedAt,

        createdAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),

        approvedAt: null,
        rejectedAt: null,
        executedAt: null,
        completedAt: null,

        result: null,
        rejectionReason: null,
      };

      const document =
        await adminDb
          .collection(
            "ceoRecommendations"
          )
          .add(
            recommendation
          );

      createdRecommendations.push({
        id: document.id,
        ...decision,
        status: "pending",
      });
    }

    /*
     * Shadow validation continues against the actual
     * legacy baseline. It never changes the canary
     * source or the saved production result.
     */
    const shadow =
      await runLegacyGenerateShadow(
        snapshot,
        legacyDecisions,
        {
          requestedBy:
            admin.email ||
            admin.uid ||
            "unknown-admin",
          route:
            "/api/admin/ai-ceo/generate",
          canaryRequestId:
            canary.requestId,
          canarySource:
            canary.source,
          canarySelectedSource:
            canary.selectedSource,
          canaryFallbackUsed:
            canary.fallbackUsed,
          createdRecommendationIds:
            createdRecommendations.map(
              (recommendation) =>
                recommendation.id
            ),
          generatedCount:
            decisions.length,
          createdCount:
            createdRecommendations.length,
          duplicateCount:
            decisions.length -
            createdRecommendations.length,
        }
      );

    if (
      shadow.error ||
      shadow.persistenceError
    ) {
      console.warn(
        "[AI_CEO_GENERATE_SHADOW_WARNING]",
        {
          error:
            shadow.error,
          persistenceError:
            shadow.persistenceError,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        generated:
          decisions.length,
        created:
          createdRecommendations.length,
        skippedAsDuplicates:
          decisions.length -
          createdRecommendations.length,
        recommendations:
          createdRecommendations,
        snapshotGeneratedAt:
          snapshot.generatedAt,

        canary: {
          requestId:
            canary.requestId,
          source:
            canary.source,
          selectedSource:
            canary.selectedSource,
          fallbackUsed:
            canary.fallbackUsed,
          enabled:
            canary.routing.enabled,
          percent:
            canary.routing
              .canaryPercent,
          bucket:
            canary.routing.bucket,
          reason:
            canary.routing.reason,
          autoExecutionEnabled:
            false,
          error:
            canary.zaosError,
        },

        shadow: {
          attempted:
            shadow.attempted,
          skipped:
            shadow.skipped,
          persisted:
            shadow.persisted,
          historyRecordId:
            shadow.historyRecordId,
          acceptable:
            shadow.acceptable,
          score:
            shadow.score,
          error:
            shadow.error ||
            shadow.persistenceError,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "AI CEO decision generation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate AI CEO recommendations.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(message),
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}