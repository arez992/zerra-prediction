export type CEORecommendationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

export type CEORecommendationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type CEORecommendationRisk =
  | "low"
  | "medium"
  | "high";


export type CEOHistoryAction =
  | "proceed"
  | "review"
  | "avoid"
  | "insufficient-history";

export type CEOHistoryStrongestMatch = {
  similarityScore?: number | null;
  title?: string | null;
  outcome?: string | null;
  roi?: number | null;
  impactScore?: number | null;
};

export type CEODecisionHistory = {
  historyScore?: number | null;
  recommendedAction?: CEOHistoryAction | null;
  totalMatches?: number | null;
  averageSimilarity?: number | null;
  averageImpactScore?: number | null;
  averageROI?: number | null;
  strongestMatch?: CEOHistoryStrongestMatch | null;
  skipped?: boolean;
  skipReason?: string | null;
};

export type CEORecommendation = {
  id: string;
  title: string;
  description: string;
  category: string;
  country?: string | null;
  priority: CEORecommendationPriority;
  confidence: number;
  expectedImpact: string;
  source: string;
  risk?: CEORecommendationRisk;
  status: CEORecommendationStatus;
  executionType?: string | null;
  executionPayload?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  executedAt?: string | null;
  completedAt?: string | null;
  result?: string | null;
  rejectionReason?: string | null;

  generationSource?: string | null;
  canaryRequestId?: string | null;
  dataSnapshotAt?: string | null;

  historyScore?: number | null;
  recommendedAction?: CEOHistoryAction | null;
  totalMatches?: number | null;
  strongestMatch?: CEOHistoryStrongestMatch | null;
  decisionHistory?: CEODecisionHistory | null;
  similarDecisionContext?: CEODecisionHistory | null;

  impactId?: string | null;
  impactScore?: number | null;
};

export type CEORecommendationStats = {
  pending: number;
  approved: number;
  rejected: number;
  executing: number;
  completed: number;
  failed: number;
};

export type CEOMemoryItem = {
  id: string;
  recommendationId?: string;
  lesson?: string;
  success?: boolean;
  roi?: number;
  source?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CEOTaskStatus =
  | "pending"
  | "approved"
  | "running"
  | "completed"
  | "failed";

export type CEOTaskItem = {
  id: string;
  recommendationId?: string;
  title?: string;
  description?: string;
  status?: CEOTaskStatus;
  executionType?: string | null;
  executionPayload?: Record<string, unknown>;
  assignedTo?: string | null;
  result?: unknown;
  error?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type SEOOpportunityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: CEORecommendationPriority;
  confidence: number;
  risk: CEORecommendationRisk;
  expectedImpact: string;
  query?: string | null;
  page?: string | null;
  reasons?: string[];
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

  opportunities: SEOOpportunityItem[];

  guardrails: {
    peopleFirstContent: boolean;
    preventDuplicatePages: boolean;
    requireHumanApproval: boolean;
    preventScaledContentAbuse: boolean;
  };

  checkedAt: string;
};

export type SEOPageDraftStatus =
  | "draft"
  | "approved"
  | "published"
  | "rejected"
  | "failed";

export type SEOPageLanguage = "en" | "ku";

export type SEOPageSectionItem = {
  heading: string;
  content: string;
};

export type SEOPageFAQItem = {
  question: string;
  answer: string;
};

export type SEOPageGeneration = {
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

export type SEOPageDraftItem = {
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

  sections?: SEOPageSectionItem[];
  faq?: SEOPageFAQItem[];

  internalLinks?: string[];
  relatedKeywords?: string[];

  schemaType?: string;
  status: SEOPageDraftStatus;

  sourceRecommendationId?: string | null;
  createdBy?: string;

  createdAt?: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;

  generation?: SEOPageGeneration;

  humanReview?: SEOHumanReview | null;

  guardrails?: {
    peopleFirstContent: boolean;
    uniqueHelpfulContent: boolean;
    duplicateChecked: boolean;
    humanApprovalRequired: boolean;
    autoPublishDisabled: boolean;
  };
};

export type CEORecommendationsResponse = {
  success: boolean;
  recommendations: CEORecommendation[];
  stats: CEORecommendationStats;
  count: number;
  checkedAt?: string;
  error?: string;
};

export type CEOMemoryResponse = {
  success: boolean;
  memory: CEOMemoryItem[];
  count: number;
  error?: string;
};

export type CEOTasksResponse = {
  success: boolean;
  tasks: CEOTaskItem[];
  count: number;
  error?: string;
};

export type SEODirectorResponse = {
  success: boolean;
  seo?: SEODirectorReport;
  report?: SEODirectorReport;
  created?: number;
  skipped?: number;
  createdRecommendationIds?: string[];
  error?: string;
};

export type SEOPageDraftsResponse = {
  success: boolean;
  drafts: SEOPageDraftItem[];
  count: number;
  error?: string;
};

export type CreateSEOPageDraftResponse = {
  success: boolean;
  message?: string;
  draft?: SEOPageDraftItem;
  error?: string;
};

export type CEOGenerateResponse = {
  success: boolean;
  generated?: number;
  created?: number;
  skippedAsDuplicates?: number;
  recommendations?: CEORecommendation[];
  snapshotGeneratedAt?: string;
  error?: string;
};

export type CEOActionResponse = {
  success: boolean;
  message?: string;
  recommendationId?: string;
  taskId?: string;
  status?: CEORecommendationStatus;
  result?: unknown;
  error?: string;
};

type APIResponseBase = {
  success: boolean;
  error?: string;
};

async function parseJSON<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw) {
    throw new Error(
      `The server returned an empty response. HTTP ${response.status}`
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Invalid server response: ${raw.slice(0, 200)}`
    );
  }
}

async function fetchCEOResource<T extends APIResponseBase>(
  endpoint: string,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const data = await parseJSON<T>(response);

  if (!response.ok || !data.success) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

export async function fetchCEORecommendations(): Promise<CEORecommendationsResponse> {
  return fetchCEOResource<CEORecommendationsResponse>(
    "/api/admin/ai-ceo/recommendations",
    "Unable to load AI CEO recommendations."
  );
}

export async function fetchCEOMemory(): Promise<CEOMemoryResponse> {
  return fetchCEOResource<CEOMemoryResponse>(
    "/api/admin/ai-ceo/memory",
    "Unable to load AI CEO memory."
  );
}

export async function fetchCEOTasks(): Promise<CEOTasksResponse> {
  return fetchCEOResource<CEOTasksResponse>(
    "/api/admin/ai-ceo/tasks",
    "Unable to load AI CEO tasks."
  );
}

export async function fetchSEODirector(): Promise<SEODirectorResponse> {
  return fetchCEOResource<SEODirectorResponse>(
    "/api/admin/ai-ceo/seo",
    "Unable to load SEO Director."
  );
}

export async function fetchSEOPageDrafts(): Promise<SEOPageDraftsResponse> {
  return fetchCEOResource<SEOPageDraftsResponse>(
    "/api/admin/ai-ceo/seo-pages",
    "Unable to load SEO page drafts."
  );
}

export async function generateCEORecommendations(): Promise<CEOGenerateResponse> {
  const response = await fetch(
    "/api/admin/ai-ceo/generate",
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data =
    await parseJSON<CEOGenerateResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ||
        "Unable to generate AI CEO recommendations."
    );
  }

  return data;
}

export async function generateSEORecommendations(): Promise<SEODirectorResponse> {
  const response = await fetch(
    "/api/admin/ai-ceo/seo",
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data =
    await parseJSON<SEODirectorResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ||
        "Unable to generate SEO recommendations."
    );
  }

  const seo = data.seo || data.report;

  if (!seo) {
    throw new Error(
      "SEO Director did not return a report."
    );
  }

  return {
    ...data,
    seo,
  };
}

export async function createSEOPageDraft(input: {
  keyword: string;
  language: SEOPageLanguage;
  country?: string;
  fixtureId?: string;
  fixtureDate?: string;
  sourceRecommendationId?: string;
}): Promise<CreateSEOPageDraftResponse> {
  const response = await fetch(
    "/api/admin/ai-ceo/seo-pages",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const data =
    await parseJSON<CreateSEOPageDraftResponse>(
      response
    );

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ||
        "Unable to create SEO page draft."
    );
  }

  return data;
}

async function runCEOAction(
  endpoint: string,
  body: Record<string, unknown>
): Promise<CEOActionResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data =
    await parseJSON<CEOActionResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "AI CEO action failed."
    );
  }

  return data;
}

export function approveCEORecommendation(
  id: string
): Promise<CEOActionResponse> {
  return runCEOAction(
    "/api/admin/ai-ceo/approve",
    { id }
  );
}

export function rejectCEORecommendation(
  id: string,
  reason: string
): Promise<CEOActionResponse> {
  return runCEOAction(
    "/api/admin/ai-ceo/reject",
    { id, reason }
  );
}

export function executeCEORecommendation(
  id: string
): Promise<CEOActionResponse> {
  return runCEOAction(
    "/api/admin/ai-ceo/execute",
    { id }
  );
}