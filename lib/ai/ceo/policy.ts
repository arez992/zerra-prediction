import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import type {
  CEOActionKey,
  CEODecision,
} from "./types";

export type CEOApprovalMode =
  | "manual"
  | "auto_low_risk"
  | "blocked";

export type CEOPolicyResult = {
  policyVersion: string;
  mode: CEOApprovalMode;
  eligibleForAutoApproval: boolean;
  reasons: string[];
  enabledActions: CEOActionKey[];
};

const POLICY_VERSION = "1.0.0";

const AUTO_APPROVAL_ACTIONS: CEOActionKey[] = [
  "investigateApi",
];

const BLOCKED_AUTO_APPROVAL_ACTIONS: CEOActionKey[] = [
  "publishPredictions",
  "publishArticles",
  "promoteVip",
  "pauseMarketing",
  "retrainAi",
];

async function getAutoApprovalSetting(): Promise<boolean> {
  try {
    const snapshot = await adminDb
      .collection("settings")
      .doc("site")
      .get();

    return snapshot.data()?.aiCeoAutoApprovalEnabled === true;
  } catch (error) {
    console.error("[AI_CEO_POLICY_SETTINGS_ERROR]", error);
    return false;
  }
}

function getEnabledActions(
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

export async function evaluateCEODecisionPolicy(
  decision: CEODecision,
  autoApprovalRequested = false
): Promise<CEOPolicyResult> {
  const reasons: string[] = [];
  const enabledActions = getEnabledActions(decision);
  const globalAutoApprovalEnabled =
    await getAutoApprovalSetting();

  if (!globalAutoApprovalEnabled) {
    reasons.push(
      "AI CEO auto-approval is disabled in site settings."
    );
  }

  if (!autoApprovalRequested) {
    reasons.push(
      "Auto-approval was not requested for this decision run."
    );
  }

  if (decision.confidence < 90) {
    reasons.push(
      "Decision confidence is below the 90% auto-approval threshold."
    );
  }

  if (decision.overallHealth === "Critical") {
    reasons.push(
      "Critical system health requires human review."
    );
  }

  const severeRisks = decision.risks.filter(
    (risk) =>
      risk.level === "High" ||
      risk.level === "Critical"
  );

  if (severeRisks.length > 0) {
    reasons.push(
      "High or critical risks are present."
    );
  }

  if (enabledActions.length === 0) {
    reasons.push(
      "No enabled action exists to auto-approve."
    );
  }

  const blockedActions = enabledActions.filter((action) =>
    BLOCKED_AUTO_APPROVAL_ACTIONS.includes(action)
  );

  if (blockedActions.length > 0) {
    reasons.push(
      `These actions always require manual approval: ${blockedActions.join(", ")}.`
    );
  }

  const unsupportedActions = enabledActions.filter(
    (action) => !AUTO_APPROVAL_ACTIONS.includes(action)
  );

  if (unsupportedActions.length > 0) {
    reasons.push(
      `These actions are not in the low-risk auto-approval allowlist: ${unsupportedActions.join(", ")}.`
    );
  }

  const eligibleForAutoApproval =
    globalAutoApprovalEnabled &&
    autoApprovalRequested &&
    decision.confidence >= 90 &&
    decision.overallHealth !== "Critical" &&
    severeRisks.length === 0 &&
    enabledActions.length > 0 &&
    blockedActions.length === 0 &&
    unsupportedActions.length === 0;

  return {
    policyVersion: POLICY_VERSION,
    mode: eligibleForAutoApproval
      ? "auto_low_risk"
      : "manual",
    eligibleForAutoApproval,
    reasons:
      reasons.length > 0
        ? reasons
        : [
            "All low-risk auto-approval policy requirements were satisfied.",
          ],
    enabledActions,
  };
}