import {
  calculateAIScore,
} from "./score";

import {
  enforcePredictionConsistency,
  type PredictionConsistencyIssue,
} from "./consistency";

export type PredictionRisk =
  | "Low"
  | "Medium"
  | "High";

export type PredictionStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "settled"
  | "failed";

export type PredictionMarketProbabilities = {
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  under25: number;
  btts: number;
};

export type ExpectedGoalsResult = {
  home: number;
  away: number;
  total: number;
};

export type PublicPrediction = {
  overview: string;
  risk: PredictionRisk;
  riskScore: number;
  keyInsights: string[];
  teaser: string;
};

export type VIPPrediction = {
  finalPrediction: string;
  confidence: number;
  exactScore: string;
  valueBet: string;

  markets:
    PredictionMarketProbabilities;

  expectedGoals:
    ExpectedGoalsResult;

  reasoning:
    string[];
};

export type PredictionModelMetadata = {
  version: string;
  dataVersion: string;
  generatedAt: string;
};

export type PredictionReview = {
  approved: boolean;
  reviewedBy:
    string | null;
  reviewedAt:
    string | null;
};

export type PredictionConsistencyMetadata = {
  valid: boolean;
  issues:
    PredictionConsistencyIssue[];
};

export type PredictionResult = {
  confidence: number;

  homeWin: number;
  draw: number;
  awayWin: number;

  over25: number;
  under25: number;
  btts: number;

  risk:
    PredictionRisk;

  riskScore: number;

  valueBet: string;

  expectedGoals: number;

  homeExpectedGoals:
    number;

  awayExpectedGoals:
    number;

  publicPrediction:
    PublicPrediction;

  vipPrediction:
    VIPPrediction;

  model:
    PredictionModelMetadata;

  review:
    PredictionReview;

  status:
    PredictionStatus;

  consistency?: {
    valid: boolean;
    issues:
      PredictionConsistencyIssue[];
  };
};

export function calculatePrediction(
  match: unknown
): PredictionResult {
  const rawPrediction =
    calculateAIScore(
      match
    );

  const consistency =
    enforcePredictionConsistency(
      rawPrediction
    );

  /*
   * The normalized prediction becomes
   * the single canonical output used by:
   *
   * - explanation
   * - context
   * - validation
   * - Firestore persistence
   * - admin dashboard
   * - VIP presentation
   */
  return {
    ...consistency.prediction,

    consistency: {
      valid:
        consistency.valid,

      issues:
        consistency.issues,
    },
  };
}