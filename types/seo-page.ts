export type SEOPageStatus =
  | "draft"
  | "approved"
  | "published"
  | "rejected"
  | "failed";

export type SEOPageLanguage = "en" | "ku";

export type SEORiskLevel =
  | "Low"
  | "Medium"
  | "High";

export type SEOFAQItem = {
  question: string;
  answer: string;
};

export type SEOPageSection = {
  heading: string;
  content: string;
};

export type SEOContentGeneration = {
  mode: "template" | "openai_fixture";
  model?: string | null;
  fixtureId?: string | null;
  fixtureDate?: string | null;
  generatedAt?: string | null;
  factualDataAvailable?: boolean;
};

export type SEOHumanReview = {
  factsVerified: boolean;
  noMisleadingClaims: boolean;
  titleMetaReviewed: boolean;
  faqReviewed: boolean;
  linksChecked: boolean;
  schemaChecked: boolean;
  riskWordingReviewed: boolean;
  finalEditorialApproval: boolean;

  completed: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export type SEOPublicContent = {
  overview: string;
  recentForm: string;
  headToHead: string;
  homeAwayStats: string;
  injuries: string;
  aiSummary: string;
  riskLevel: SEORiskLevel;
  keyInsights: string[];
};

export type SEOVIPContent = {
  finalPrediction: string;
  confidence: number;
  exactScore: string;
  bestMarket: string;
  alternativeMarkets: string[];
  valuePick: string;
  reasoning: string;
};

export type SEOPageGuardrails = {
  peopleFirstContent: boolean;
  uniqueHelpfulContent: boolean;
  duplicateChecked: boolean;
  humanApprovalRequired: boolean;
  autoPublishDisabled: boolean;
};

export type SEOPageDraft = {
  id: string;

  keyword: string;
  country?: string | null;
  language: SEOPageLanguage;

  fixtureId?: string | null;
  fixtureDate?: string | null;

  slug: string;
  canonicalPath: string;

  title: string;
  metaDescription: string;

  h1: string;
  intro: string;

  sections: SEOPageSection[];
  faq: SEOFAQItem[];

  internalLinks: string[];
  relatedKeywords: string[];

  schemaType:
    | "Article"
    | "FAQPage"
    | "SportsEvent"
    | "WebPage";

  status: SEOPageStatus;

  sourceRecommendationId?: string | null;
  createdBy: string;

  createdAt?: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;

  generation?: SEOContentGeneration;

  humanReview?: SEOHumanReview | null;

  publicContent?: SEOPublicContent | null;
  vipContent?: SEOVIPContent | null;

  guardrails: SEOPageGuardrails;
};

export type CreateSEOPageDraftInput = {
  keyword: string;
  country?: string | null;
  language?: SEOPageLanguage;

  fixtureId?: string | null;
  fixtureDate?: string | null;

  sourceRecommendationId?: string | null;
  createdBy: string;
};