import type {
  PredictionMarketProbabilities,
  PredictionResult,
  PredictionRisk,
} from "./prediction";

export type PredictionEngineVersion = 3;

export type PredictionReliability =
  | "high"
  | "medium"
  | "low"
  | "unavailable";

export type PredictionPhase =
  | "early-pre-match"
  | "pre-lineup"
  | "confirmed-lineup"
  | "live"
  | "post-match";

export type PredictionEnrichmentLevel =
  | "basic"
  | "partial"
  | "enriched"
  | "full";

export type PredictionGenerationStatus =
  | "allowed"
  | "withheld"
  | "insufficient-data";

export type PredictionFactorCategory =
  | "form"
  | "strength"
  | "attack"
  | "defence"
  | "goals"
  | "home-away"
  | "head-to-head"
  | "availability"
  | "lineup"
  | "fatigue"
  | "motivation"
  | "league"
  | "market"
  | "historical-model";

export type PredictionEvidenceSource =
  | "api-football-fixture"
  | "api-football-team-statistics"
  | "api-football-recent-fixtures"
  | "api-football-head-to-head"
  | "api-football-injuries"
  | "api-football-lineups"
  | "api-football-odds"
  | "firestore-history"
  | "calculated"
  | "openai"
  | "fallback";

export type PredictionTrend =
  | "improving"
  | "declining"
  | "stable"
  | "unknown";

export type GenerationDecision = {
  status: PredictionGenerationStatus;
  allowed: boolean;
  reason: string | null;
  minimumCompletenessRequired: number;
  actualCompleteness: number;
  warnings: string[];
};

export type PredictionDataQuality = {
  completeness: number;
  freshness: number;
  reliability: PredictionReliability;
  enrichmentLevel: PredictionEnrichmentLevel;

  sourcesUsed: PredictionEvidenceSource[];
  missingSources: PredictionEvidenceSource[];
  warnings: string[];

  generatedFromFallback: boolean;
  sampleSize: {
    home: number;
    away: number;
  };

  lastUpdatedAt: string | null;
};

export type PredictionConfidenceBreakdown = {
  statistical: number;
  teamForm: number;
  dataCompleteness: number;
  market: number | null;
  modelAgreement: number;
  historicalCalibration: number | null;
  uncertaintyPenalty: number;
  finalCalibrated: number;
};

export type PredictionRiskBreakdown = {
  outcomeUncertainty: number;
  dataRisk: number;
  formVolatility: number;
  lineupRisk: number;
  injuryRisk: number;
  leagueVolatility: number;
  modelDisagreement: number;
  marketDisagreement: number | null;
  reasons: string[];
};

export type PredictionEvidenceItem = {
  key: string;
  category: PredictionFactorCategory;
  value: string | number | boolean | null;
  source: PredictionEvidenceSource;
  reliability: PredictionReliability;
  reliabilityScore: number;
  sampleSize: number | null;
  fetchedAt: string | null;
  description: string | null;
};

export type TeamFormProfileV3 = {
  matchesUsed: number;
  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;

  averageGoalsFor: number;
  averageGoalsAgainst: number;

  cleanSheetRate: number;
  scoringRate: number;
  pointsPerGame: number;

  homeOrAwayPointsPerGame: number | null;
  trend: PredictionTrend;

  score: number;
  reliability: PredictionReliability;
};

export type FormFactorResultV3 = {
  home: TeamFormProfileV3 | null;
  away: TeamFormProfileV3 | null;

  homeFormScore: number;
  awayFormScore: number;

  advantage:
    | "home"
    | "away"
    | "balanced"
    | "unknown";

  dataCompleteness: number;
  reliable: boolean;
  evidence: PredictionEvidenceItem[];
  warnings: string[];
};

export type TeamStrengthProfileV3 = {
  attackScore: number;
  defenceScore: number;
  overallScore: number;

  goalsScoredPerMatch: number | null;
  goalsConcededPerMatch: number | null;

  cleanSheetRate: number | null;
  failedToScoreRate: number | null;

  homeOrAwaySplitScore: number | null;
  leaguePositionScore: number | null;

  reliability: PredictionReliability;
};

export type StrengthFactorResultV3 = {
  home: TeamStrengthProfileV3 | null;
  away: TeamStrengthProfileV3 | null;

  homeStrength: number;
  awayStrength: number;

  homeAdvantage: number;
  dataCompleteness: number;
  reliable: boolean;

  evidence: PredictionEvidenceItem[];
  warnings: string[];
};

export type GoalProbabilityDistribution = {
  score: string;
  probability: number;
};

export type GoalsFactorResultV3 = {
  homeExpectedGoals: number | null;
  awayExpectedGoals: number | null;
  expectedGoals: number | null;

  over25: number | null;
  under25: number | null;
  btts: number | null;

  mostLikelyScores: GoalProbabilityDistribution[];

  reliability: PredictionReliability;
  dataCompleteness: number;
  sampleSize: {
    home: number;
    away: number;
  };

  evidence: PredictionEvidenceItem[];
  warnings: string[];
};

export type AvailabilityFactorResultV3 = {
  homeMissingPlayers: string[];
  awayMissingPlayers: string[];

  homeImpactScore: number;
  awayImpactScore: number;

  lineupsAvailable: boolean;
  lineupsConfirmed: boolean;

  reliability: PredictionReliability;
  evidence: PredictionEvidenceItem[];
  warnings: string[];
};

export type HeadToHeadFactorResultV3 = {
  matchesUsed: number;

  homeWins: number;
  draws: number;
  awayWins: number;

  averageGoals: number | null;
  bttsRate: number | null;
  over25Rate: number | null;

  weightApplied: number;
  reliability: PredictionReliability;

  evidence: PredictionEvidenceItem[];
  warnings: string[];
};

export type MarketValueAssessment = {
  market: string;
  modelProbability: number;
  impliedProbability: number;
  edge: number;
  odds: number;
  available: boolean;
  warning: string | null;
};

export type MarketFactorResultV3 = {
  available: boolean;
  bookmakerCount: number;
  movementDetected: boolean;

  assessments: MarketValueAssessment[];
  marketConfidence: number | null;
  marketTrapWarning: string | null;

  evidence: PredictionEvidenceItem[];
  warnings: string[];
};

export type PredictionFactorSummary = {
  category: PredictionFactorCategory;
  homeScore: number | null;
  awayScore: number | null;
  weight: number;
  reliability: PredictionReliability;
  contribution: number;
  reasons: string[];
};

export type ExactScorePredictionV3 = {
  mostLikely: string | null;
  alternatives: string[];
  range: string | null;
  reliability: PredictionReliability;
};

export type PredictionSelectionV3 = {
  market: string;
  selection: string;
  probability: number | null;
  confidence: number;
  rationale: string[];
};

export type VIPPredictionV3 = {
  primaryPrediction: PredictionSelectionV3 | null;
  secondaryPrediction: PredictionSelectionV3 | null;
  safeOption: PredictionSelectionV3 | null;
  aggressiveOption: PredictionSelectionV3 | null;

  strongestSignal: PredictionSelectionV3 | null;
  valueAssessment: MarketValueAssessment | null;

  exactScore: ExactScorePredictionV3;

  expectedGoals: {
    home: number | null;
    away: number | null;
    total: number | null;
  };

  probabilities: PredictionMarketProbabilities;

  confidenceBreakdown: PredictionConfidenceBreakdown;
  riskBreakdown: PredictionRiskBreakdown;

  keyMissingPlayers: {
    home: string[];
    away: string[];
  };

  matchSpecificReasons: string[];
  counterSignals: string[];
  whatChanged: string[];
  marketTrapWarning: string | null;
  caution: string;
};

export type PublicInsightV3 = {
  category: PredictionFactorCategory;
  text: string;
  confidence: number;
};

export type PublicPredictionV3 = {
  summary: string;
  insights: PublicInsightV3[];

  risk: PredictionRisk;
  riskScore: number;

  dataReliability: PredictionReliability;
  dataCoverageMessage: string;

  vipTeaser: string;
};

export type OpenAIAnalysisEligibility = {
  allowed: boolean;
  reason: string | null;

  inputFingerprint: string;
  cachedResultAvailable: boolean;

  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;

  dailyBudgetRemaining: boolean;
};

export type OpenAIAnalysisMetadata = {
  used: boolean;
  model: string | null;

  inputFingerprint: string | null;
  generatedAt: string | null;

  promptVersion: string | null;
  cached: boolean;

  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
};

export type PredictionModelMetadataV3 = {
  engineVersion: PredictionEngineVersion;
  modelVersion: string;
  dataVersion: string;

  factorVersions: Record<string, string>;
  dataSources: PredictionEvidenceSource[];

  enrichmentLevel: PredictionEnrichmentLevel;
  predictionPhase: PredictionPhase;

  inputFingerprint: string;
  generatedAt: string;
};

export type PredictionEvidenceBundleV3 = {
  form: FormFactorResultV3 | null;
  strength: StrengthFactorResultV3 | null;
  goals: GoalsFactorResultV3 | null;
  availability: AvailabilityFactorResultV3 | null;
  headToHead: HeadToHeadFactorResultV3 | null;
  market: MarketFactorResultV3 | null;

  allEvidence: PredictionEvidenceItem[];
};

export type PredictionResultV3 =
  PredictionResult & {
    engineVersion: PredictionEngineVersion;

    generationDecision: GenerationDecision;
    dataQuality: PredictionDataQuality;

    confidenceBreakdown: PredictionConfidenceBreakdown;
    riskBreakdown: PredictionRiskBreakdown;

    factors: PredictionFactorSummary[];
    evidence: PredictionEvidenceBundleV3;

    publicPredictionV3: PublicPredictionV3;
    vipPredictionV3: VIPPredictionV3;

    openAIEligibility: OpenAIAnalysisEligibility;
    openAIAnalysis: OpenAIAnalysisMetadata;

    modelV3: PredictionModelMetadataV3;
  };