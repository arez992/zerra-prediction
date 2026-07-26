export type PostMatchReportStatus = "draft" | "published" | "failed";

export type PostMatchReport = {
  id: string;
  fixtureId: string;
  locale: string;
  slug: string;
  sourceFingerprint: string;
  fixtureStatus: string;
  homeScore: number | null;
  awayScore: number | null;
  headline: string;
  summary: string;
  matchReport: string;
  postMatchAnalysis: string;
  facts: Record<string, unknown>;
  statistics: unknown[];
  events: unknown[];
  dataQuality: string;
  model: string | null;
  status: PostMatchReportStatus;
  generatedAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
};

export type PostMatchReportUpsertInput = Omit<PostMatchReport, "id" | "updatedAt">;