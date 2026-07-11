export type SEOOpportunityType =
  | "low-ctr"
  | "ranking-opportunity"
  | "content-refresh"
  | "content-cluster"
  | "new-page"
  | "technical";

export type SEOPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type SEORisk =
  | "low"
  | "medium"
  | "high";

export type SearchMetric = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SEOOpportunity = {
  id: string;
  type: SEOOpportunityType;
  title: string;
  description: string;
  priority: SEOPriority;
  confidence: number;
  risk: SEORisk;
  expectedImpact: string;

  query?: string | null;
  page?: string | null;

  metrics: SearchMetric;

  executionType:
    | "seo-metadata-optimization"
    | "create-seo-content-cluster"
    | "seo-content-refresh"
    | "create-seo-page-plan"
    | "technical-seo-audit";

  executionPayload: Record<string, unknown>;

  reasons: string[];
  source: string;
};

export type SEODirectorReport = {
  connected: boolean;

  summary: {
    totalQueries: number;
    totalPages: number;
    opportunities: number;
    highPriority: number;
    estimatedQuickWins: number;
  };

  searchPerformance: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
  };

  opportunities: SEOOpportunity[];

  guardrails: {
    peopleFirstContent: boolean;
    preventDuplicatePages: boolean;
    requireHumanApproval: boolean;
    preventScaledContentAbuse: boolean;
  };

  checkedAt: string;
};