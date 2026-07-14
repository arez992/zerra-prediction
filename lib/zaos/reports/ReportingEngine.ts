import {
  CreateZAOSReportInput,
  KPIReportItem,
  ReportAchievement,
  ReportFailure,
  ReportLesson,
  ReportNextAction,
  ReportRecommendation,
  ReportRisk,
  ReportEvidence,
  ZAOSReport,
  createZAOSReport,
  calculateKPIChange,
  getKPITrend,
} from "./ReportTypes";

export const ZAOS_REPORTING_ENGINE_VERSION = "1.0.0";

export function buildKPI(
  input: Omit<
    KPIReportItem,
    "change" | "trend"
  >
): KPIReportItem {
  const change = calculateKPIChange(
    input.current as number | null,
    input.previous as number | null
  );

  return {
    ...input,
    change,
    trend: getKPITrend(change),
  };
}

export function generateReport(
  input: CreateZAOSReportInput
): ZAOSReport {
  return createZAOSReport(input);
}

export function summarizeReport(
  report: ZAOSReport
) {
  return {
    kpis: report.kpis.length,

    achievements:
      report.achievements.length,

    failures:
      report.failures.length,

    risks:
      report.risks.length,

    recommendations:
      report.recommendations.length,

    nextActions:
      report.nextActions.length,
  };
}

export function addAchievement(
  report: ZAOSReport,
  achievement: ReportAchievement
): ZAOSReport {
  return {
    ...report,
    achievements: [
      ...report.achievements,
      achievement,
    ],
  };
}

export function addFailure(
  report: ZAOSReport,
  failure: ReportFailure
): ZAOSReport {
  return {
    ...report,
    failures: [
      ...report.failures,
      failure,
    ],
  };
}

export function addLesson(
  report: ZAOSReport,
  lesson: ReportLesson
): ZAOSReport {
  return {
    ...report,
    lessons: [
      ...report.lessons,
      lesson,
    ],
  };
}

export function addRisk(
  report: ZAOSReport,
  risk: ReportRisk
): ZAOSReport {
  return {
    ...report,
    risks: [
      ...report.risks,
      risk,
    ],
  };
}

export function addRecommendation(
  report: ZAOSReport,
  recommendation: ReportRecommendation
): ZAOSReport {
  return {
    ...report,
    recommendations: [
      ...report.recommendations,
      recommendation,
    ],
  };
}

export function addNextAction(
  report: ZAOSReport,
  action: ReportNextAction
): ZAOSReport {
  return {
    ...report,
    nextActions: [
      ...report.nextActions,
      action,
    ],
  };
}

export function addEvidence(
  report: ZAOSReport,
  evidence: ReportEvidence
): ZAOSReport {
  return {
    ...report,
    evidence: [
      ...report.evidence,
      evidence,
    ],
  };
}

export function calculateReportHealth(
  report: ZAOSReport
): number {
  let score = 100;

  score -= report.failures.length * 5;

  score -= report.risks.length * 3;

  score += report.achievements.length * 2;

  score = Math.max(
    0,
    Math.min(100, score)
  );

  return score;
}

export function hasCriticalRisk(
  report: ZAOSReport
): boolean {
  return report.risks.some(
    (risk) => risk.level === "critical"
  );
}

export function needsExecutiveAttention(
  report: ZAOSReport
): boolean {
  return (
    hasCriticalRisk(report) ||
    report.failures.length > 5
  );
}