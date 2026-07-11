import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export type CreateCEOMemoryInput = {
  recommendationId: string;
  lesson: string;
  success: boolean;
  roi?: number;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  source?: string;
};

function serializeTimestamp(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

export async function saveCEOMemory(
  input: CreateCEOMemoryInput
) {
  if (!input.recommendationId.trim()) {
    throw new Error("Recommendation ID is required");
  }

  if (!input.lesson.trim()) {
    throw new Error("CEO memory lesson is required");
  }

  const memory = {
    recommendationId: input.recommendationId,
    lesson: input.lesson.trim(),
    success: input.success,
    roi: Number(input.roi || 0),
    before: input.before || {},
    after: input.after || {},
    source: input.source || "execution-engine",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const document = await adminDb
    .collection("ceoMemory")
    .add(memory);

  return {
    id: document.id,
    ...memory,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getRecentCEOMemory(
  limit = 50
) {
  const safeLimit = Math.min(
    200,
    Math.max(1, Number(limit || 50))
  );

  const snapshot = await adminDb
    .collection("ceoMemory")
    .orderBy("createdAt", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs
    .filter((document) => document.id !== "config")
    .map((document) => {
      const data = document.data();

      return {
        id: document.id,
        recommendationId:
          data.recommendationId || "",
        lesson: data.lesson || "",
        success: data.success === true,
        roi: Number(data.roi || 0),
        before: data.before || {},
        after: data.after || {},
        source: data.source || "unknown",
        createdAt: serializeTimestamp(
          data.createdAt
        ),
        updatedAt: serializeTimestamp(
          data.updatedAt
        ),
      };
    });
}

export async function getRecommendationMemory(
  recommendationId: string
) {
  const snapshot = await adminDb
    .collection("ceoMemory")
    .where(
      "recommendationId",
      "==",
      recommendationId
    )
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      recommendationId:
        data.recommendationId || "",
      lesson: data.lesson || "",
      success: data.success === true,
      roi: Number(data.roi || 0),
      before: data.before || {},
      after: data.after || {},
      source: data.source || "unknown",
      createdAt: serializeTimestamp(
        data.createdAt
      ),
    };
  });
}

export async function getCEOLearningSummary() {
  const memories = await getRecentCEOMemory(200);

  const successful = memories.filter(
    (memory) => memory.success
  );

  const failed = memories.filter(
    (memory) => !memory.success
  );

  const totalROI = memories.reduce(
    (total, memory) =>
      total + Number(memory.roi || 0),
    0
  );

  const averageROI =
    memories.length === 0
      ? 0
      : Number(
          (totalROI / memories.length).toFixed(2)
        );

  const successRate =
    memories.length === 0
      ? 0
      : Number(
          (
            (successful.length /
              memories.length) *
            100
          ).toFixed(2)
        );

  return {
    totalMemories: memories.length,
    successfulDecisions: successful.length,
    failedDecisions: failed.length,
    successRate,
    averageROI,
    latestLessons: memories
      .slice(0, 10)
      .map((memory) => ({
        lesson: memory.lesson,
        success: memory.success,
        roi: memory.roi,
        createdAt: memory.createdAt,
      })),
  };
}