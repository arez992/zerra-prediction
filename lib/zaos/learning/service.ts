import "server-only";

import {
  buildLearningPerformanceSummary,
  type LearningPerformanceSummary,
} from "./metrics";
import {
  recordLearningOutcome,
  type LearningRecordWriteResult,
} from "./recorder";
import {
  getLearningHistory,
  getLearningStats,
  getRecentLearning,
} from "./storage";
import type {
  LearningAgent,
  LearningRecord,
  LearningStats,
} from "./types";
import type {
  LearningEvaluationInput,
} from "./evaluator";

export type LearningHistoryOptions = {
  agent: LearningAgent;
  limit?: number;
};

export type LearningRecentOptions = {
  limit?: number;
};

export type LearningSummaryOptions = {
  limit?: number;
  agent?: LearningAgent;
};

function normalizeLimit(
  value: number | undefined,
  fallback: number,
  maximum: number
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

async function record(
  input: LearningEvaluationInput
): Promise<LearningRecordWriteResult> {
  return recordLearningOutcome(
    input
  );
}

async function history(
  options: LearningHistoryOptions
): Promise<LearningRecord[]> {
  return getLearningHistory(
    options.agent,
    normalizeLimit(
      options.limit,
      20,
      100
    )
  );
}

async function recent(
  options: LearningRecentOptions = {}
): Promise<LearningRecord[]> {
  return getRecentLearning(
    normalizeLimit(
      options.limit,
      10,
      100
    )
  );
}

async function stats(
  agent: LearningAgent
): Promise<LearningStats> {
  return getLearningStats(agent);
}

async function summary(
  options: LearningSummaryOptions = {}
): Promise<LearningPerformanceSummary> {
  const limit =
    normalizeLimit(
      options.limit,
      100,
      100
    );

  const records =
    options.agent
      ? await getLearningHistory(
          options.agent,
          limit
        )
      : await getRecentLearning(
          limit
        );

  return buildLearningPerformanceSummary(
    records
  );
}

export const learningService = {
  record,
  history,
  recent,
  stats,
  summary,
} as const;

export type LearningService =
  typeof learningService;