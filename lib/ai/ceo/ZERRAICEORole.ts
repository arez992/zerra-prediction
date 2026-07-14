import "server-only";

import type {
  AIAnalysis,
  AIDecision,
  AIDelegation,
  AIExecutionResult,
  AIImprovement,
  AILearning,
  AIObservation,
  AIPolicyEvaluation,
  AIRecommendation,
  AIReport,
  AIRole,
  AIRoleContext,
  AIRoleIdentity,
  AIVerificationResult,
} from "@/lib/zaos";
import { runCEOBrain } from "./brain";
import type {
  CEOActionKey,
  CEODecision,
  CEOEngineInput,
  CEOEngineResult,
} from "./types";

type SuccessfulCEOEngineResult = Extract<
  CEOEngineResult,
  { success: true }
>;

const ACTION_LABELS: Record<CEOActionKey, string> = {
  publishPredictions: "Publish predictions",
  publishArticles: "Publish articles",
  promoteVip: "Promote VIP",
  pauseMarketing: "Pause marketing",
  improveSeo: "Improve SEO",
  retrainAi: "Retrain AI",
  investigateApi: "Investigate API health",
};

function enabledActions(
  decision: CEODecision
): CEOActionKey[] {
  return (
    Object.entries(decision.actions) as Array<
      [CEOActionKey, { enabled: boolean }]
    >
  )
    .filter(([, action]) => action.enabled)
    .map(([key]) => key);
}

function riskLevel(
  decision: CEODecision
): AIDecision["riskLevel"] {
  if (
    decision.risks.some(
      (risk) => risk.level === "Critical"
    )
  ) {
    return "critical";
  }

  if (
    decision.risks.some(
      (risk) => risk.level === "High"
    )
  ) {
    return "high";
  }

  if (
    decision.risks.some(
      (risk) => risk.level === "Medium"
    )
  ) {
    return "medium";
  }

  return "low";
}

export class ZERRAICEORole implements AIRole {
  public readonly identity: AIRoleIdentity = {
    id: "zerra-ai-ceo",
    name: "ZERRA AI CEO",
    version: "1.0.0",
    level: "ceo",
    status: "active",
    objective:
      "Grow ZERRA safely through verified metrics, recommendations, decisions, delegation, verification, and learning.",
    description:
      "ZAOS adapter for the existing ZERRA AI CEO brain.",
    authority: [
      "observe",
      "analyze",
      "recommend",
      "decide",
      "approve_low_risk",
      "delegate",
      "verify",
      "learn",
      "report",
    ],
    capabilities: [
      {
        id: "executive-analysis",
        name: "Executive analysis",
        description:
          "Analyze verified business metrics.",
        enabled: true,
      },
      {
        id: "executive-decision",
        name: "Executive decision",
        description:
          "Generate recommendations and decisions.",
        enabled: true,
      },
    ],
    kpis: [],
    policyIds: ["zerra-ceo-default-policy"],
    memoryNamespace: "ai-ceo",
    reportTypes: ["daily", "weekly", "monthly"],
  };

  private readonly input: CEOEngineInput;
  private engineResult: SuccessfulCEOEngineResult | null =
    null;

  public constructor(input: CEOEngineInput) {
    this.input = input;
  }

  public async observe(
    context: AIRoleContext
  ): Promise<AIObservation[]> {
    return [
      {
        id: `${context.runId}-metrics`,
        roleId: this.identity.id,
        observedAt: new Date().toISOString(),
        source: "verified-ceo-metrics",
        data: {
          generatedAt: this.input.metrics.generatedAt,
          revenue: this.input.metrics.revenue,
          vip: this.input.metrics.vip,
          users: this.input.metrics.users,
          traffic: this.input.metrics.traffic,
          seo: this.input.metrics.seo,
          predictions: this.input.metrics.predictions,
          apiHealth: this.input.metrics.apiHealth,
          costs: this.input.metrics.costs,
          competitors: this.input.metrics.competitors,
          custom: this.input.metrics.custom ?? {},
        },
        evidence: [
          `Metrics generated at ${this.input.metrics.generatedAt}.`,
        ],
      },
    ];
  }

  public async analyze(
    observations: AIObservation[],
    context: AIRoleContext
  ): Promise<AIAnalysis> {
    const missingData = [
      this.input.metrics.revenue.total === null
        ? "revenue.total"
        : null,
      this.input.metrics.vip.conversionRate === null
        ? "vip.conversionRate"
        : null,
      this.input.metrics.traffic.sessions === null
        ? "traffic.sessions"
        : null,
      this.input.metrics.seo.averageQualityScore ===
      null
        ? "seo.averageQualityScore"
        : null,
      this.input.metrics.predictions.accuracyPercent ===
      null
        ? "predictions.accuracyPercent"
        : null,
      this.input.metrics.costs.total === null
        ? "costs.total"
        : null,
    ].filter(
      (value): value is string => value !== null
    );

    return {
      id: `${context.runId}-analysis`,
      roleId: this.identity.id,
      createdAt: new Date().toISOString(),
      summary:
        missingData.length > 0
          ? "Executive analysis completed with incomplete verified data."
          : "Executive analysis completed from verified operating metrics.",
      confidence: Math.max(
        30,
        90 - missingData.length * 8
      ),
      findings: [
        `Observed ${observations.length} verified source(s).`,
        `Recent errors: ${
          this.input.metrics.apiHealth.recentErrors ??
          "unavailable"
        }.`,
      ],
      missingData,
      evidence: observations.flatMap(
        (item) => item.evidence
      ),
    };
  }

  public async recommend(
    analysis: AIAnalysis,
    context: AIRoleContext
  ): Promise<AIRecommendation[]> {
    const engineResult = await runCEOBrain(
      this.input
    );

    if (!engineResult.success) {
      throw new Error(engineResult.error);
    }

    this.engineResult = engineResult;

    const decision = engineResult.decision;

    return decision.todayPriorities.map(
      (priority, index) => ({
        id:
          priority.id ||
          `${context.runId}-recommendation-${index + 1}`,
        roleId: this.identity.id,
        createdAt: new Date().toISOString(),
        title: priority.title,
        description: priority.reason,
        category:
          priority.actionKey || "executive",
        priority:
          priority.urgency === "High"
            ? "high"
            : priority.urgency === "Medium"
              ? "medium"
              : "low",
        confidence: decision.confidence,
        expectedImpact: priority.impact,
        evidence: analysis.evidence,
        requiresApproval:
          priority.requiresApproval,
      })
    );
  }

  public async decide(
    recommendations: AIRecommendation[],
    analysis: AIAnalysis,
    context: AIRoleContext
  ): Promise<AIDecision> {
    const engineResult = this.engineResult;

    if (!engineResult) {
      throw new Error(
        "AI CEO brain result is unavailable."
      );
    }

    const decision = engineResult.decision;

    return {
      id: `${context.runId}-decision`,
      roleId: this.identity.id,
      createdAt: decision.generatedAt,
      title:
        recommendations[0]?.title ||
        "ZERRA executive decision",
      summary: decision.summary,
      confidence: decision.confidence,
      riskLevel: riskLevel(decision),
      selectedRecommendationIds:
        recommendations.map((item) => item.id),
      evidence: [
        ...analysis.evidence,
        ...decision.evidence,
      ],
      requiresApproval:
        enabledActions(decision).some(
          (key) =>
            decision.actions[key]
              .requiresApproval
        ),
    };
  }

  public async evaluatePolicy(
    decision: AIDecision
  ): Promise<AIPolicyEvaluation> {
    const auto =
      decision.riskLevel === "low" &&
      decision.confidence >= 90 &&
      !decision.requiresApproval;

    return {
      decisionId: decision.id,
      evaluatedAt: new Date().toISOString(),
      allowed: true,
      approvalMode: auto
        ? "auto_low_risk"
        : "manual",
      policyVersion: "1.0.0",
      reasons: [
        auto
          ? "Low-risk high-confidence decision is eligible for auto approval."
          : "Human review is required by risk, confidence, or action policy.",
      ],
    };
  }

  public async delegate(
    decision: AIDecision,
    policy: AIPolicyEvaluation,
    context: AIRoleContext
  ): Promise<AIDelegation[]> {
    const engineResult = this.engineResult;

    if (!policy.allowed || !engineResult) {
      return [];
    }

    const ceoDecision =
      engineResult.decision;

    return enabledActions(ceoDecision).map(
      (key, index) => ({
        id: `${context.runId}-delegation-${index + 1}`,
        decisionId: decision.id,
        delegatedByRoleId: this.identity.id,
        delegatedToRoleId: targetRole(key),
        taskType: key,
        payload: {
          actionKey: key,
          title: ACTION_LABELS[key],
          reason:
            ceoDecision.actions[key].reason,
          requiresApproval:
            ceoDecision.actions[key]
              .requiresApproval,
        },
        createdAt: new Date().toISOString(),
      })
    );
  }

  public async execute(
    delegation: AIDelegation
  ): Promise<AIExecutionResult> {
    return {
      success: true,
      completed: false,
      message:
        `Delegation ${delegation.id} created for ${delegation.delegatedToRoleId}.`,
      data: {
        ...delegation.payload,
      },
    };
  }

  public async verify(
    _decision: AIDecision,
    results: AIExecutionResult[]
  ): Promise<AIVerificationResult> {
    const completed = results.filter(
      (item) => item.completed
    ).length;

    return {
      verified:
        results.length > 0 &&
        completed === results.length,
      verifiedAt: new Date().toISOString(),
      expectedOutcome:
        "All delegated tasks complete successfully.",
      actualOutcome:
        `${completed} of ${results.length} tasks completed.`,
      kpiChanges: {},
      issues: results
        .filter((item) => !item.success)
        .map((item) => item.message),
    };
  }

  public async learn(
    decision: AIDecision,
    verification: AIVerificationResult,
    context: AIRoleContext
  ): Promise<AILearning> {
    return {
      id: `${context.runId}-learning`,
      roleId: this.identity.id,
      decisionId: decision.id,
      createdAt: new Date().toISOString(),
      success: verification.verified,
      lesson: verification.verified
        ? "Decision execution was verified."
        : "More execution evidence is required before verification.",
      strategyChange: null,
      evidence: verification.issues,
    };
  }

  public async improve(
    learning: AILearning,
    context: AIRoleContext
  ): Promise<AIImprovement | null> {
    if (learning.success) {
      return null;
    }

    return {
      id: `${context.runId}-improvement`,
      roleId: this.identity.id,
      createdAt: new Date().toISOString(),
      objective:
        "Improve execution evidence and verification.",
      changes: [
        "Require execution evidence before marking decisions verified.",
      ],
      expectedKPIImpact: {},
      requiresApproval: false,
    };
  }

  public async report(
    context: AIRoleContext
  ): Promise<AIReport> {
    const engineResult = this.engineResult;

    if (!engineResult) {
      return {
        id: `${context.runId}-report`,
        roleId: this.identity.id,
        createdAt: new Date().toISOString(),
        period: "custom",
        title: "ZERRA AI CEO ZAOS Report",
        summary:
          "No CEO decision was produced.",
        metrics: {
          confidence: null,
          health: null,
        },
        achievements: [],
        failures: [],
        lessons: [],
        nextActions: [],
      };
    }

    const decision = engineResult.decision;

    return {
      id: `${context.runId}-report`,
      roleId: this.identity.id,
      createdAt: new Date().toISOString(),
      period: "custom",
      title: "ZERRA AI CEO ZAOS Report",
      summary: decision.summary,
      metrics: {
        confidence: decision.confidence,
        health: decision.overallHealth,
      },
      achievements: [],
      failures: [],
      lessons: [],
      nextActions:
        decision.todayPriorities.map(
          (item) => item.title
        ),
    };
  }
}

function targetRole(
  key: CEOActionKey
): string {
  if (
    key === "improveSeo" ||
    key === "publishArticles"
  ) {
    return "seo-director";
  }

  if (
    key === "publishPredictions" ||
    key === "retrainAi"
  ) {
    return "prediction-director";
  }

  if (
    key === "promoteVip" ||
    key === "pauseMarketing"
  ) {
    return "marketing-director";
  }

  return "operations-director";
}
