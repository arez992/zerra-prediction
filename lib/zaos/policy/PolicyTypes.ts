export const ZAOS_POLICY_TYPES_VERSION = "1.0.0";

export type PolicyRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type PolicyApprovalMode =
  | "manual"
  | "auto_low_risk"
  | "blocked";

export type PolicyEffect =
  | "allow"
  | "deny"
  | "require_approval";

export type PolicyScope =
  | "global"
  | "ceo"
  | "director"
  | "worker"
  | "capability"
  | "action";

export type PolicyConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "includes"
  | "not_includes"
  | "exists"
  | "not_exists";

export type PolicyConditionValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[];

export type PolicyCondition = {
  field: string;
  operator: PolicyConditionOperator;
  value?: PolicyConditionValue;
};

export type PolicyRule = {
  id: string;
  name: string;
  description: string;

  scope: PolicyScope;
  effect: PolicyEffect;

  actionIds: string[];
  roleIds: string[];
  capabilityIds: string[];

  riskLevel: PolicyRiskLevel;
  reversible: boolean;
  publicImpact: boolean;
  financialImpact: boolean;
  destructiveImpact: boolean;

  minimumConfidence: number | null;

  conditions: PolicyCondition[];

  enabled: boolean;
  priority: number;

  createdAt: string;
  updatedAt: string;
};

export type PolicyEvaluationInput = {
  policyId: string;
  roleId: string;
  actionId: string;
  confidence: number;
  riskLevel: PolicyRiskLevel;

  reversible: boolean;
  publicImpact: boolean;
  financialImpact: boolean;
  destructiveImpact: boolean;

  context: Record<string, unknown>;
};

export type PolicyMatch = {
  policyId: string;
  ruleId: string;
  matched: boolean;
  effect: PolicyEffect;
  reason: string;
};

export type PolicyEvaluationResult = {
  version: string;

  evaluatedAt: string;

  allowed: boolean;
  approvalMode: PolicyApprovalMode;

  riskLevel: PolicyRiskLevel;

  matchedPolicies: PolicyMatch[];

  reasons: string[];

  requiresHumanApproval: boolean;
  canAutoApprove: boolean;

  policyVersion: string;
};

export type PolicyOverride = {
  id: string;

  policyId: string;
  roleId: string;
  actionId: string;

  grantedBy: string;
  reason: string;

  createdAt: string;
  expiresAt: string | null;

  active: boolean;
};

export type PolicySet = {
  id: string;
  name: string;
  description: string;
  version: string;

  rules: PolicyRule[];
  overrides: PolicyOverride[];

  enabled: boolean;

  createdAt: string;
  updatedAt: string;
};

export function normalizePolicyConfidence(
  value: unknown
): number {
  const confidence = Number(value);

  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.min(100, Math.max(0, confidence));
}

export function isPolicyRiskLevel(
  value: unknown
): value is PolicyRiskLevel {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  );
}

export function isPolicyApprovalMode(
  value: unknown
): value is PolicyApprovalMode {
  return (
    value === "manual" ||
    value === "auto_low_risk" ||
    value === "blocked"
  );
}

export function createPolicyEvaluationResult(
  input: {
    allowed: boolean;
    approvalMode: PolicyApprovalMode;
    riskLevel: PolicyRiskLevel;
    matchedPolicies?: PolicyMatch[];
    reasons?: string[];
    policyVersion?: string;
  }
): PolicyEvaluationResult {
  return {
    version: ZAOS_POLICY_TYPES_VERSION,

    evaluatedAt: new Date().toISOString(),

    allowed: input.allowed,
    approvalMode: input.approvalMode,

    riskLevel: input.riskLevel,

    matchedPolicies:
      input.matchedPolicies ?? [],

    reasons:
      input.reasons ?? [],

    requiresHumanApproval:
      input.approvalMode === "manual",

    canAutoApprove:
      input.allowed &&
      input.approvalMode === "auto_low_risk",

    policyVersion:
      input.policyVersion ??
      ZAOS_POLICY_TYPES_VERSION,
  };
}

export function isPolicyOverrideActive(
  override: PolicyOverride
): boolean {
  if (!override.active) {
    return false;
  }

  if (!override.expiresAt) {
    return true;
  }

  const expiry =
    new Date(override.expiresAt).getTime();

  return (
    Number.isFinite(expiry) &&
    expiry > Date.now()
  );
}
