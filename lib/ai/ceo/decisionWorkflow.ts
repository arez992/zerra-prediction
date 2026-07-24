import "server-only";

import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import {
  createZERRADirectorRole,
  type ZERRADirectorId,
} from "@/lib/ai/directors/ZERRADirectorRole";
import {
  runDecisionOrchestrator,
} from "@/lib/zaos/orchestration/DecisionOrchestrator";
import type {
  AIDelegation,
  AIRoleContext,
} from "@/lib/zaos";
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


type ActionExecutionRoute = {
  directorId: ZERRADirectorId;
  executionType: string;
};

const ACTION_EXECUTION_ROUTES: Record<
  CEOActionKey,
  ActionExecutionRoute
> = {
  publishPredictions: {
    directorId: "prediction-director",
    executionType: "generate-predictions",
  },
  publishArticles: {
    directorId: "seo-director",
    executionType: "create-seo-content-cluster",
  },
  promoteVip: {
    directorId: "growth-director",
    executionType: "vip-conversion-review",
  },
  pauseMarketing: {
    directorId: "marketing-director",
    executionType: "marketing-review",
  },
  improveSeo: {
    directorId: "seo-director",
    executionType: "seo-metadata-optimization",
  },
  retrainAi: {
    directorId: "prediction-director",
    executionType: "prediction-model-review",
  },
  investigateApi: {
    directorId: "payments-director",
    executionType: "payment-audit",
  },
};

const CEO_ACTION_KEYS = new Set<CEOActionKey>(
  Object.keys(ACTION_EXECUTION_ROUTES) as CEOActionKey[]
);

type TaskExecutionSummary = {
  taskId: string;
  actionKey: CEOActionKey | null;
  status: "completed" | "failed";
  directorId: ZERRADirectorId | null;
  executionType: string | null;
  runId: string | null;
  message: string;
  verified: boolean;
};

function isCEOActionKey(
  value: unknown
): value is CEOActionKey {
  return (
    typeof value === "string" &&
    CEO_ACTION_KEYS.has(value as CEOActionKey)
  );
}

async function executeQueuedDecisionTask(input: {
  decisionId: string;
  taskId: string;
  actionKey: CEOActionKey;
  decision: DecisionDocument;
  actor: ActorIdentity;
}): Promise<TaskExecutionSummary> {
  const route =
    ACTION_EXECUTION_ROUTES[input.actionKey];

  const action =
    input.decision.actions?.[input.actionKey];

  const runId =
    randomUUID();

  const ceoDelegation: AIDelegation = {
    id:
      `${runId}-ceo-to-director`,
    decisionId:
      input.decisionId,
    delegatedByRoleId:
      "zerra-ai-ceo",
    delegatedToRoleId:
      route.directorId,
    taskType:
      input.actionKey,
    payload: {
      actionKey:
        input.actionKey,
      title:
        ACTION_LABELS[input.actionKey],
      reason:
        action?.reason || "",
      requiresApproval:
        action?.requiresApproval === true,
      executionType:
        route.executionType,
      sourceDecisionId:
        input.decisionId,
      sourceTaskId:
        input.taskId,
      ownerApproved:
        true,
    },
    createdAt:
      new Date().toISOString(),
  };

  const context: AIRoleContext = {
    runId,
    roleId:
      route.directorId,
    startedAt:
      new Date().toISOString(),
    requestedBy:
      actorName(input.actor),
    instruction:
      `Execute owner-approved AI CEO action ${input.actionKey} through ${route.directorId}.`,
    metadata: {
      source:
        "ceo-decision-workflow",
      decisionId:
        input.decisionId,
      taskId:
        input.taskId,
      actionKey:
        input.actionKey,
      executionType:
        route.executionType,
      ownerApproved:
        true,
    },
  };

  const director =
    createZERRADirectorRole(
      route.directorId,
      {
        delegation:
          ceoDelegation,
        instruction:
          context.instruction,
        evidence: {
          decisionId:
            input.decisionId,
          taskId:
            input.taskId,
          ownerApproved:
            true,
        },
      }
    );

  const orchestration =
    await runDecisionOrchestrator(
      director,
      context,
      {
        autoExecuteAllowedDelegations:
          true,
        stopAfterPolicyReview:
          false,
        continueWhenNoDelegations:
          false,
      }
    );

  const verified =
    orchestration.success &&
    orchestration.verification
      ?.verified === true;

  const failedExecution =
    orchestration.executionResults.find(
      (result) =>
        !result.success ||
        !result.completed
    );

  const message =
    verified
      ? (
          orchestration.executionResults[
            orchestration.executionResults.length - 1
          ]?.message ||
          `${route.directorId} execution completed and verified.`
        )
      : (
          failedExecution?.message ||
          orchestration.error ||
          orchestration.verification
            ?.issues?.join(" ") ||
          `${route.directorId} execution could not be verified.`
        );

  return {
    taskId:
      input.taskId,
    actionKey:
      input.actionKey,
    status:
      verified
        ? "completed"
        : "failed",
    directorId:
      route.directorId,
    executionType:
      route.executionType,
    runId,
    message,
    verified,
  };
}

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

  const claim =
    await adminDb.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            decisionRef
          );

        if (!snapshot.exists) {
          throw new Error(
            "AI CEO decision was not found"
          );
        }

        const decision =
          snapshot.data() as DecisionDocument;

        if (
          decision.status !== "approved"
        ) {
          throw new Error(
            "Only approved AI CEO decisions can be executed"
          );
        }

        const rawTaskIds =
          (
            decision as DecisionDocument & {
              taskIds?: unknown;
            }
          ).taskIds;

        const taskIds =
          Array.isArray(rawTaskIds)
            ? rawTaskIds.filter(
                (
                  value
                ): value is string =>
                  typeof value ===
                    "string" &&
                  value.length >
                    0
              )
            : [];

        for (
          const taskId
          of taskIds
        ) {
          transaction.set(
            adminDb
              .collection(
                "ceoTasks"
              )
              .doc(
                taskId
              ),
            {
              status:
                "queued",
              queuedBy:
                actorName(
                  actor
                ),
              queuedAt:
                FieldValue.serverTimestamp(),
              updatedAt:
                FieldValue.serverTimestamp(),
            },
            {
              merge:
                true,
            }
          );
        }

        transaction.update(
          decisionRef,
          {
            status:
              taskIds.length > 0
                ? "executing"
                : "completed",
            executedBy:
              actorName(
                actor
              ),
            executedAt:
              FieldValue.serverTimestamp(),
            completedAt:
              taskIds.length === 0
                ? FieldValue.serverTimestamp()
                : null,
            executionResult: {
              queuedTasks:
                taskIds.length,
              completedTasks:
                taskIds.length === 0
                  ? 0
                  : null,
              failedTasks:
                0,
              message:
                taskIds.length > 0
                  ? "Approved AI CEO tasks were claimed for Director execution."
                  : "No enabled AI CEO actions required execution.",
            },
            updatedAt:
              FieldValue.serverTimestamp(),
          }
        );

        return {
          taskIds,
          decision,
        };
      }
    );

  if (
    claim.taskIds.length ===
    0
  ) {
    await adminDb
      .collection(
        "activityLogs"
      )
      .add({
        type:
          "ai-ceo-decision",
        actor:
          actorName(
            actor
          ),
        message:
          "AI CEO decision completed with no executable tasks",
        targetId:
          decisionId,
        metadata: {
          taskIds:
            [],
        },
        createdAt:
          new Date()
            .toISOString(),
      });

    return {
      success:
        true,
      decisionId,
      status:
        "completed",
      queuedTasks:
        0,
      completedTasks:
        0,
      failedTasks:
        0,
      taskIds:
        [],
      taskResults:
        [],
    };
  }

  const taskResults:
    TaskExecutionSummary[] =
    [];

  for (
    const taskId
    of claim.taskIds
  ) {
    const taskRef =
      adminDb
        .collection(
          "ceoTasks"
        )
        .doc(
          taskId
        );

    try {
      const taskSnapshot =
        await taskRef.get();

      const taskData =
        taskSnapshot.exists
          ? taskSnapshot.data() ||
            {}
          : {};

      const actionKey =
        taskData.actionKey;

      if (
        !isCEOActionKey(
          actionKey
        )
      ) {
        const message =
          "Queued AI CEO task has no supported action key.";

        await taskRef.set(
          {
            decisionId,
            status:
              "failed",
            error:
              message,
            completedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge:
              true,
          }
        );

        taskResults.push({
          taskId,
          actionKey:
            null,
          status:
            "failed",
          directorId:
            null,
          executionType:
            null,
          runId:
            null,
          message,
          verified:
            false,
        });

        continue;
      }

      const route =
        ACTION_EXECUTION_ROUTES[
          actionKey
        ];

      await taskRef.set(
        {
          status:
            "running",
          directorId:
            route.directorId,
          executionType:
            route.executionType,
          startedBy:
            actorName(
              actor
            ),
          startedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
          error:
            null,
        },
        {
          merge:
            true,
        }
      );

      const result =
        await executeQueuedDecisionTask({
          decisionId,
          taskId,
          actionKey,
          decision:
            claim.decision,
          actor,
        });

      await taskRef.set(
        {
          status:
            result.status,
          directorId:
            result.directorId,
          executionType:
            result.executionType,
          directorRunId:
            result.runId,
          result: {
            message:
              result.message,
            verified:
              result.verified,
          },
          error:
            result.status ===
            "failed"
              ? result.message
              : null,
          completedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge:
            true,
        }
      );

      taskResults.push(
        result
      );
    } catch (
      error
    ) {
      const message =
        error instanceof Error
          ? error.message
          : "AI CEO task execution failed.";

      await taskRef.set(
        {
          decisionId,
          status:
            "failed",
          error:
            message,
          completedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge:
            true,
        }
      );

      taskResults.push({
        taskId,
        actionKey:
          null,
        status:
          "failed",
        directorId:
          null,
        executionType:
          null,
        runId:
          null,
        message,
        verified:
          false,
      });
    }
  }

  const completedTasks =
    taskResults.filter(
      (result) =>
        result.status ===
        "completed"
    ).length;

  const failedTasks =
    taskResults.length -
    completedTasks;

  const finalStatus =
    failedTasks === 0
      ? "completed"
      : "failed";

  await decisionRef.update({
    status:
      finalStatus,
    executionResult: {
      queuedTasks:
        claim.taskIds.length,
      completedTasks,
      failedTasks,
      taskResults:
        taskResults.map(
          (result) => ({
            taskId:
              result.taskId,
            actionKey:
              result.actionKey,
            status:
              result.status,
            directorId:
              result.directorId,
            executionType:
              result.executionType,
            runId:
              result.runId,
            verified:
              result.verified,
            message:
              result.message,
          })
        ),
      message:
        failedTasks === 0
          ? "All approved AI CEO tasks completed through their registered Directors and executors."
          : `${failedTasks} AI CEO task(s) failed Director verification.`,
    },
    completedAt:
      failedTasks === 0
        ? FieldValue.serverTimestamp()
        : null,
    failedAt:
      failedTasks > 0
        ? FieldValue.serverTimestamp()
        : null,
    updatedAt:
      FieldValue.serverTimestamp(),
  });

  await adminDb
    .collection(
      "activityLogs"
    )
    .add({
      type:
        "ai-ceo-decision",
      actor:
        actorName(
          actor
        ),
      message:
        failedTasks === 0
          ? "AI CEO decision execution completed through Directors"
          : "AI CEO decision execution completed with Director task failures",
      targetId:
        decisionId,
      metadata: {
        taskIds:
          claim.taskIds,
        completedTasks,
        failedTasks,
        taskResults,
      },
      createdAt:
        new Date()
          .toISOString(),
    });

  return {
    success:
      failedTasks === 0,
    decisionId,
    status:
      finalStatus,
    queuedTasks:
      claim.taskIds.length,
    completedTasks,
    failedTasks,
    taskIds:
      claim.taskIds,
    taskResults,
  };
}
