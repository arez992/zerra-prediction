import "server-only";

import type {
  CEOActionKey,
} from "../../types";
import type {
  ShadowComparisonStatus,
} from "../ShadowComparison";

export const AI_CEO_SHADOW_STORAGE_TYPES_VERSION = "1.0.0";

export type ShadowMigrationReadiness =
  | "not_ready"
  | "observing"
  | "candidate"
  | "ready";

export type ShadowRunOutcome =
  | "match"
  | "partial_match"
  | "mismatch"
  | "unavailable"
  | "failed";

export type ShadowMismatchSummary = {
  field: string;
  score: number;
  reason: string;
};

export type ShadowHistoryRecord = {
  id: string;
  version: string;

  runAt: string;
  storedAt: string;

  legacySource:
    | "openai"
    | "rules"
    | "unavailable";

  zaosStage: string | null;

  success: boolean;
  skipped: boolean;
  acceptable: boolean | null;

  comparisonStatus:
    | ShadowComparisonStatus
    | null;

  outcome: ShadowRunOutcome;

  overallScore: number | null;

  legacyDurationMs: number;
  zaosDurationMs: number;

  recommendationCount: number;
  delegationCount: number;

  matchingPriorityIds: string[];
  missingPriorityIds: string[];
  extraPriorityIds: string[];

  matchingActionKeys: CEOActionKey[];
  mismatchedActionKeys: CEOActionKey[];

  mismatches: ShadowMismatchSummary[];

  error: string | null;

  metadata: Record<string, unknown>;
};

export type CreateShadowHistoryRecordInput = Omit<
  ShadowHistoryRecord,
  | "id"
  | "version"
  | "storedAt"
>;

export type ShadowHistoryQuery = {
  limit?: number;
  minimumScore?: number;
  maximumScore?: number;
  status?: ShadowComparisonStatus;
  acceptable?: boolean;
  success?: boolean;
  from?: string;
  to?: string;
};

export type ShadowHistoryStats = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  skippedRuns: number;

  matchedRuns: number;
  partialMatchRuns: number;
  mismatchedRuns: number;
  unavailableRuns: number;

  acceptableRuns: number;
  unacceptableRuns: number;

  averageScore: number | null;
  minimumScore: number | null;
  maximumScore: number | null;

  averageLegacyDurationMs: number | null;
  averageZAOSDurationMs: number | null;

  recentMismatchFields: string[];
  repeatedMismatchFields: string[];

  readiness: ShadowMigrationReadiness;
  readinessReasons: string[];
};

export interface ShadowHistoryStore {
  save(
    record: ShadowHistoryRecord
  ): Promise<void>;

  list(
    query?: ShadowHistoryQuery
  ): Promise<ShadowHistoryRecord[]>;

  findById(
    id: string
  ): Promise<ShadowHistoryRecord | null>;

  count(): Promise<number>;
}

export function isShadowHistoryRecord(
  value: unknown
): value is ShadowHistoryRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate =
    value as Partial<ShadowHistoryRecord>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.runAt === "string" &&
    typeof candidate.storedAt === "string" &&
    typeof candidate.success === "boolean" &&
    typeof candidate.skipped === "boolean" &&
    (
      candidate.overallScore === null ||
      typeof candidate.overallScore === "number"
    ) &&
    typeof candidate.legacyDurationMs ===
      "number" &&
    typeof candidate.zaosDurationMs ===
      "number" &&
    Array.isArray(
      candidate.mismatchedActionKeys
    ) &&
    Array.isArray(candidate.mismatches)
  );
}