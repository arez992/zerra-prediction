export type SEOPageStatus =
  | "draft"
  | "approved"
  | "published"
  | "rejected"
  | "failed";

export type SEOPageLanguage =
  | "en"
  | "ku";

export type SEOFAQItem = {
  question: string;
  answer: string;
};

export type SEOPageSection = {
  heading: string;
  content: string;
};

export type SEOPageDraft = {
  id: string;

  keyword: string;
  country?: string | null;
  language: SEOPageLanguage;

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

  guardrails: {
    peopleFirstContent: boolean;
    uniqueHelpfulContent: boolean;
    duplicateChecked: boolean;
    humanApprovalRequired: boolean;
    autoPublishDisabled: boolean;
  };
};

export type CreateSEOPageDraftInput = {
  keyword: string;
  country?: string | null;
  language?: SEOPageLanguage;
  sourceRecommendationId?: string | null;
  createdBy: string;
};