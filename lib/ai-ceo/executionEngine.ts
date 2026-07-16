import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { saveCEOMemory } from "@/lib/ai-ceo/memoryEngine";
import {
  learningService,
} from "@/lib/zaos/learning";
import {
  executeRegisteredHandler,
} from "@/lib/ai-ceo/execution/registry";
import {
  saveRecommendationImpact,
} from "@/src/lib/ai/ceo/impact/saveImpact";
import type {
  RecommendationImpact,
} from "@/src/lib/ai/ceo/impact/types";

type AdminIdentity = {
  uid: string;
  email?: string | null;
};

type ImpactMetrics =
  RecommendationImpact["expectedImpact"];

function asRecord(
  value: unknown
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readFiniteNumber(
  value: unknown
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function readPercentage(
  value: unknown,
  fallback = 0
): number {
  const parsed =
    readFiniteNumber(value);

  if (parsed === undefined) {
    return fallback;
  }

  return Math.min(
    100,
    Math.max(0, parsed)
  );
}

function readImpactMetrics(
  value: unknown
): ImpactMetrics {
  const source = asRecord(value);
  const metrics: ImpactMetrics = {};

  const keys = [
    "revenue",
    "users",
    "seo",
    "vipConversion",
    "predictionAccuracy",
  ] as const;

  for (const key of keys) {
    const parsed =
      readFiniteNumber(source[key]);

    if (parsed !== undefined) {
      metrics[key] = parsed;
    }
  }

  return metrics;
}

function getExpectedImpact(
  recommendation: Record<
    string,
    unknown
  >
): ImpactMetrics {
  const payload =
    asRecord(
      recommendation.executionPayload
    );

  return readImpactMetrics(
    recommendation.expectedImpact ??
      payload.expectedImpact
  );
}

function getActualImpact(
  executionData:
    | Record<string, unknown>
    | undefined
): ImpactMetrics {
  const data =
    executionData || {};

  return readImpactMetrics(
    data.actualImpact ??
      data.impact
  );
}

async function safelySaveImpact(
  input: RecommendationImpact
) {
  try {
    return await saveRecommendationImpact(
      input
    );
  } catch (error) {
    console.error(
      "[CEO_RECOMMENDATION_IMPACT_SAVE_ERROR]",
      {
        recommendationId:
          input.recommendationId,
        error:
          error instanceof Error
            ? error.message
            : "Unknown impact storage error",
      }
    );

    return null;
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

  const executionStartedAt =
    Date.now();

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
    const executionType =
      typeof recommendation.executionType ===
        "string"
        ? recommendation.executionType
            .trim()
            .toLowerCase()
        : "";

    const executionPayload =
      asRecord(
        recommendation.executionPayload
      );

    const executionResult =
      await executeRegisteredHandler({
        recommendationId,
        executionType,
        payload:
          executionPayload,
        recommendation,
        metadata: {
          taskId:
            taskRef.id,
          executedBy:
            admin.email ||
            admin.uid,
          recommendationSource:
            recommendation.source ||
            null,
        },
      });

    const executionDurationSeconds =
      Math.max(
        0,
        Math.round(
          (
            Date.now() -
            executionStartedAt
          ) / 1000
        )
      );

    const expectedImpact =
      getExpectedImpact(
        recommendation
      );

    const actualImpact =
      getActualImpact(
        executionResult.data
      );

    const confidenceBefore =
      readPercentage(
        recommendation.confidence ??
          recommendation.confidenceScore,
        0
      );

    if (!executionResult.success) {
      const savedImpact =
        await safelySaveImpact({
          recommendationId,
          measuredAt:
            new Date().toISOString(),
          expectedImpact,
          actualImpact,
          confidenceBefore,
          confidenceAfter: 0,
          roi: 0,
          executionDurationSeconds,
          success: false,
          notes: [
            executionResult.message,
          ],
          metadata: {
            taskId: taskRef.id,
            executionType:
              recommendation.executionType ||
              null,
            executionData:
              executionResult.data ||
              {},
            executedBy:
              admin.email ||
              admin.uid,
          },
        });

      await recommendationRef.update({
        status: "failed",
        result:
          executionResult.message,
        impactId:
          savedImpact?.id || null,
        impactScore:
          savedImpact?.impactScore ?? 0,
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
          impactId:
            savedImpact?.id || null,
          impactScore:
            savedImpact?.impactScore ?? 0,
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
        roi:
          savedImpact?.roi ?? 0,
        before: {
          status: "approved",
          expectedImpact,
          confidence:
            confidenceBefore,
        },
        after: {
          status: "failed",
          actualImpact,
          impactScore:
            savedImpact?.impactScore ?? 0,
        },
        source: "execution-engine",
      });

      await learningService.record({
        agent: "ceo",
        recommendationId,
        recommendationType:
          recommendation.executionType ||
          "unknown",
        executionSuccess: false,
        executionCompleted: false,
        executionMessage:
          executionResult.message,
        executionData: {
          ...(executionResult.data || {}),
          impactId:
            savedImpact?.id || null,
          impactScore:
            savedImpact?.impactScore ?? 0,
          expectedImpact,
          actualImpact,
        },
        metricsBefore: {
          status: "approved",
          executionPayload:
            recommendation.executionPayload ||
            {},
        },
        metricsAfter: {
          status: "failed",
          executionResult:
            executionResult.data || {},
          actualImpact,
          impactScore:
            savedImpact?.impactScore ?? 0,
          confidence: 0,
        },
        tags: [
          "execution-engine",
          "failed",
          "impact-tracked",
        ],
        metadata: {
          taskId: taskRef.id,
          executedBy:
            admin.email ||
            admin.uid,
          recommendationSource:
            recommendation.source ||
            null,
        },
      });

      return {
        success: false,
        recommendationId,
        status: "failed",
        result: executionResult,
      };
    }

    const confidenceAfter =
      executionResult.completed
        ? 100
        : 60;

    const savedImpact =
      await safelySaveImpact({
        recommendationId,
        measuredAt:
          new Date().toISOString(),
        expectedImpact,
        actualImpact,
        confidenceBefore,
        confidenceAfter,
        roi:
          readFiniteNumber(
            executionResult.data?.roi
          ) ??
          readFiniteNumber(
            recommendation.roi
          ) ??
          0,
        executionDurationSeconds,
        success: true,
        notes: [
          executionResult.message,
        ],
        metadata: {
          taskId: taskRef.id,
          executionType:
            recommendation.executionType ||
            null,
          executionCompleted:
            executionResult.completed,
          executionData:
            executionResult.data ||
            {},
          executedBy:
            admin.email ||
            admin.uid,
        },
      });

    await recommendationRef.update({
      status: "completed",
      result:
        executionResult.message,
      executionResult:
        executionResult.data || {},
      impactId:
        savedImpact?.id || null,
      impactScore:
        savedImpact?.impactScore ?? 0,
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
        impactId:
          savedImpact?.id || null,
        impactScore:
          savedImpact?.impactScore ?? 0,
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
      roi:
        savedImpact?.roi ?? 0,
      before: {
        status: "approved",
        expectedImpact,
        confidence:
          confidenceBefore,
      },
      after: {
        status: "completed",
        result:
          executionResult.data || {},
        actualImpact,
        impactScore:
          savedImpact?.impactScore ?? 0,
        confidence:
          confidenceAfter,
      },
      source: "execution-engine",
    });

    await learningService.record({
      agent: "ceo",
      recommendationId,
      recommendationType:
        recommendation.executionType ||
        "unknown",
      executionSuccess: true,
      executionCompleted:
        executionResult.completed,
      executionMessage:
        executionResult.message,
      executionData: {
        ...(executionResult.data || {}),
        impactId:
          savedImpact?.id || null,
        impactScore:
          savedImpact?.impactScore ?? 0,
        expectedImpact,
        actualImpact,
      },
      metricsBefore: {
        status: "approved",
        executionPayload:
          recommendation.executionPayload ||
          {},
      },
      metricsAfter: {
        status: "completed",
        executionResult:
          executionResult.data || {},
        actualImpact,
        impactScore:
          savedImpact?.impactScore ?? 0,
        confidence:
          confidenceAfter,
      },
      tags: [
        "execution-engine",
        "completed",
        "impact-tracked",
      ],
      metadata: {
        taskId: taskRef.id,
        executedBy:
          admin.email ||
          admin.uid,
        recommendationSource:
          recommendation.source ||
          null,
      },
    });

    return {
      success: true,
      recommendationId,
      taskId: taskRef.id,
      status: "completed",
      result: executionResult,
      impact: savedImpact,
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