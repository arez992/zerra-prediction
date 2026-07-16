import "server-only";

export const CEO_SIMILARITY_VERSION =
  "1.0.0";

export type SimilarDecisionSource =
  | "recommendation"
  | "impact"
  | "memory"
  | "learning";

export type SimilarDecisionOutcome =
  | "success"
  | "neutral"
  | "failure"
  | "unknown";

export type SimilarDecisionCandidate = {
  id: string;

  recommendationId: string;

  recommendationType: string;

  title: string;
  description: string;

  executionType: string | null;

  status: string;

  source:
    SimilarDecisionSource;

  success: boolean | null;
  outcome:
    SimilarDecisionOutcome;

  roi: number | null;
  impactScore: number | null;

  confidenceBefore:
    number | null;

  confidenceAfter:
    number | null;

  lesson: string | null;

  tags: string[];

  createdAt: string | null;
  completedAt: string | null;

  metadata:
    Record<string, unknown>;
};

export type SimilarDecisionInput = {
  recommendationId?: string;

  recommendationType?: string;

  title: string;

  description?: string;

  executionType?: string | null;

  tags?: string[];

  metadata?: Record<
    string,
    unknown
  >;
};

export type SimilarityBreakdown = {
  titleScore: number;

  descriptionScore: number;

  typeScore: number;

  executionTypeScore: number;

  tagScore: number;

  metadataScore: number;
};

export type SimilarDecisionMatch = {
  candidate:
    SimilarDecisionCandidate;

  similarityScore: number;

  breakdown:
    SimilarityBreakdown;

  matchedTerms: string[];

  reasons: string[];
};

export type SimilarDecisionQuery = {
  input:
    SimilarDecisionInput;

  minimumScore?: number;

  limit?: number;

  candidateLimit?: number;

  includeFailed?: boolean;

  includeNeutral?: boolean;
};

export type SimilarDecisionResult = {
  version: string;

  input:
    SimilarDecisionInput;

  matches:
    SimilarDecisionMatch[];

  totalCandidates: number;

  evaluatedCandidates: number;

  minimumScore: number;

  generatedAt: string;
};

export type SimilarDecisionSummary = {
  totalMatches: number;

  successfulMatches: number;

  failedMatches: number;

  neutralMatches: number;

  averageSimilarity: number;

  averageImpactScore: number;

  averageROI: number;

  strongestMatch:
    SimilarDecisionMatch | null;

  recommendedAction:
    | "proceed"
    | "review"
    | "avoid"
    | "insufficient-history";
};