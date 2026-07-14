import "server-only";

import {
  runCEOThroughZAOS,
} from "../zaosAdapter";
import type {
  CEOMetrics,
} from "../types";

export type ZAOSSmokeTestResult = {
  success: boolean;
  checkedAt: string;
  assertions: Record<string, boolean>;
  stage: string;
  recommendationCount: number;
  delegationCount: number;
  executionResultCount: number;
  error: string | null;
};

function createSmokeTestMetrics(): CEOMetrics {
  return {
    generatedAt: new Date().toISOString(),

    revenue: {
      total: 1250,
      currency: "USD",
      trendPercent: 8,
    },

    vip: {
      activeMembers: 120,
      newMembers: 8,
      conversionRate: 2.7,
      revenue: 680,
    },

    users: {
      total: 4200,
      active: 1350,
      newUsers: 95,
    },

    traffic: {
      sessions: 9800,
      users: 7100,
      trendPercent: 6,
    },

    seo: {
      publishedPages: 180,
      averageQualityScore: 78,
      pagesNeedingReview: 4,
      organicClicks: 3600,
    },

    predictions: {
      total: 210,
      published: 160,
      pendingReview: 3,
      checked: 120,
      correct: 82,
      accuracyPercent: 68.33,
    },

    apiHealth: {
      apiFootballAvailable: true,
      openAiAvailable: true,
      paymentProviderAvailable: true,
      recentErrors: 1,
    },

    costs: {
      total: 210,
      apiFootball: 45,
      openAi: 70,
      infrastructure: 95,
    },

    competitors: {
      monitored: 6,
      notableChanges: [],
    },

    custom: {
      smokeTest: true,
    },
  };
}

function assertCondition(
  condition: boolean,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(
      `ZAOS smoke test assertion failed: ${message}`
    );
  }
}

export async function runZAOSCEOSmokeTest(): Promise<ZAOSSmokeTestResult> {
  const previousOpenAISetting =
    process.env.AI_CEO_OPENAI_ENABLED;

  process.env.AI_CEO_OPENAI_ENABLED = "false";

  try {
    const result = await runCEOThroughZAOS(
      {
        metrics: createSmokeTestMetrics(),
        instruction:
          "Run a deterministic ZAOS smoke test without changing production data.",
      },
      {
        autoExecuteAllowedDelegations: false,
        stopAfterPolicyReview: false,
        continueWhenNoDelegations: true,
      }
    );

    const orchestration =
      result.orchestration;

    const assertions = {
      orchestrationSucceeded:
        orchestration.success === true,
      completedStage:
        orchestration.stage === "completed",
      observationsCreated:
        orchestration.observations.length > 0,
      analysisCreated:
        orchestration.analysis !== null,
      recommendationsCreated:
        orchestration.recommendations.length > 0,
      decisionCreated:
        orchestration.decision !== null,
      policyCreated:
        orchestration.policy !== null,
      delegationsCreated:
        orchestration.delegations.length > 0,
      autoExecutionDisabled:
        orchestration.executionResults.length === 0,
      noRuntimeError:
        orchestration.error === null,
    };

    for (const [name, passed] of Object.entries(
      assertions
    )) {
      assertCondition(
        passed,
        name
      );
    }

    return {
      success: true,
      checkedAt: new Date().toISOString(),
      assertions,
      stage: orchestration.stage,
      recommendationCount:
        orchestration.recommendations.length,
      delegationCount:
        orchestration.delegations.length,
      executionResultCount:
        orchestration.executionResults.length,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      checkedAt: new Date().toISOString(),
      assertions: {},
      stage: "failed",
      recommendationCount: 0,
      delegationCount: 0,
      executionResultCount: 0,
      error:
        error instanceof Error
          ? error.message
          : "Unknown ZAOS smoke test error.",
    };
  } finally {
    if (
      previousOpenAISetting === undefined
    ) {
      delete process.env
        .AI_CEO_OPENAI_ENABLED;
    } else {
      process.env.AI_CEO_OPENAI_ENABLED =
        previousOpenAISetting;
    }
  }
}