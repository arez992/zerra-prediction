export const ZAOS_REPORT_TYPES_VERSION = "1.0.0";

export type ReportPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "custom";

export type ReportOwnerLevel =
  | "ceo"
  | "director"
  | "worker";

export type ReportStatus =
  | "draft"
  | "generated"
  | "reviewed"
  | "published"
  | "archived";

export type KPITrend =
  | "up"
  | "down"
  | "stable"
  | "unknown";

export type KPIStatus =
  | "on_track"
  | "at_risk"
  | "off_track"
  | "unknown";

export type ReportRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type KPIReportItem = {
  id: string;
  name: string;
  description: string;

  unit:
    | "count"
    | "percent"
    | "currency"
    | "duration"
    | "score"
    | "boolean";

  current: number | boolean | null;
  previous: number | boolean | null;
  target: number | boolean | null;

  change: number | null;
  trend: KPITrend;
  status: KPIStatus;

  evidence: string[];
};

export type ReportEvidence = {
  id: string;
  source: string;
  type: string;
  summary: string;
  reference?: string | null;
};

export type ReportAchievement = {
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  relatedKpiIds: string[];
};

export type ReportFailure = {
  title: string;
  description: string;
  rootCause: string;
  correctiveAction: string;
  relatedKpiIds: string[];
};

export type ReportLesson = {
  title: string;
  lesson: string;
  strategyChange: string | null;
  confidence: number;
};

export type ReportRisk = {
  title: string;
  description: string;
  level: ReportRiskLevel;
  mitigation: string;
};

export type ReportRecommendation = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  requiresApproval: boolean;
  relatedKpiIds: string[];
};

export type ReportNextAction = {
  id: string;
  title: string;
  description: string;
  ownerRoleId: string | null;
  dueAt: string | null;
  requiresApproval: boolean;
};

export type ZAOSReport = {
  id: string;

  ownerRoleId: string;
  ownerRoleName: string;
  ownerLevel: ReportOwnerLevel;

  title: string;
  summary: string;

  period: ReportPeriod;
  periodStart: string;
  periodEnd: string;

  status: ReportStatus;

  kpis: KPIReportItem[];
  achievements: ReportAchievement[];
  failures: ReportFailure[];
  lessons: ReportLesson[];
  risks: ReportRisk[];
  recommendations: ReportRecommendation[];
  nextActions: ReportNextAction[];
  evidence: ReportEvidence[];

  generatedBy: string;
  reviewedBy: string | null;

  generatedAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;

  metadata: Record<string, unknown>;

  version: string;
};

export type CreateZAOSReportInput = Omit<
  ZAOSReport,
  | "generatedAt"
  | "reviewedAt"
  | "publishedAt"
  | "archivedAt"
  | "version"
>;

export function createZAOSReport(
  input: CreateZAOSReportInput
): ZAOSReport {
  return {
    ...input,
    generatedAt: new Date().toISOString(),
    reviewedAt: null,
    publishedAt: null,
    archivedAt: null,
    version: ZAOS_REPORT_TYPES_VERSION,
  };
}

export function calculateKPIChange(
  current: number | null,
  previous: number | null
): number | null {
  if (
    current === null ||
    previous === null ||
    previous === 0
  ) {
    return null;
  }

  return Number(
    (
      ((current - previous) / previous) *
      100
    ).toFixed(2)
  );
}

export function getKPITrend(
  change: number | null
): KPITrend {
  if (change === null) {
    return "unknown";
  }

  if (change > 0) {
    return "up";
  }

  if (change < 0) {
    return "down";
  }

  return "stable";
}

export function normalizeReportConfidence(
  value: unknown
): number {
  const confidence = Number(value);

  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, confidence)
  );
}

export function isReportFinal(
  report: ZAOSReport
): boolean {
  return (
    report.status === "published" ||
    report.status === "archived"
  );
}

export function isReportPeriod(
  value: unknown
): value is ReportPeriod {
  return (
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "quarterly" ||
    value === "custom"
  );
}

export function isReportStatus(
  value: unknown
): value is ReportStatus {
  return (
    value === "draft" ||
    value === "generated" ||
    value === "reviewed" ||
    value === "published" ||
    value === "archived"
  );
}
