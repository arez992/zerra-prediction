import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";

import type {
  LearningAgent,
  LearningRecord,
  LearningStats,
} from "./types";

const COLLECTION = "zaosLearning";

function normalizeLimit(
  value?: number
): number {
  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.min(
    100,
    Math.max(1, Math.floor(value!))
  );
}

export async function saveLearningRecord(
  record: LearningRecord
): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(record.id)
    .set(record);
}

export async function getLearningHistory(
  agent: LearningAgent,
  limit = 20
): Promise<LearningRecord[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("agent", "==", agent)
    .orderBy("completedAt", "desc")
    .limit(normalizeLimit(limit))
    .get();

  return snapshot.docs.map(
    (doc) => doc.data() as LearningRecord
  );
}

export async function getRecentLearning(
  limit = 10
): Promise<LearningRecord[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .orderBy("completedAt", "desc")
    .limit(normalizeLimit(limit))
    .get();

  return snapshot.docs.map(
    (doc) => doc.data() as LearningRecord
  );
}

export async function getLearningStats(
  agent: LearningAgent
): Promise<LearningStats> {
  const history =
    await getLearningHistory(agent, 100);

  const successfulRuns =
    history.filter(
      (item) => item.outcome === "success"
    ).length;

  const failedRuns =
    history.filter(
      (item) => item.outcome === "failure"
    ).length;

  const neutralRuns =
    history.filter(
      (item) => item.outcome === "neutral"
    ).length;

  const averageScore =
    history.length === 0
      ? 0
      : Number(
          (
            history.reduce(
              (sum, item) =>
                sum + item.score,
              0
            ) / history.length
          ).toFixed(2)
        );

  const successRate =
    history.length === 0
      ? 0
      : Number(
          (
            (successfulRuns /
              history.length) *
            100
          ).toFixed(2)
        );

  return {
    totalRuns: history.length,
    successfulRuns,
    failedRuns,
    neutralRuns,
    averageScore,
    successRate,
    lastCompletedAt:
      history[0]?.completedAt ?? null,
  };
}