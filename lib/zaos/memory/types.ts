import "server-only";

export const ZAOS_SHARED_MEMORY_VERSION =
  "1.0.0";

export type ZAOSMemoryAgent =
  | "ceo"
  | "seo"
  | "prediction"
  | "marketing"
  | "revenue"
  | "finance"
  | "cto"
  | "risk"
  | "system";

export type ZAOSMemoryVisibility =
  | "private"
  | "shared"
  | "global";

export type ZAOSMemoryImportance =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ZAOSMemoryCategory =
  | "decision"
  | "execution"
  | "learning"
  | "risk"
  | "opportunity"
  | "metric"
  | "incident"
  | "strategy"
  | "owner-feedback";

export type ZAOSMemorySnapshot =
  Record<string, unknown>;

export type ZAOSSharedMemoryRecord = {
  id: string;

  version: string;

  agent: ZAOSMemoryAgent;
  sharedWith: ZAOSMemoryAgent[];

  visibility: ZAOSMemoryVisibility;
  category: ZAOSMemoryCategory;
  importance: ZAOSMemoryImportance;

  title: string;
  lesson: string;

  recommendationId: string | null;
  decisionId: string | null;
  taskId: string | null;

  success: boolean | null;
  confidence: number | null;
  roi: number | null;

  before: ZAOSMemorySnapshot;
  after: ZAOSMemorySnapshot;
  evidence: ZAOSMemorySnapshot;

  source: string;
  tags: string[];

  requiresHumanReview: boolean;
  approvedForSharing: boolean;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

export type CreateZAOSSharedMemoryInput = {
  agent: ZAOSMemoryAgent;

  sharedWith?: ZAOSMemoryAgent[];

  visibility?: ZAOSMemoryVisibility;
  category: ZAOSMemoryCategory;
  importance?: ZAOSMemoryImportance;

  title: string;
  lesson: string;

  recommendationId?: string | null;
  decisionId?: string | null;
  taskId?: string | null;

  success?: boolean | null;
  confidence?: number | null;
  roi?: number | null;

  before?: ZAOSMemorySnapshot;
  after?: ZAOSMemorySnapshot;
  evidence?: ZAOSMemorySnapshot;

  source?: string;
  tags?: string[];

  requiresHumanReview?: boolean;
  approvedForSharing?: boolean;

  createdBy: string;
  expiresAt?: string | null;
};

export type ZAOSMemoryQuery = {
  agent?: ZAOSMemoryAgent;
  visibleTo?: ZAOSMemoryAgent;
  visibility?: ZAOSMemoryVisibility;
  category?: ZAOSMemoryCategory;
  importance?: ZAOSMemoryImportance;
  recommendationId?: string;
  decisionId?: string;
  taskId?: string;
  tag?: string;
  limit?: number;
};

export type ZAOSMemoryStats = {
  totalMemories: number;
  successfulMemories: number;
  failedMemories: number;
  neutralMemories: number;
  averageConfidence: number;
  averageROI: number;
  byAgent: Partial<
    Record<ZAOSMemoryAgent, number>
  >;
  byCategory: Partial<
    Record<ZAOSMemoryCategory, number>
  >;
  lastCreatedAt: string | null;
};