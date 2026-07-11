export type CEORecommendationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

export type CEOPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type CEOExecutionStatus =
  | "pending"
  | "approved"
  | "running"
  | "completed"
  | "failed";

export interface CEORecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  country?: string | null;
  priority: CEOPriority;
  confidence: number;
  expectedImpact: string;
  source: string;
  status: CEORecommendationStatus;

  executionType?: string | null;
  executionPayload?: Record<string, unknown>;

  createdAt: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  executedAt?: string | null;
  completedAt?: string | null;

  result?: string | null;
  rejectionReason?: string | null;
}

export interface CEOMemory {
  id: string;
  recommendationId: string;
  lesson: string;
  success: boolean;
  roi: number;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string | null;
}

export interface CEOTask {
  id: string;
  title: string;
  description: string;
  status: CEOExecutionStatus;
  assignedTo?: string | null;
  recommendationId?: string | null;
  executionType?: string | null;
  executionPayload?: Record<string, unknown>;
  createdAt: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  result?: string | null;
  error?: string | null;
}

export interface CEOReport {
  id: string;
  date: string;
  summary: string;
  wins: string[];
  losses: string[];
  recommendations: string[];
  risks: string[];
  createdAt?: string | null;
}

export interface CEOBusinessRules {
  minimumVipConversion: number;
  minimumRevenue: number;
  minimumCTR: number;
  minimumMarketScore: number;
  minimumTraffic: number;
  minimumSearchVolume: number;
  maximumRiskLevel?: "low" | "medium" | "high";
  autoApproveLowRisk?: boolean;
  updatedAt?: string | null;
}