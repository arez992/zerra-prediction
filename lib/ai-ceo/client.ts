export type CEORecommendationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

export type CEORecommendation = {
  id: string;
  title: string;
  description: string;
  category: string;
  country?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  expectedImpact: string;
  source: string;
  risk?: "low" | "medium" | "high";
  status: CEORecommendationStatus;
  executionType?: string | null;
  executionPayload?: Record<string, unknown>;
  createdAt?: string | null;
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

export type CEORecommendationsResponse = {
  success: boolean;
  recommendations: CEORecommendation[];
  stats: CEORecommendationStats;
  count: number;
  checkedAt?: string;
  error?: string;
};

export async function fetchCEORecommendations() {
  const response = await fetch(
    "/api/admin/ai-ceo/recommendations",
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    }
  );

  const data =
    (await response.json()) as CEORecommendationsResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "Unable to load AI CEO recommendations."
    );
  }

  return data;
}

export async function generateCEORecommendations() {
  const response = await fetch(
    "/api/admin/ai-ceo/generate",
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "Unable to generate recommendations."
    );
  }

  return data;
}