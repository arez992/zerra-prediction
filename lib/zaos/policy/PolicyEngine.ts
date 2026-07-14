import {
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyMatch,
  PolicyRule,
  PolicySet,
  createPolicyEvaluationResult,
  normalizePolicyConfidence,
} from "./PolicyTypes";

export const ZAOS_POLICY_ENGINE_VERSION = "1.0.0";

export function evaluatePolicy(
  policySet: PolicySet,
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const matches: PolicyMatch[] = [];
  const reasons: string[] = [];

  const confidence = normalizePolicyConfidence(input.confidence);

  let allowed = true;
  let approvalMode: "manual" | "auto_low_risk" | "blocked" =
    "manual";

  for (const rule of policySet.rules) {
    if (!rule.enabled) {
      continue;
    }

    const matched = matchesRule(rule, input);

    if (!matched) {
      continue;
    }

    matches.push({
      policyId: policySet.id,
      ruleId: rule.id,
      matched: true,
      effect: rule.effect,
      reason: rule.name,
    });

    reasons.push(rule.description);

    switch (rule.effect) {
      case "deny":
        allowed = false;
        approvalMode = "blocked";
        break;

      case "require_approval":
        approvalMode = "manual";
        break;

      case "allow":
        if (
          rule.riskLevel === "low" &&
          confidence >=
            (rule.minimumConfidence ?? 0)
        ) {
          approvalMode = "auto_low_risk";
        }
        break;
    }
  }

  return createPolicyEvaluationResult({
    allowed,
    approvalMode,
    riskLevel: input.riskLevel,
    matchedPolicies: matches,
    reasons,
    policyVersion: policySet.version,
  });
}

function matchesRule(
  rule: PolicyRule,
  input: PolicyEvaluationInput
): boolean {
  if (
    rule.roleIds.length > 0 &&
    !rule.roleIds.includes(input.roleId)
  ) {
    return false;
  }

  if (
    rule.actionIds.length > 0 &&
    !rule.actionIds.includes(input.actionId)
  ) {
    return false;
  }

  if (
    rule.minimumConfidence !== null &&
    normalizePolicyConfidence(
      input.confidence
    ) < rule.minimumConfidence
  ) {
    return false;
  }

  if (
    rule.riskLevel !== input.riskLevel
  ) {
    return false;
  }

  if (
    rule.financialImpact &&
    !input.financialImpact
  ) {
    return false;
  }

  if (
    rule.publicImpact &&
    !input.publicImpact
  ) {
    return false;
  }

  if (
    rule.destructiveImpact &&
    !input.destructiveImpact
  ) {
    return false;
  }

  return true;
}

export function canAutoApprove(
  result: PolicyEvaluationResult
): boolean {
  return (
    result.allowed &&
    result.canAutoApprove
  );
}

export function requiresManualApproval(
  result: PolicyEvaluationResult
): boolean {
  return (
    result.allowed &&
    result.requiresHumanApproval
  );
}

export function isBlocked(
  result: PolicyEvaluationResult
): boolean {
  return !result.allowed;
}