import "server-only";

export const ZAOS_LEARNING_VERSION = "1.0.0";

export type LearningAgent =
  | "ceo"
  | "prediction"
  | "seo"
  | "marketing"
  | "finance"
  | "cto"
  | "risk";

export type LearningOutcome =
  | "success"
  | "failure"
  | "neutral";

export interface LearningMetricsSnapshot {
  [key: string]: unknown;
}

export interface LearningRecord {
  id: string;

  version: string;

  agent: LearningAgent;

  recommendationId: string;

  recommendationType: string;

  createdAt: string;

  completedAt: string;

  outcome: LearningOutcome;

  score: number;

  metricsBefore: LearningMetricsSnapshot;

  metricsAfter: LearningMetricsSnapshot;

  notes: string[];

  tags: string[];

  metadata: Record<string, unknown>;
}

export interface LearningStats {
  totalRuns: number;

  successfulRuns: number;

  failedRuns: number;

  neutralRuns: number;

  averageScore: number;

  successRate: number;

  lastCompletedAt: string | null;
}

export interface LearningSummary {
  version: string;

  generatedAt: string;

  agent: LearningAgent;

  stats: LearningStats;

  recentRecords: LearningRecord[];
}