import "server-only";

import {
  collectAICEOData,
} from "@/lib/ai-ceo/dataCollector";

import {
  executeRegisteredHandler,
  getExecutionRegistration,
} from "@/lib/ai-ceo/execution/registry";

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

export type ZERRADirectorId =
  | "prediction-director"
  | "seo-director"
  | "growth-director"
  | "marketing-director"
  | "payments-director";

export type ZERRADirectorDepartment =
  | "prediction"
  | "seo"
  | "growth"
  | "marketing"
  | "payments";

export type ZERRADirectorDefinition = {
  id: ZERRADirectorId;
  department: ZERRADirectorDepartment;
  name: string;
  objective: string;
  description: string;
  memoryNamespace: string;
  policyId: string;
  reportTypes: string[];
  defaultExecutionType: string;
  capabilities: Array<{
    id: string;
    name: string;
    description: string;
  }>;
};

export type ZERRADirectorInput = {
  delegation?: AIDelegation | null;
  instruction?: string | null;
  evidence?: Record<string, unknown>;
};

const DIRECTOR_DEFINITIONS: Record<
  ZERRADirectorId,
  ZERRADirectorDefinition
> = {
  "prediction-director": {
    id: "prediction-director",
    department: "prediction",
    name: "ZERRA Prediction Director",
    objective:
      "Protect prediction quality, accuracy, publishing discipline, data completeness, and model safety.",
    description:
      "Directs ZERRA prediction operations while preserving the canonical prediction engine and its quality gates.",
    memoryNamespace: "director:prediction",
    policyId: "zerra-prediction-director-policy",
    reportTypes: ["daily", "weekly", "monthly"],
    defaultExecutionType: "prediction-review",
    capabilities: [
      {
        id: "prediction-quality-review",
        name: "Prediction quality review",
        description:
          "Review prediction quality, safety gates, and publishing readiness.",
      },
      {
        id: "prediction-model-review",
        name: "Prediction model review",
        description:
          "Create safe model-review plans without silently replacing production models.",
      },
    ],
  },

  "seo-director": {
    id: "seo-director",
    department: "seo",
    name: "ZERRA SEO Director",
    objective:
      "Grow qualified organic visibility while protecting content quality, search compliance, and publishing safety.",
    description:
      "Directs SEO analysis, metadata optimization, content opportunity planning, and controlled SEO execution.",
    memoryNamespace: "director:seo",
    policyId: "zerra-seo-director-policy",
    reportTypes: ["daily", "weekly", "monthly"],
    defaultExecutionType: "seo-metadata-optimization",
    capabilities: [
      {
        id: "seo-analysis",
        name: "SEO analysis",
        description:
          "Analyze verified Search Console and Analytics evidence.",
      },
      {
        id: "seo-opportunity-planning",
        name: "SEO opportunity planning",
        description:
          "Create controlled metadata, content-cluster, and country opportunity plans.",
      },
    ],
  },

  "growth-director": {
    id: "growth-director",
    department: "growth",
    name: "ZERRA Growth Director",
    objective:
      "Increase qualified users and VIP conversion through controlled, measurable, low-risk experiments.",
    description:
      "Directs growth analysis, acquisition review, registration funnel review, and VIP conversion improvement planning.",
    memoryNamespace: "director:growth",
    policyId: "zerra-growth-director-policy",
    reportTypes: ["daily", "weekly", "monthly"],
    defaultExecutionType: "growth-foundation-plan",
    capabilities: [
      {
        id: "growth-analysis",
        name: "Growth analysis",
        description:
          "Analyze verified traffic, registration, conversion, and payment-friction evidence.",
      },
      {
        id: "controlled-growth-planning",
        name: "Controlled growth planning",
        description:
          "Create measurable growth experiments without changing spend automatically.",
      },
    ],
  },

  "marketing-director": {
    id: "marketing-director",
    department: "marketing",
    name: "ZERRA Marketing Director",
    objective:
      "Improve acquisition quality, campaign hypotheses, device experience, country opportunities, and conversion messaging safely.",
    description:
      "Directs marketing analysis and controlled campaign planning without automatically changing advertising budgets.",
    memoryNamespace: "director:marketing",
    policyId: "zerra-marketing-director-policy",
    reportTypes: ["daily", "weekly", "monthly"],
    defaultExecutionType: "marketing-review",
    capabilities: [
      {
        id: "marketing-analysis",
        name: "Marketing analysis",
        description:
          "Analyze traffic sources, devices, countries, conversion, and retention signals.",
      },
      {
        id: "campaign-hypothesis",
        name: "Campaign hypothesis",
        description:
          "Create controlled campaign hypotheses without changing budget automatically.",
      },
    ],
  },

  "payments-director": {
    id: "payments-director",
    department: "payments",
    name: "ZERRA Payments Director",
    objective:
      "Protect payment reliability, conversion integrity, transaction visibility, and financial operating safety.",
    description:
      "Directs payment auditing and payment-friction analysis. Financial or destructive actions remain owner-controlled.",
    memoryNamespace: "director:payments",
    policyId: "zerra-payments-director-policy",
    reportTypes: ["daily", "weekly", "monthly"],
    defaultExecutionType: "payment-audit",
    capabilities: [
      {
        id: "payment-audit",
        name: "Payment audit",
        description:
          "Audit payment status distribution and completion rate.",
      },
      {
        id: "payment-risk-review",
        name: "Payment risk review",
        description:
          "Identify payment friction without issuing refunds or modifying transactions.",
      },
    ],
  },
};

function normalizeText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function inferRiskLevel(
  definition: ZERRADirectorDefinition,
  executionType: string
): AIDecision["riskLevel"] {
  if (
    definition.department === "payments" ||
    executionType === "generate-predictions"
  ) {
    return "medium";
  }

  return "low";
}

function requiresManualApproval(
  definition: ZERRADirectorDefinition,
  executionType: string,
  riskLevel: AIDecision["riskLevel"]
): boolean {
  if (
    definition.department === "payments" ||
    executionType === "generate-predictions"
  ) {
    return true;
  }

  return (
    riskLevel === "high" ||
    riskLevel === "critical"
  );
}

function resolveExecutionType(
  definition: ZERRADirectorDefinition,
  input: ZERRADirectorInput
): string {
  const explicit =
    normalizeText(
      input.delegation?.payload?.executionType
    );

  if (
    explicit &&
    getExecutionRegistration(explicit)?.department ===
      definition.department
  ) {
    return explicit;
  }

  const taskType =
    normalizeText(
      input.delegation?.taskType
    );

  const taskMappings: Record<
    string,
    string
  > = {
    publishPredictions:
      "generate-predictions",
    retrainAi:
      "prediction-model-review",
    improveSeo:
      "seo-metadata-optimization",
    publishArticles:
      "create-seo-content-cluster",
    promoteVip:
      "vip-conversion-review",
    pauseMarketing:
      "marketing-review",
    investigateApi:
      "payment-audit",
  };

  const mapped =
    taskMappings[taskType];

  if (
    mapped &&
    getExecutionRegistration(mapped)?.department ===
      definition.department
  ) {
    return mapped;
  }

  return definition.defaultExecutionType;
}

export class ZERRADirectorRole
  implements AIRole {
  public readonly identity:
    AIRoleIdentity;

  private readonly definition:
    ZERRADirectorDefinition;

  private readonly input:
    ZERRADirectorInput;

  private readonly selectedExecutionType:
    string;

  public constructor(
    directorId: ZERRADirectorId,
    input: ZERRADirectorInput = {}
  ) {
    this.definition =
      DIRECTOR_DEFINITIONS[directorId];

    this.input = input;

    this.selectedExecutionType =
      resolveExecutionType(
        this.definition,
        input
      );

    this.identity = {
      id: this.definition.id,
      name: this.definition.name,
      version: "1.0.0",
      level: "director",
      status: "active",
      objective:
        this.definition.objective,
      description:
        this.definition.description,
      authority: [
        "observe",
        "analyze",
        "recommend",
        "decide",
        "approve_low_risk",
        "delegate",
        "execute_internal",
        "verify",
        "learn",
        "report",
      ],
      capabilities:
        this.definition.capabilities.map(
          (capability) => ({
            ...capability,
            enabled: true,
          })
        ),
      kpis: [],
      policyIds: [
        this.definition.policyId,
      ],
      memoryNamespace:
        this.definition.memoryNamespace,
      reportTypes:
        this.definition.reportTypes,
    };
  }

  public async observe(
    context: AIRoleContext
  ): Promise<AIObservation[]> {
    const snapshot =
      await collectAICEOData();

    return [
      {
        id:
          `${context.runId}-director-observation`,
        roleId:
          this.identity.id,
        observedAt:
          new Date().toISOString(),
        source:
          "verified-ai-ceo-shared-snapshot",
        data: {
          department:
            this.definition.department,
          generatedAt:
            snapshot.generatedAt,
          internal:
            snapshot.internal,
          googleAnalytics:
            snapshot.googleAnalytics,
          searchConsole:
            snapshot.searchConsole,
          delegation:
            this.input.delegation || null,
          evidence:
            this.input.evidence || {},
        },
        evidence: [
          `Shared AI CEO snapshot generated at ${snapshot.generatedAt}.`,
          `Director department: ${this.definition.department}.`,
        ],
      },
    ];
  }

  public async analyze(
    observations: AIObservation[],
    context: AIRoleContext
  ): Promise<AIAnalysis> {
    const registration =
      getExecutionRegistration(
        this.selectedExecutionType
      );

    const missingData: string[] = [];

    if (!registration) {
      missingData.push(
        `execution-handler:${this.selectedExecutionType}`
      );
    }

    if (
      registration &&
      registration.department !==
        this.definition.department
    ) {
      missingData.push(
        `execution-department-mismatch:${this.selectedExecutionType}`
      );
    }

    return {
      id:
        `${context.runId}-director-analysis`,
      roleId:
        this.identity.id,
      createdAt:
        new Date().toISOString(),
      summary:
        missingData.length === 0
          ? `${this.identity.name} analysis completed with an executable department path.`
          : `${this.identity.name} analysis found missing execution wiring.`,
      confidence:
        missingData.length === 0
          ? 92
          : 55,
      findings: [
        `Selected execution type: ${this.selectedExecutionType}.`,
        `Observed ${observations.length} verified source(s).`,
      ],
      missingData,
      evidence:
        observations.flatMap(
          (observation) =>
            observation.evidence
        ),
    };
  }

  public async recommend(
    analysis: AIAnalysis,
    context: AIRoleContext
  ): Promise<AIRecommendation[]> {
    const riskLevel =
      inferRiskLevel(
        this.definition,
        this.selectedExecutionType
      );

    const approvalRequired =
      requiresManualApproval(
        this.definition,
        this.selectedExecutionType,
        riskLevel
      );

    const delegatedTitle =
      normalizeText(
        this.input.delegation
          ?.payload?.title
      );

    const delegatedReason =
      normalizeText(
        this.input.delegation
          ?.payload?.reason
      );

    return [
      {
        id:
          `${context.runId}-director-recommendation-1`,
        roleId:
          this.identity.id,
        createdAt:
          new Date().toISOString(),
        title:
          delegatedTitle ||
          `${this.identity.name} operational review`,
        description:
          delegatedReason ||
          `Run ${this.selectedExecutionType} through the registered ${this.definition.department} execution path.`,
        category:
          this.selectedExecutionType,
        priority:
          riskLevel === "critical"
            ? "critical"
            : riskLevel === "high"
              ? "high"
              : riskLevel === "medium"
                ? "medium"
                : "low",
        confidence:
          analysis.confidence,
        expectedImpact:
          `Improve ${this.definition.department} operating quality using verified evidence and controlled execution.`,
        evidence:
          analysis.evidence,
        requiresApproval:
          approvalRequired,
      },
    ];
  }

  public async decide(
    recommendations: AIRecommendation[],
    analysis: AIAnalysis,
    context: AIRoleContext
  ): Promise<AIDecision> {
    const riskLevel =
      inferRiskLevel(
        this.definition,
        this.selectedExecutionType
      );

    const approvalRequired =
      requiresManualApproval(
        this.definition,
        this.selectedExecutionType,
        riskLevel
      );

    return {
      id:
        `${context.runId}-director-decision`,
      roleId:
        this.identity.id,
      createdAt:
        new Date().toISOString(),
      title:
        recommendations[0]?.title ||
        `${this.identity.name} decision`,
      summary:
        `${this.identity.name} selected ${this.selectedExecutionType} as the controlled execution path.`,
      confidence:
        analysis.confidence,
      riskLevel,
      selectedRecommendationIds:
        recommendations.map(
          (recommendation) =>
            recommendation.id
        ),
      evidence:
        analysis.evidence,
      requiresApproval:
        approvalRequired,
    };
  }

  public async evaluatePolicy(
    decision: AIDecision
  ): Promise<AIPolicyEvaluation> {
    const requiresApproval =
      decision.requiresApproval ||
      decision.riskLevel === "medium" ||
      decision.riskLevel === "high" ||
      decision.riskLevel === "critical";

    const canAutoApprove =
      !requiresApproval &&
      decision.riskLevel === "low" &&
      decision.confidence >= 90;

    return {
      decisionId:
        decision.id,
      evaluatedAt:
        new Date().toISOString(),
      allowed: true,
      approvalMode:
        canAutoApprove
          ? "auto_low_risk"
          : "manual",
      policyVersion:
        "1.0.0",
      reasons: [
        canAutoApprove
          ? "Low-risk high-confidence internal director action is eligible for controlled auto approval."
          : "Director action requires human approval because of risk, financial sensitivity, or execution policy.",
      ],
    };
  }

  public async delegate(
    decision: AIDecision,
    policy: AIPolicyEvaluation,
    context: AIRoleContext
  ): Promise<AIDelegation[]> {
    if (!policy.allowed) {
      return [];
    }

    const registration =
      getExecutionRegistration(
        this.selectedExecutionType
      );

    if (
      !registration ||
      registration.department !==
        this.definition.department
    ) {
      return [];
    }

    return [
      {
        id:
          `${context.runId}-worker-delegation-1`,
        decisionId:
          decision.id,
        delegatedByRoleId:
          this.identity.id,
        delegatedToRoleId:
          `${this.definition.department}-worker`,
        taskType:
          this.selectedExecutionType,
        payload: {
          ...(this.input.delegation
            ?.payload || {}),
          directorId:
            this.identity.id,
          department:
            this.definition.department,
          executionType:
            this.selectedExecutionType,
        },
        createdAt:
          new Date().toISOString(),
      },
    ];
  }

  public async execute(
    delegation: AIDelegation,
    context: AIRoleContext
  ): Promise<AIExecutionResult> {
    const registration =
      getExecutionRegistration(
        delegation.taskType
      );

    if (!registration) {
      return {
        success: false,
        completed: false,
        message:
          `No registered worker executor exists for ${delegation.taskType}.`,
      };
    }

    if (
      registration.department !==
        this.definition.department
    ) {
      return {
        success: false,
        completed: false,
        message:
          `Worker executor department mismatch for ${delegation.taskType}.`,
      };
    }

    const result =
      await executeRegisteredHandler({
        recommendationId:
          delegation.decisionId,
        executionType:
          delegation.taskType,
        payload:
          delegation.payload,
        metadata: {
          executedBy:
            this.identity.id,
          directorRunId:
            context.runId,
          delegatedToRoleId:
            delegation.delegatedToRoleId,
        },
      });

    return {
      success:
        result.success,
      completed:
        result.completed,
      message:
        result.message,
      data:
        result.data,
    };
  }

  public async verify(
    _decision: AIDecision,
    executionResults:
      AIExecutionResult[]
  ): Promise<AIVerificationResult> {
    const completed =
      executionResults.filter(
        (result) =>
          result.success &&
          result.completed
      ).length;

    const verified =
      executionResults.length > 0 &&
      completed ===
        executionResults.length;

    return {
      verified,
      verifiedAt:
        new Date().toISOString(),
      expectedOutcome:
        "All delegated department worker tasks complete successfully.",
      actualOutcome:
        `${completed} of ${executionResults.length} department worker task(s) completed successfully.`,
      kpiChanges: {},
      issues:
        executionResults
          .filter(
            (result) =>
              !result.success ||
              !result.completed
          )
          .map(
            (result) =>
              result.message
          ),
    };
  }

  public async learn(
    decision: AIDecision,
    verification:
      AIVerificationResult,
    context: AIRoleContext
  ): Promise<AILearning> {
    return {
      id:
        `${context.runId}-director-learning`,
      roleId:
        this.identity.id,
      decisionId:
        decision.id,
      createdAt:
        new Date().toISOString(),
      success:
        verification.verified,
      lesson:
        verification.verified
          ? `${this.identity.name} execution was verified successfully.`
          : `${this.identity.name} requires more execution evidence or corrective action.`,
      strategyChange: null,
      evidence:
        verification.issues,
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
      id:
        `${context.runId}-director-improvement`,
      roleId:
        this.identity.id,
      createdAt:
        new Date().toISOString(),
      objective:
        `Improve ${this.definition.department} execution reliability.`,
      changes: [
        "Review missing evidence, worker execution wiring, and policy requirements before the next run.",
      ],
      expectedKPIImpact: {},
      requiresApproval: false,
    };
  }

  public async report(
    context: AIRoleContext
  ): Promise<AIReport> {
    return {
      id:
        `${context.runId}-director-report`,
      roleId:
        this.identity.id,
      createdAt:
        new Date().toISOString(),
      period: "custom",
      title:
        `${this.identity.name} Report`,
      summary:
        `${this.identity.name} selected ${this.selectedExecutionType} as its current controlled execution path.`,
      metrics: {
        department:
          this.definition.department,
        executionType:
          this.selectedExecutionType,
        handlerRegistered:
          Boolean(
            getExecutionRegistration(
              this.selectedExecutionType
            )
          ),
      },
      achievements: [],
      failures: [],
      lessons: [],
      nextActions: [
        `Continue monitoring ${this.definition.department} KPIs and verify execution outcomes.`,
      ],
    };
  }
}

export function getZERRADirectorDefinition(
  directorId: ZERRADirectorId
): ZERRADirectorDefinition {
  return DIRECTOR_DEFINITIONS[
    directorId
  ];
}

export function listZERRADirectorDefinitions():
  ZERRADirectorDefinition[] {
  return Object.values(
    DIRECTOR_DEFINITIONS
  );
}

export function createZERRADirectorRole(
  directorId: ZERRADirectorId,
  input: ZERRADirectorInput = {}
): ZERRADirectorRole {
  return new ZERRADirectorRole(
    directorId,
    input
  );
}

export function isZERRADirectorId(
  value: unknown
): value is ZERRADirectorId {
  return (
    value === "prediction-director" ||
    value === "seo-director" ||
    value === "growth-director" ||
    value === "marketing-director" ||
    value === "payments-director"
  );
}
