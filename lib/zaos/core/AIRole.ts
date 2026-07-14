export const ZAOS_AI_ROLE_VERSION = "1.0.0";

export type AIRoleLevel = "ceo" | "director" | "worker";
export type AIRoleStatus = "active" | "paused" | "degraded" | "disabled";

export type AIRoleAuthority =
  | "observe"
  | "analyze"
  | "recommend"
  | "decide"
  | "approve_low_risk"
  | "delegate"
  | "execute_internal"
  | "verify"
  | "learn"
  | "report";

export type AIRoleCapability = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

export type AIRoleKPI = {
  id: string;
  name: string;
  description: string;
  unit: "count" | "percent" | "currency" | "duration" | "score" | "boolean";
  target: number | boolean | null;
  current: number | boolean | null;
};

export type AIRoleIdentity = {
  id: string;
  name: string;
  version: string;
  level: AIRoleLevel;
  status: AIRoleStatus;
  objective: string;
  description: string;
  authority: AIRoleAuthority[];
  capabilities: AIRoleCapability[];
  kpis: AIRoleKPI[];
  policyIds: string[];
  memoryNamespace: string;
  reportTypes: string[];
};

export type AIObservation = {
  id: string;
  roleId: string;
  observedAt: string;
  source: string;
  data: Record<string, unknown>;
  evidence: string[];
};

export type AIAnalysis = {
  id: string;
  roleId: string;
  createdAt: string;
  summary: string;
  confidence: number;
  findings: string[];
  missingData: string[];
  evidence: string[];
};

export type AIRecommendation = {
  id: string;
  roleId: string;
  createdAt: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  expectedImpact: string;
  evidence: string[];
  requiresApproval: boolean;
};

export type AIDecision = {
  id: string;
  roleId: string;
  createdAt: string;
  title: string;
  summary: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  selectedRecommendationIds: string[];
  evidence: string[];
  requiresApproval: boolean;
};

export type AIPolicyEvaluation = {
  decisionId: string;
  evaluatedAt: string;
  allowed: boolean;
  approvalMode: "manual" | "auto_low_risk" | "blocked";
  policyVersion: string;
  reasons: string[];
};

export type AIDelegation = {
  id: string;
  decisionId: string;
  delegatedByRoleId: string;
  delegatedToRoleId: string;
  taskType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AIExecutionResult = {
  success: boolean;
  completed: boolean;
  message: string;
  data?: Record<string, unknown>;
};

export type AIVerificationResult = {
  verified: boolean;
  verifiedAt: string;
  expectedOutcome: string;
  actualOutcome: string;
  kpiChanges: Record<string, number | boolean | null>;
  issues: string[];
};

export type AILearning = {
  id: string;
  roleId: string;
  decisionId: string;
  createdAt: string;
  success: boolean;
  lesson: string;
  strategyChange: string | null;
  evidence: string[];
};

export type AIImprovement = {
  id: string;
  roleId: string;
  createdAt: string;
  objective: string;
  changes: string[];
  expectedKPIImpact: Record<string, number | boolean | null>;
  requiresApproval: boolean;
};

export type AIReport = {
  id: string;
  roleId: string;
  createdAt: string;
  period: "daily" | "weekly" | "monthly" | "custom";
  title: string;
  summary: string;
  metrics: Record<string, number | string | boolean | null>;
  achievements: string[];
  failures: string[];
  lessons: string[];
  nextActions: string[];
};

export type AIRoleContext = {
  runId: string;
  roleId: string;
  startedAt: string;
  requestedBy: string;
  instruction?: string;
  metadata?: Record<string, unknown>;
};

export interface AIRole {
  readonly identity: AIRoleIdentity;

  observe(context: AIRoleContext): Promise<AIObservation[]>;
  analyze(
    observations: AIObservation[],
    context: AIRoleContext
  ): Promise<AIAnalysis>;
  recommend(
    analysis: AIAnalysis,
    context: AIRoleContext
  ): Promise<AIRecommendation[]>;
  decide(
    recommendations: AIRecommendation[],
    analysis: AIAnalysis,
    context: AIRoleContext
  ): Promise<AIDecision>;
  evaluatePolicy(
    decision: AIDecision,
    context: AIRoleContext
  ): Promise<AIPolicyEvaluation>;
  delegate(
    decision: AIDecision,
    policy: AIPolicyEvaluation,
    context: AIRoleContext
  ): Promise<AIDelegation[]>;
  execute(
    delegation: AIDelegation,
    context: AIRoleContext
  ): Promise<AIExecutionResult>;
  verify(
    decision: AIDecision,
    executionResults: AIExecutionResult[],
    context: AIRoleContext
  ): Promise<AIVerificationResult>;
  learn(
    decision: AIDecision,
    verification: AIVerificationResult,
    context: AIRoleContext
  ): Promise<AILearning>;
  improve(
    learning: AILearning,
    context: AIRoleContext
  ): Promise<AIImprovement | null>;
  report(context: AIRoleContext): Promise<AIReport>;
}

export function isAIRole(value: unknown): value is AIRole {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AIRole>;

  return (
    typeof candidate.identity === "object" &&
    typeof candidate.observe === "function" &&
    typeof candidate.analyze === "function" &&
    typeof candidate.recommend === "function" &&
    typeof candidate.decide === "function" &&
    typeof candidate.evaluatePolicy === "function" &&
    typeof candidate.delegate === "function" &&
    typeof candidate.execute === "function" &&
    typeof candidate.verify === "function" &&
    typeof candidate.learn === "function" &&
    typeof candidate.improve === "function" &&
    typeof candidate.report === "function"
  );
}