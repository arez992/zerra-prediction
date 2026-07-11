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

async function parseJSON<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

async function fetchCEOResource<T>(
  endpoint: string,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const data = await parseJSON<T & { success?: boolean; error?: string }>(
    response
  );

  if (!response.ok || data.success === false) {
    throw new Error(data.error || fallbackMessage);
  }

  return data as T;
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
    {
      id,
    }
  );
}

export function rejectCEORecommendation(
  id: string,
  reason: string
): Promise<CEOActionResponse> {
  return runCEOAction(
    "/api/admin/ai-ceo/reject",
    {
      id,
      reason,
    }
  );
}

export function executeCEORecommendation(
  id: string
): Promise<CEOActionResponse> {
  return runCEOAction(
    "/api/admin/ai-ceo/execute",
    {
      id,
    }
  );
}