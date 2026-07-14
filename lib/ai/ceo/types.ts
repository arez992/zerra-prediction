export const CEO_ENGINE_VERSION = "1.0.0";

export type CEOHealth =
  | "Excellent"
  | "Good"
  | "Warning"
  | "Critical";

export type CEORiskLevel =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type CEOActionKey =
  | "publishPredictions"
  | "publishArticles"
  | "promoteVip"
  | "pauseMarketing"
  | "improveSeo"
  | "retrainAi"
  | "investigateApi";

export type CEOMetricValue =
  | string
  | number
  | boolean
  | null;

export type CEOMetrics = {
  generatedAt: string;

  revenue: {
    total: number | null;
    currency: string;
    trendPercent: number | null;
  };

  vip: {
    activeMembers: number | null;
    newMembers: number | null;
    conversionRate: number | null;
    revenue: number | null;
  };

  users: {
    total: number | null;
    active: number | null;
    newUsers: number | null;
  };

  traffic: {
    sessions: number | null;
    users: number | null;
    trendPercent: number | null;
  };

  seo: {
    publishedPages: number | null;
    averageQualityScore: number | null;
    pagesNeedingReview: number | null;
    organicClicks: number | null;
  };

  predictions: {
    total: number | null;
    published: number | null;
    pendingReview: number | null;
    checked: number | null;
    correct: number | null;
    accuracyPercent: number | null;
  };

  apiHealth: {
    apiFootballAvailable: boolean | null;
    openAiAvailable: boolean | null;
    paymentProviderAvailable: boolean | null;
    recentErrors: number | null;
  };

  costs: {
    total: number | null;
    apiFootball: number | null;
    openAi: number | null;
    infrastructure: number | null;
  };

  competitors: {
    monitored: number | null;
    notableChanges: string[];
  };

  custom?: Record<string, CEOMetricValue>;
};

export type CEOActionDecision = {
  enabled: boolean;
  requiresApproval: boolean;
  reason: string;
};

export type CEOActions = Record<
  CEOActionKey,
  CEOActionDecision
>;

export type CEOPriority = {
  id: string;
  title: string;
  reason: string;
  impact: "Low" | "Medium" | "High";
  urgency: "Low" | "Medium" | "High";
  requiresApproval: boolean;
  actionKey: CEOActionKey | null;
};

export type CEORisk = {
  title: string;
  level: CEORiskLevel;
  reason: string;
  mitigation: string;
};

export type CEOOpportunity = {
  title: string;
  reason: string;
  expectedImpact: "Low" | "Medium" | "High";
  nextStep: string;
};

export type CEODecision = {
  version: string;
  generatedAt: string;
  summary: string;
  confidence: number;
  overallHealth: CEOHealth;
  insufficientData: string[];
  todayPriorities: CEOPriority[];
  actions: CEOActions;
  risks: CEORisk[];
  opportunities: CEOOpportunity[];
  evidence: string[];
};

export type CEOEngineInput = {
  metrics: CEOMetrics;
  instruction?: string;
};

export type CEOEngineResult =
  | {
      success: true;
      source: "openai" | "rules";
      decision: CEODecision;
      rawResponse?: string;
    }
  | {
      success: false;
      error: string;
    };