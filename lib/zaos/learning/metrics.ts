import "server-only";

import type {
  LearningAgent,
  LearningRecord,
  LearningStats,
} from "./types";

export type LearningTypeStats = {
  recommendationType: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  neutralRuns: number;
  averageScore: number;
  successRate: number;
  lastCompletedAt: string | null;
};

export type LearningPerformanceSummary = {
  generatedAt: string;
  totalRecords: number;
  overall: LearningStats;
  byAgent: Partial<
    Record<LearningAgent, LearningStats>
  >;
  byRecommendationType: LearningTypeStats[];
  bestPerformingStrategy:
    | LearningTypeStats
    | null;
  worstPerformingStrategy:
    | LearningTypeStats
    | null;
};

function round(
  value: number,
  digits = 2
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(digits));
}

function clampScore(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value)
  );
}

function latestCompletedAt(
  records: LearningRecord[]
): string | null {
  const timestamps = records
    .map((record) =>
      Date.parse(record.completedAt)
    )
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(
    Math.max(...timestamps)
  ).toISOString();
}

export function calculateLearningStats(
  records: LearningRecord[]
): LearningStats {
  const successfulRuns =
    records.filter(
      (record) =>
        record.outcome === "success"
    ).length;

  const failedRuns =
    records.filter(
      (record) =>
        record.outcome === "failure"
    ).length;

  const neutralRuns =
    records.filter(
      (record) =>
        record.outcome === "neutral"
    ).length;

  const averageScore =
    records.length === 0
      ? 0
      : round(
          records.reduce(
            (sum, record) =>
              sum +
              clampScore(record.score),
            0
          ) / records.length
        );

  const successRate =
    records.length === 0
      ? 0
      : round(
          (
            successfulRuns /
            records.length
          ) * 100
        );

  return {
    totalRuns: records.length,
    successfulRuns,
    failedRuns,
    neutralRuns,
    averageScore,
    successRate,
    lastCompletedAt:
      latestCompletedAt(records),
  };
}

export function groupLearningByAgent(
  records: LearningRecord[]
): Partial<
  Record<LearningAgent, LearningStats>
> {
  const grouped =
    new Map<
      LearningAgent,
      LearningRecord[]
    >();

  for (const record of records) {
    const current =
      grouped.get(record.agent) ?? [];

    current.push(record);

    grouped.set(
      record.agent,
      current
    );
  }

  const result: Partial<
    Record<
      LearningAgent,
      LearningStats
    >
  > = {};

  for (
    const [agent, agentRecords]
    of grouped.entries()
  ) {
    result[agent] =
      calculateLearningStats(
        agentRecords
      );
  }

  return result;
}

export function groupLearningByRecommendationType(
  records: LearningRecord[]
): LearningTypeStats[] {
  const grouped =
    new Map<
      string,
      LearningRecord[]
    >();

  for (const record of records) {
    const recommendationType =
      record.recommendationType.trim() ||
      "unknown";

    const current =
      grouped.get(
        recommendationType
      ) ?? [];

    current.push(record);

    grouped.set(
      recommendationType,
      current
    );
  }

  return Array.from(
    grouped.entries()
  )
    .map(
      ([
        recommendationType,
        typeRecords,
      ]) => {
        const stats =
          calculateLearningStats(
            typeRecords
          );

        return {
          recommendationType,
          totalRuns:
            stats.totalRuns,
          successfulRuns:
            stats.successfulRuns,
          failedRuns:
            stats.failedRuns,
          neutralRuns:
            stats.neutralRuns,
          averageScore:
            stats.averageScore,
          successRate:
            stats.successRate,
          lastCompletedAt:
            stats.lastCompletedAt,
        };
      }
    )
    .sort(
      (first, second) => {
        if (
          second.successRate !==
          first.successRate
        ) {
          return (
            second.successRate -
            first.successRate
          );
        }

        if (
          second.averageScore !==
          first.averageScore
        ) {
          return (
            second.averageScore -
            first.averageScore
          );
        }

        return (
          second.totalRuns -
          first.totalRuns
        );
      }
    );
}

function chooseBestStrategy(
  stats: LearningTypeStats[]
): LearningTypeStats | null {
  return stats[0] ?? null;
}

function chooseWorstStrategy(
  stats: LearningTypeStats[]
): LearningTypeStats | null {
  if (stats.length === 0) {
    return null;
  }

  return [...stats].sort(
    (first, second) => {
      if (
        first.successRate !==
        second.successRate
      ) {
        return (
          first.successRate -
          second.successRate
        );
      }

      if (
        first.averageScore !==
        second.averageScore
      ) {
        return (
          first.averageScore -
          second.averageScore
        );
      }

      return (
        second.totalRuns -
        first.totalRuns
      );
    }
  )[0];
}

export function buildLearningPerformanceSummary(
  records: LearningRecord[]
): LearningPerformanceSummary {
  const byRecommendationType =
    groupLearningByRecommendationType(
      records
    );

  return {
    generatedAt:
      new Date().toISOString(),
    totalRecords:
      records.length,
    overall:
      calculateLearningStats(
        records
      ),
    byAgent:
      groupLearningByAgent(
        records
      ),
    byRecommendationType,
    bestPerformingStrategy:
      chooseBestStrategy(
        byRecommendationType
      ),
    worstPerformingStrategy:
      chooseWorstStrategy(
        byRecommendationType
      ),
  };
}