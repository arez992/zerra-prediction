import "server-only";

import { randomUUID } from "crypto";

import type {
  CEOShadowRunResult,
} from "../ShadowRunner";
import type {
  ShadowFieldComparison,
} from "../ShadowComparison";
import {
  AI_CEO_SHADOW_STORAGE_TYPES_VERSION,
  type CreateShadowHistoryRecordInput,
  type ShadowHistoryQuery,
  type ShadowHistoryRecord,
  type ShadowHistoryStats,
  type ShadowHistoryStore,
  type ShadowMigrationReadiness,
  type ShadowRunOutcome,
} from "./ShadowTypes";

function clampScore(
  value: number | null
): number | null {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(0, value)
  );
}

function determineOutcome(
  result: CEOShadowRunResult
): ShadowRunOutcome {
  if (result.skipped) {
    return "unavailable";
  }

  if (
    !result.success &&
    !result.comparison
  ) {
    return "failed";
  }

  return (
    result.comparison?.status ??
    "unavailable"
  );
}

function extractMismatches(
  fields: ShadowFieldComparison[]
): Array<{
  field: string;
  score: number;
  reason: string;
}> {
  return fields
    .filter(
      (field) =>
        field.status === "mismatch" ||
        field.status === "partial_match"
    )
    .map((field) => ({
      field: field.field,
      score: field.score,
      reason: field.reason,
    }));
}

export function createShadowHistoryRecord(
  input: CreateShadowHistoryRecordInput
): ShadowHistoryRecord {
  return {
    ...input,
    id: randomUUID(),
    version:
      AI_CEO_SHADOW_STORAGE_TYPES_VERSION,
    storedAt: new Date().toISOString(),
    overallScore: clampScore(
      input.overallScore
    ),
  };
}

export function mapShadowRunToHistoryRecord(
  result: CEOShadowRunResult,
  metadata: Record<string, unknown> = {}
): ShadowHistoryRecord {
  const comparison = result.comparison;

  return createShadowHistoryRecord({
    runAt: result.runAt,

    legacySource:
      result.legacy.success
        ? result.legacy.source
        : "unavailable",

    zaosStage:
      result.zaos?.stage ?? null,

    success: result.success,
    skipped: result.skipped,
    acceptable: result.acceptable,

    comparisonStatus:
      comparison?.status ?? null,

    outcome: determineOutcome(result),

    overallScore:
      comparison?.overallScore ?? null,

    legacyDurationMs:
      result.legacyDurationMs,

    zaosDurationMs:
      result.zaosDurationMs,

    recommendationCount:
      result.zaos?.recommendations.length ??
      0,

    delegationCount:
      result.zaos?.delegations.length ??
      0,

    matchingPriorityIds:
      comparison?.matchingPriorityIds ?? [],

    missingPriorityIds:
      comparison?.missingPriorityIds ?? [],

    extraPriorityIds:
      comparison?.extraPriorityIds ?? [],

    matchingActionKeys:
      comparison?.matchingActionKeys ?? [],

    mismatchedActionKeys:
      comparison?.mismatchedActionKeys ?? [],

    mismatches:
      extractMismatches(
        comparison?.fields ?? []
      ),

    error: result.error,

    metadata,
  });
}

function average(
  values: number[]
): number | null {
  if (values.length === 0) {
    return null;
  }

  return Number(
    (
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    ).toFixed(2)
  );
}

function repeatedValues(
  values: string[],
  minimumOccurrences = 2
): string[] {
  const counts =
    new Map<string, number>();

  for (const value of values) {
    counts.set(
      value,
      (counts.get(value) ?? 0) + 1
    );
  }

  return [...counts.entries()]
    .filter(
      ([, count]) =>
        count >= minimumOccurrences
    )
    .map(([value]) => value)
    .sort();
}

function calculateReadiness(
  records: ShadowHistoryRecord[],
  averageScore: number | null,
  repeatedMismatchFields: string[]
): {
  readiness: ShadowMigrationReadiness;
  reasons: string[];
} {
  const completed = records.filter(
    (record) =>
      !record.skipped &&
      record.outcome !== "failed" &&
      record.overallScore !== null
  );

  const recent = completed.slice(0, 20);

  const acceptableCount =
    recent.filter(
      (record) =>
        record.acceptable === true
    ).length;

  const unacceptableCount =
    recent.filter(
      (record) =>
        record.acceptable === false
    ).length;

  if (completed.length < 10) {
    return {
      readiness: "observing",
      reasons: [
        "At least 10 completed shadow comparisons are required.",
      ],
    };
  }

  if (
    averageScore !== null &&
    averageScore >= 95 &&
    unacceptableCount === 0 &&
    repeatedMismatchFields.length === 0
  ) {
    return {
      readiness: "ready",
      reasons: [
        "Average score is at least 95.",
        "No unacceptable recent runs were detected.",
        "No repeated mismatch fields were detected.",
      ],
    };
  }

  if (
    averageScore !== null &&
    averageScore >= 85 &&
    acceptableCount >=
      Math.ceil(recent.length * 0.9)
  ) {
    return {
      readiness: "candidate",
      reasons: [
        "Average score is at least 85.",
        "At least 90% of recent runs are acceptable.",
      ],
    };
  }

  return {
    readiness: "not_ready",
    reasons: [
      averageScore === null
        ? "No comparable shadow scores are available."
        : `Average score is ${averageScore}.`,
      unacceptableCount > 0
        ? `${unacceptableCount} recent run(s) were unacceptable.`
        : "No unacceptable recent runs were detected.",
      repeatedMismatchFields.length > 0
        ? `Repeated mismatch fields: ${repeatedMismatchFields.join(", ")}.`
        : "No repeated mismatch fields were detected.",
    ],
  };
}

export function calculateShadowHistoryStats(
  records: ShadowHistoryRecord[]
): ShadowHistoryStats {
  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.runAt).getTime() -
      new Date(a.runAt).getTime()
  );

  const scores = sorted
    .map((record) => record.overallScore)
    .filter(
      (score): score is number =>
        score !== null
    );

  const mismatchFields =
    sorted.flatMap((record) =>
      record.mismatches.map(
        (mismatch) => mismatch.field
      )
    );

  const recentMismatchFields =
    [...new Set(
      sorted
        .slice(0, 20)
        .flatMap((record) =>
          record.mismatches.map(
            (mismatch) => mismatch.field
          )
        )
    )].sort();

  const repeatedMismatchFields =
    repeatedValues(mismatchFields);

  const averageScore =
    average(scores);

  const readiness =
    calculateReadiness(
      sorted,
      averageScore,
      repeatedMismatchFields
    );

  return {
    totalRuns: sorted.length,

    successfulRuns:
      sorted.filter(
        (record) => record.success
      ).length,

    failedRuns:
      sorted.filter(
        (record) =>
          record.outcome === "failed"
      ).length,

    skippedRuns:
      sorted.filter(
        (record) => record.skipped
      ).length,

    matchedRuns:
      sorted.filter(
        (record) =>
          record.outcome === "match"
      ).length,

    partialMatchRuns:
      sorted.filter(
        (record) =>
          record.outcome ===
          "partial_match"
      ).length,

    mismatchedRuns:
      sorted.filter(
        (record) =>
          record.outcome === "mismatch"
      ).length,

    unavailableRuns:
      sorted.filter(
        (record) =>
          record.outcome ===
          "unavailable"
      ).length,

    acceptableRuns:
      sorted.filter(
        (record) =>
          record.acceptable === true
      ).length,

    unacceptableRuns:
      sorted.filter(
        (record) =>
          record.acceptable === false
      ).length,

    averageScore,

    minimumScore:
      scores.length > 0
        ? Math.min(...scores)
        : null,

    maximumScore:
      scores.length > 0
        ? Math.max(...scores)
        : null,

    averageLegacyDurationMs:
      average(
        sorted.map(
          (record) =>
            record.legacyDurationMs
        )
      ),

    averageZAOSDurationMs:
      average(
        sorted.map(
          (record) =>
            record.zaosDurationMs
        )
      ),

    recentMismatchFields,
    repeatedMismatchFields,

    readiness:
      readiness.readiness,

    readinessReasons:
      readiness.reasons,
  };
}

function isWithinDateRange(
  value: string,
  from?: string,
  to?: string
): boolean {
  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (
    from &&
    timestamp <
      new Date(from).getTime()
  ) {
    return false;
  }

  if (
    to &&
    timestamp >
      new Date(to).getTime()
  ) {
    return false;
  }

  return true;
}

export function filterShadowHistory(
  records: ShadowHistoryRecord[],
  query: ShadowHistoryQuery = {}
): ShadowHistoryRecord[] {
  return [...records]
    .filter((record) => {
      if (
        query.minimumScore !== undefined &&
        (
          record.overallScore === null ||
          record.overallScore <
            query.minimumScore
        )
      ) {
        return false;
      }

      if (
        query.maximumScore !== undefined &&
        (
          record.overallScore === null ||
          record.overallScore >
            query.maximumScore
        )
      ) {
        return false;
      }

      if (
        query.status !== undefined &&
        record.comparisonStatus !==
          query.status
      ) {
        return false;
      }

      if (
        query.acceptable !== undefined &&
        record.acceptable !==
          query.acceptable
      ) {
        return false;
      }

      if (
        query.success !== undefined &&
        record.success !== query.success
      ) {
        return false;
      }

      return isWithinDateRange(
        record.runAt,
        query.from,
        query.to
      );
    })
    .sort(
      (a, b) =>
        new Date(b.runAt).getTime() -
        new Date(a.runAt).getTime()
    )
    .slice(
      0,
      Math.max(
        0,
        query.limit ?? 100
      )
    );
}

export class InMemoryShadowHistoryStore
  implements ShadowHistoryStore {
  private readonly records:
    ShadowHistoryRecord[] = [];

  public async save(
    record: ShadowHistoryRecord
  ): Promise<void> {
    this.records.push(record);
  }

  public async list(
    query?: ShadowHistoryQuery
  ): Promise<ShadowHistoryRecord[]> {
    return filterShadowHistory(
      this.records,
      query
    );
  }

  public async findById(
    id: string
  ): Promise<ShadowHistoryRecord | null> {
    return (
      this.records.find(
        (record) => record.id === id
      ) ?? null
    );
  }

  public async count(): Promise<number> {
    return this.records.length;
  }
}