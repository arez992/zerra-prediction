import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { saveCEOMemory } from "@/lib/ai-ceo/memoryEngine";
import {
  learningService,
} from "@/lib/zaos/learning";

type AdminIdentity = {
  uid: string;
  email?: string | null;
};

type ExecutionResult = {
  success: boolean;
  completed: boolean;
  message: string;
  data?: Record<string, unknown>;
};

function normalizeStatus(value: unknown) {
  return typeof value === "string"
    ? value.toLowerCase()
    : "";
}

async function runPaymentAudit(
  payload: Record<string, unknown>
): Promise<ExecutionResult> {
  const paymentsSnapshot = await adminDb
    .collection("payments")
    .get();

  const payments = paymentsSnapshot.docs.map(
    (document) => document.data()
  );

  const summary = {
    total: payments.length,
    completed: 0,
    pending: 0,
    failed: 0,
    unknown: 0,
  };

  for (const payment of payments) {
    const status = normalizeStatus(
      payment.status ||
        payment.paymentStatus ||
        payment.nowpayments?.payment_status
    );

    if (
      status === "completed" ||
      status === "finished" ||
      status === "confirmed"
    ) {
      summary.completed += 1;
    } else if (
      status === "pending" ||
      status === "waiting" ||
      status === "confirming"
    ) {
      summary.pending += 1;
    } else if (
      status === "failed" ||
      status === "expired" ||
      status === "refunded"
    ) {
      summary.failed += 1;
    } else {
      summary.unknown += 1;
    }
  }

  const processed =
    summary.completed + summary.failed;

  const successRate =
    processed === 0
      ? 0
      : Number(
          (
            (summary.completed / processed) *
            100
          ).toFixed(2)
        );

  return {
    success: true,
    completed: true,
    message:
      "Payment audit completed successfully.",
    data: {
      ...summary,
      successRate,
      originalPayload: payload,
    },
  };
}

async function createExecutionPlan(
  executionType: string,
  payload: Record<string, unknown>
): Promise<ExecutionResult> {
  return {
    success: true,
    completed: true,
    message:
      `Execution plan created for ${executionType}. ` +
      "A specialized executor will perform the final publishing or external action.",
    data: {
      executionType,
      payload,
      planCreated: true,
      requiresSpecializedExecutor: true,
    },
  };
}

async function executeByType(
  executionType: string | null,
  payload: Record<string, unknown>
): Promise<ExecutionResult> {
  switch (executionType) {
    case "payment-audit":
      return runPaymentAudit(payload);

    case "vip-conversion-review":
    case "registration-funnel-review":
    case "seo-metadata-optimization":
    case "create-country-landing-page":
    case "create-seo-content-cluster":
    case "growth-foundation-plan":
    case "controlled-user-acquisition":
      return createExecutionPlan(
        executionType,
        payload
      );

    default:
      return {
        success: false,
        completed: false,
        message:
          "No execution handler has been registered for this recommendation yet.",
        data: {
          executionType,
          payload,
        },
      };
  }
}

export async function approveCEORecommendation(
  recommendationId: string,
  admin: AdminIdentity
) {
  const recommendationRef = adminDb
    .collection("ceoRecommendations")
    .doc(recommendationId);

  const taskRef = adminDb
    .collection("ceoTasks")
    .doc();

  await adminDb.runTransaction(
    async (transaction) => {
      const recommendationDocument =
        await transaction.get(
          recommendationRef
        );

      if (!recommendationDocument.exists) {
        throw new Error(
          "CEO recommendation was not found"
        );
      }

      const recommendation =
        recommendationDocument.data() || {};

      if (recommendation.status !== "pending") {
        throw new Error(
          "Only pending recommendations can be approved"
        );
      }

      transaction.update(recommendationRef, {
        status: "approved",
        approvedBy:
          admin.email || admin.uid,
        approvedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      });

      transaction.set(taskRef, {
        recommendationId,
        title:
          recommendation.title ||
          "AI CEO Task",
        description:
          recommendation.description || "",
        executionType:
          recommendation.executionType ||
          null,
        executionPayload:
          recommendation.executionPayload ||
          {},
        status: "approved",
        assignedTo: "ai-ceo",
        approvedBy:
          admin.email || admin.uid,
        createdAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
        completedAt: null,
        result: null,
        error: null,
      });
    }
  );

  return {
    success: true,
    recommendationId,
    taskId: taskRef.id,
    status: "approved",
  };
}

export async function rejectCEORecommendation(
  recommendationId: string,
  admin: AdminIdentity,
  reason = "Rejected by owner"
) {
  const recommendationRef = adminDb
    .collection("ceoRecommendations")
    .doc(recommendationId);

  const recommendationDocument =
    await recommendationRef.get();

  if (!recommendationDocument.exists) {
    throw new Error(
      "CEO recommendation was not found"
    );
  }

  const recommendation =
    recommendationDocument.data() || {};

  if (
    recommendation.status !== "pending" &&
    recommendation.status !== "approved"
  ) {
    throw new Error(
      "This recommendation cannot be rejected in its current state"
    );
  }

  await recommendationRef.update({
    status: "rejected",
    rejectedBy:
      admin.email || admin.uid,
    rejectionReason: reason,
    rejectedAt:
      FieldValue.serverTimestamp(),
    updatedAt:
      FieldValue.serverTimestamp(),
  });

  await saveCEOMemory({
    recommendationId,
    lesson:
      `Recommendation rejected by owner. Reason: ${reason}`,
    success: false,
    roi: 0,
    before: {
      status: recommendation.status,
    },
    after: {
      status: "rejected",
    },
    source: "owner-decision",
  });

  return {
    success: true,
    recommendationId,
    status: "rejected",
    reason,
  };
}

export async function executeCEORecommendation(
  recommendationId: string,
  admin: AdminIdentity
) {
  const recommendationRef = adminDb
    .collection("ceoRecommendations")
    .doc(recommendationId);

  const recommendationDocument =
    await recommendationRef.get();

  if (!recommendationDocument.exists) {
    throw new Error(
      "CEO recommendation was not found"
    );
  }

  const recommendation =
    recommendationDocument.data() || {};

  if (recommendation.status !== "approved") {
    throw new Error(
      "Only approved recommendations can be executed"
    );
  }

  const taskSnapshot = await adminDb
    .collection("ceoTasks")
    .where(
      "recommendationId",
      "==",
      recommendationId
    )
    .limit(1)
    .get();

  const taskRef = taskSnapshot.empty
    ? adminDb.collection("ceoTasks").doc()
    : taskSnapshot.docs[0].ref;

  await recommendationRef.update({
    status: "executing",
    executedBy:
      admin.email || admin.uid,
    executedAt:
      FieldValue.serverTimestamp(),
    updatedAt:
      FieldValue.serverTimestamp(),
  });

  await taskRef.set(
    {
      recommendationId,
      title:
        recommendation.title ||
        "AI CEO Task",
      description:
        recommendation.description || "",
      executionType:
        recommendation.executionType ||
        null,
      executionPayload:
        recommendation.executionPayload ||
        {},
      status: "running",
      assignedTo: "ai-ceo",
      startedBy:
        admin.email || admin.uid,
      startedAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  try {
    const executionResult =
      await executeByType(
        recommendation.executionType ||
          null,
        recommendation.executionPayload ||
          {}
      );

    if (!executionResult.success) {
      await recommendationRef.update({
        status: "failed",
        result:
          executionResult.message,
        updatedAt:
          FieldValue.serverTimestamp(),
      });

      await taskRef.set(
        {
          status: "failed",
          error:
            executionResult.message,
          result:
            executionResult.data || {},
          completedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      await saveCEOMemory({
        recommendationId,
        lesson:
          executionResult.message,
        success: false,
        roi: 0,
        before: {
          status: "approved",
        },
        after: {
          status: "failed",
        },
        source: "execution-engine",
      });

      return {
        success: false,
        recommendationId,
        status: "failed",
        result: executionResult,
      };
    }

    await recommendationRef.update({
      status: "completed",
      result:
        executionResult.message,
      executionResult:
        executionResult.data || {},
      completedAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    await taskRef.set(
      {
        status: "completed",
        result: {
          message:
            executionResult.message,
          data:
            executionResult.data || {},
        },
        error: null,
        completedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    await saveCEOMemory({
      recommendationId,
      lesson:
        `Execution completed: ${executionResult.message}`,
      success: true,
      roi: 0,
      before: {
        status: "approved",
      },
      after: {
        status: "completed",
        result:
          executionResult.data || {},
      },
      source: "execution-engine",
    });

    return {
      success: true,
      recommendationId,
      taskId: taskRef.id,
      status: "completed",
      result: executionResult,
    };
  } catch (error: any) {
    const message =
      error?.message ||
      "AI CEO execution failed";

    await recommendationRef.update({
      status: "failed",
      result: message,
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    await taskRef.set(
      {
        status: "failed",
        error: message,
        completedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    throw error;
  }
}