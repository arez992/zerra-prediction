export type RecommendationImpact = {
  recommendationId: string;

  measuredAt: string;

  expectedImpact: {
    revenue?: number;
    users?: number;
    seo?: number;
    vipConversion?: number;
    predictionAccuracy?: number;
  };

  actualImpact: {
    revenue?: number;
    users?: number;
    seo?: number;
    vipConversion?: number;
    predictionAccuracy?: number;
  };

  confidenceBefore: number;

  confidenceAfter: number;

  roi: number;

  executionDurationSeconds: number;

  success: boolean;

  notes: string[];

  metadata?: Record<string, unknown>;
};