export type LearningOutcome =
  | "success"
  | "neutral"
  | "failure";

export type LearningHistoryRecord = {
  id: string;
  agent: string;
  recommendationType: string;
  outcome: LearningOutcome;
  score: number;
  createdAt: string;
  completedAt: string;
  notes: string[];
  metadata: Record<string, unknown>;
};