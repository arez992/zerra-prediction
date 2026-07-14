import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import type {
  CEOActionKey,
  CEODecision,
} from "./types";
import type {
  CEOApprovalMode,
  CEOPolicyResult,
} from "./policy";

type ActorIdentity = {
  uid: string;
  email?: string | null;
};

type DecisionDocument = CEODecision & {
  status?: string;
  policy?: CEOPolicyResult;
};

const ACTION_LABELS: Record<CEOActionKey, string> = {
  publishPredictions: "Review prediction publication",
  publishArticles: "Review article publication",
  promoteVip: "Review VIP promotion",
  pauseMarketing: "Review marketing pause",
  improveSeo: "Improve SEO",
  retrainAi: "Review AI retraining",
  investigateApi: "Investigate API health",
};

function actorName(actor: ActorIdentity): string {
  return actor.email || actor.uid;
}

function getEnabledActions(
  decision: DecisionDocument
): CEOActionKey[] {
  return (
    Object.entries(decision.actions || {}) as Array<
      [CEOActionKey, { enabled?: boolean }]
    >
  )
    .filter(([, action]) => action?.enabled === true)
    .map(([key]) => key);
}

export async function applyCEODecisionPolicy(
  decisionId: string,
  policy: CEOPolicyResult
) {
  await adminDb
    .collection("ceoDecisions")
    .doc(decisionId)
    .set(
      {
        policy,
        approvalMode: policy.mode,
        autoApprovalEligible:
          policy.eligibleForAutoApproval,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export async function approveCEODecision(
  decisionId: string,
  actor: ActorIdentity,
  mode: CEOApprovalMode = "manual"
) {
  const decisionRef = adminDb
    .collection("ceoDecisions")
    .doc(decisionId);

  const taskCollection = adminDb.collection("ceoTasks");

  const result = await adminDb.runTransaction(
    async (transaction) => {
      const snapshot = await transaction.get(decisionRef);

      if (!snapshot.exists) {
        throw new Error("AI CEO decision was not found");
      }

      const decision =
        snapshot.data() as DecisionDocument;

      if (decision.status !== "pending") {
        throw new Error(
          "Only pending AI CEO decisions can be approved"
        );
      }

      if (
        mode === "auto_low_risk" &&
        decision.policy?.eligibleForAutoApproval !== true
      ) {
        throw new Error(
          "This AI CEO decision is not eligible for auto-approval"
        );
      }

      const enabledActions = getEnabledActions(decision);
      const taskIds: string[] = [];

      for (const actionKey of enabledActions) {
        const taskRef = taskCollection.doc();
        taskIds.push(taskRef.id);

        transaction.set(taskRef, {
          decisionId,
          recommendationId: null,
          actionKey,
          title: ACTION_LABELS[actionKey],
          description:
            decision.actions[actionKey]?.reason || "",
          status: "approved",
          assignedTo: "ai-ceo",
          approvalMode: mode,
          approvedBy: actorName(actor),
          approvedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          completedAt: null,
          result: null,
          error: null,
        });
      }

      transaction.update(decisionRef, {
        status: "approved",
        approvalMode: mode,
        approvedBy: actorName(actor),
        approvedAt: FieldValue.serverTimestamp(),
        taskIds,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        taskIds,
        enabledActions,
      };
    }
  );

  await adminDb.collection("activityLogs").add({
    type: "ai-ceo-decision",
    actor: actorName(actor),
    message:
      mode === "auto_low_risk"
        ? "AI CEO decision auto-approved by policy"
        : "AI CEO decision approved by admin",
    targetId: decisionId,
    metadata: {
      mode,
      taskIds: result.taskIds,
      enabledActions: result.enabledActions,
    },
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    decisionId,
    status: "approved",
    approvalMode: mode,
    taskIds: result.taskIds,
  };
}

export async function rejectCEODecision(
  decisionId: string,
  actor: ActorIdentity,
  reason = "Rejected by owner"
) {
  const decisionRef = adminDb
    .collection("ceoDecisions")
    .doc(decisionId);

  const snapshot = await decisionRef.get();

  if (!snapshot.exists) {
    throw new Error("AI CEO decision was not found");
  }

  const decision = snapshot.data() || {};

  if (
    decision.status !== "pending" &&
    decision.status !== "approved"
  ) {
    throw new Error(
      "This AI CEO decision cannot be rejected in its current state"
    );
  }

  await decisionRef.update({
    status: "rejected",
    rejectedBy: actorName(actor),
    rejectionReason: reason,
    rejectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await adminDb.collection("activityLogs").add({
    type: "ai-ceo-decision",
    actor: actorName(actor),
    message: "AI CEO decision rejected",
    targetId: decisionId,
    metadata: {
      reason,
      previousStatus: decision.status || null,
    },
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    decisionId,
    status: "rejected",
    reason,
  };
}

export async function executeCEODecision(
  decisionId: string,
  actor: ActorIdentity
) {
  const decisionRef = adminDb
    .collection("ceoDecisions")
    .doc(decisionId);

  const snapshot = await decisionRef.get();

  if (!snapshot.exists) {
    throw new Error("AI CEO decision was not found");
  }

  const decision = snapshot.data() || {};

  if (decision.status !== "approved") {
    throw new Error(
      "Only approved AI CEO decisions can be executed"
    );
  }

  const taskIds = Array.isArray(decision.taskIds)
    ? decision.taskIds.filter(
        (value: unknown): value is string =>
          typeof value === "string" && value.length > 0
      )
    : [];

  const batch = adminDb.batch();

  for (const taskId of taskIds) {
    batch.set(
      adminDb.collection("ceoTasks").doc(taskId),
      {
        status: "queued",
        queuedBy: actorName(actor),
        queuedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  batch.update(decisionRef, {
    status: "executing",
    executedBy: actorName(actor),
    executedAt: FieldValue.serverTimestamp(),
    executionResult: {
      queuedTasks: taskIds.length,
      message:
        "Approved AI CEO tasks were queued for specialized executors.",
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  await adminDb.collection("activityLogs").add({
    type: "ai-ceo-decision",
    actor: actorName(actor),
    message: "AI CEO decision execution queued",
    targetId: decisionId,
    metadata: {
      taskIds,
    },
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    decisionId,
    status: "executing",
    queuedTasks: taskIds.length,
    taskIds,
  };
}