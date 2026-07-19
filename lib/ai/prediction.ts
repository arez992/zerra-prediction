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

export type PredictionMarketCategory =
  | "Total Goals"
  | "Team Total Goals"
  | "BTTS"
  | "Double Chance"
  | "No Strong Prediction";

export type PredictionPrimarySelection = {
  category:
    PredictionMarketCategory;

  pick: string;

  confidence: number;

  qualified: boolean;

  reason: string;
};

export type PredictionMarketProbabilities = {
  /*
   * Supporting 1X2 analysis.
   *
   * These probabilities remain useful
   * internally and in the UI, but they
   * are no longer the canonical ZERRA
   * prediction output.
   */
  homeWin: number;
  draw: number;
  awayWin: number;

  /*
   * Existing goal markets.
   */
  over25: number;
  under25: number;
  btts: number;

  /*
   * ZERRA Market Architecture.
   *
   * Optional during migration so older
   * stored predictions remain compatible.
   */
  over15?: number;
  under15?: number;

  over35?: number;
  under35?: number;

  bttsYes?: number;
  bttsNo?: number;

  homeOver05?: number;
  homeUnder05?: number;

  homeOver15?: number;
  homeUnder15?: number;

  awayOver05?: number;
  awayUnder05?: number;

  awayOver15?: number;
  awayUnder15?: number;

  doubleChance1X?: number;
  doubleChanceX2?: number;
  doubleChance12?: number;
};

export type ExpectedGoalsResult = {
  home: number;
  away: number;
  total: number;
};

export type PublicPrediction = {
  overview: string;

  risk:
    PredictionRisk;

  riskScore:
    number;

  keyInsights:
    string[];

  teaser:
    string;

  marketCategory?:
    PredictionMarketCategory;
};

export type VIPPrediction = {
  /*
   * Backwards-compatible display field.
   *
   * This now represents the selected
   * ZERRA market pick, not necessarily
   * Home Win / Draw / Away Win.
   */
  finalPrediction:
    string;

  /*
   * Canonical prediction decision.
   */
  primaryPrediction:
    PredictionPrimarySelection;

  confidence:
    number;

  /*
   * Supplemental only.
   * Exact score must never override the
   * primary market prediction.
   */
  exactScore:
    string;

  /*
   * Backwards-compatible field.
   * Later UI can rename this to
   * Model Pick / Best Market.
   */
  valueBet:
    string;

  markets:
    PredictionMarketProbabilities;

  expectedGoals:
    ExpectedGoalsResult;

  reasoning:
    string[];
};

export type PredictionModelMetadata = {
  version:
    string;

  dataVersion:
    string;

  generatedAt:
    string;
};

export type PredictionReview = {
  approved:
    boolean;

  reviewedBy:
    string | null;

  reviewedAt:
    string | null;
};

export type PredictionConsistencyMetadata = {
  valid:
    boolean;

  issues:
    PredictionConsistencyIssue[];
};

export type PredictionResult = {
  confidence:
    number;

  /*
   * Supporting match-outcome analysis.
   */
  homeWin:
    number;

  draw:
    number;

  awayWin:
    number;

  /*
   * Supporting goal probabilities.
   */
  over25:
    number;

  under25:
    number;

  btts:
    number;

  risk:
    PredictionRisk;

  riskScore:
    number;

  valueBet:
    string;

  expectedGoals:
    number;

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
    valid:
      boolean;

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
   * the canonical output used by:
   *
   * - explanation
   * - context
   * - validation
   * - Firestore persistence
   * - admin dashboard
   * - VIP presentation
   *
   * From this market architecture,
   * vipPrediction.primaryPrediction is
   * the canonical prediction decision.
   *
   * 1X2 remains supporting analysis only.
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