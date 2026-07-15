export type LearningOutcome =
  | "success"
  | "neutral"
  | "failure";

export type LearningHistoryRecord = {
  id: string;
  version?: string;
  agent: string;
  recommendationId?: string;
  recommendationType: string;
  outcome: LearningOutcome;
  score: number;
  createdAt: string;
  completedAt: string;
  notes: string[];
  tags?: string[];
  metadata: Record<string, unknown>;
  metricsBefore?: Record<string, unknown>;
  metricsAfter?: Record<string, unknown>;
};