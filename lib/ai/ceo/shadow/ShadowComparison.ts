import "server-only";

import type {
  CEOActionKey,
  CEODecision,
  CEOEngineResult,
} from "../types";
import type {
  OrchestratorResult,
} from "@/lib/zaos/orchestration/DecisionOrchestrator";

export const AI_CEO_SHADOW_COMPARISON_VERSION = "1.0.0";

export type ShadowComparisonStatus =
  | "match"
  | "partial_match"
  | "mismatch"
  | "unavailable";

export type ShadowFieldComparison = {
  field: string;
  status: ShadowComparisonStatus;
  legacyValue: unknown;
  zaosValue: unknown;
  score: number;
  reason: string;
};

export type ShadowComparisonResult = {
  version: string;
  comparedAt: string;
  status: ShadowComparisonStatus;
  overallScore: number;

  legacyAvailable: boolean;
  zaosAvailable: boolean;

  fields: ShadowFieldComparison[];

  matchingPriorityIds: string[];
  missingPriorityIds: string[];
  extraPriorityIds: string[];

  matchingActionKeys: CEOActionKey[];
  mismatchedActionKeys: CEOActionKey[];

  notes: string[];
};

const ACTION_KEYS: CEOActionKey[] = [
  "publishPredictions",
  "publishArticles",
  "promoteVip",
  "pauseMarketing",
  "improveSeo",
  "retrainAi",
  "investigateApi",
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function textSimilarity(
  first: unknown,
  second: unknown
): number {
  const a = normalizeText(first);
  const b = normalizeText(second);

  if (!a && !b) return 100;
  if (!a || !b) return 0;
  if (a === b) return 100;

  const aWords = new Set(a.split(" "));
  const bWords = new Set(b.split(" "));

  const intersection = [...aWords].filter(
    (word) => bWords.has(word)
  ).length;

  const union = new Set([
    ...aWords,
    ...bWords,
  ]).size;

  return union === 0
    ? 100
    : Math.round(
        (intersection / union) * 100
      );
}

function numberSimilarity(
  first: unknown,
  second: unknown,
  tolerance = 10
): number {
  const a = Number(first);
  const b = Number(second);

  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return 0;
  }

  const difference = Math.abs(a - b);

  if (difference === 0) return 100;
  if (difference >= tolerance) return 0;

  return Math.round(
    100 - (difference / tolerance) * 100
  );
}

function getFieldStatus(
  score: number
): ShadowComparisonStatus {
  if (score >= 90) return "match";
  if (score >= 60) return "partial_match";
  return "mismatch";
}

function fieldComparison(
  field: string,
  legacyValue: unknown,
  zaosValue: unknown,
  score: number,
  reason: string
): ShadowFieldComparison {
  return {
    field,
    status: getFieldStatus(score),
    legacyValue,
    zaosValue,
    score,
    reason,
  };
}

function getLegacyDecision(
  result: CEOEngineResult
): CEODecision | null {
  return result.success
    ? result.decision
    : null;
}

function getZAOSPriorityIds(
  orchestration: OrchestratorResult
): string[] {
  return orchestration.recommendations.map(
    (recommendation) => recommendation.id
  );
}

function getZAOSActionKeys(
  orchestration: OrchestratorResult
): CEOActionKey[] {
  return orchestration.delegations
    .map((delegation) => delegation.taskType)
    .filter(
      (value): value is CEOActionKey =>
        ACTION_KEYS.includes(
          value as CEOActionKey
        )
    );
}

export function compareCEOShadowResults(
  legacyResult: CEOEngineResult,
  orchestration: OrchestratorResult
): ShadowComparisonResult {
  const legacyDecision =
    getLegacyDecision(legacyResult);

  const zaosDecision =
    orchestration.decision;

  if (!legacyDecision || !zaosDecision) {
    return {
      version:
        AI_CEO_SHADOW_COMPARISON_VERSION,
      comparedAt: new Date().toISOString(),
      status: "unavailable",
      overallScore: 0,
      legacyAvailable:
        legacyDecision !== null,
      zaosAvailable:
        zaosDecision !== null,
      fields: [],
      matchingPriorityIds: [],
      missingPriorityIds: [],
      extraPriorityIds: [],
      matchingActionKeys: [],
      mismatchedActionKeys: [],
      notes: [
        !legacyDecision
          ? "Legacy CEO decision was unavailable."
          : "",
        !zaosDecision
          ? "ZAOS CEO decision was unavailable."
          : "",
      ].filter(Boolean),
    };
  }

  const legacyPriorityIds =
    legacyDecision.todayPriorities.map(
      (priority) => priority.id
    );

  const zaosPriorityIds =
    getZAOSPriorityIds(orchestration);

  const matchingPriorityIds =
    legacyPriorityIds.filter((id) =>
      zaosPriorityIds.includes(id)
    );

  const missingPriorityIds =
    legacyPriorityIds.filter(
      (id) => !zaosPriorityIds.includes(id)
    );

  const extraPriorityIds =
    zaosPriorityIds.filter(
      (id) => !legacyPriorityIds.includes(id)
    );

  const legacyEnabledActions =
    ACTION_KEYS.filter(
      (key) =>
        legacyDecision.actions[key].enabled
    );

  const zaosActionKeys =
    getZAOSActionKeys(orchestration);

  const matchingActionKeys =
    legacyEnabledActions.filter((key) =>
      zaosActionKeys.includes(key)
    );

  const mismatchedActionKeys =
    ACTION_KEYS.filter((key) => {
      const legacyEnabled =
        legacyEnabledActions.includes(key);
      const zaosEnabled =
        zaosActionKeys.includes(key);

      return legacyEnabled !== zaosEnabled;
    });

  const priorityScore =
    legacyPriorityIds.length === 0 &&
    zaosPriorityIds.length === 0
      ? 100
      : Math.round(
          (
            matchingPriorityIds.length /
            Math.max(
              legacyPriorityIds.length,
              zaosPriorityIds.length,
              1
            )
          ) * 100
        );

  const actionScore =
    ACTION_KEYS.length === 0
      ? 100
      : Math.round(
          (
            (ACTION_KEYS.length -
              mismatchedActionKeys.length) /
            ACTION_KEYS.length
          ) * 100
        );

  const fields: ShadowFieldComparison[] = [
    fieldComparison(
      "summary",
      legacyDecision.summary,
      zaosDecision.summary,
      textSimilarity(
        legacyDecision.summary,
        zaosDecision.summary
      ),
      "Semantic word-overlap comparison."
    ),
    fieldComparison(
      "confidence",
      legacyDecision.confidence,
      zaosDecision.confidence,
      numberSimilarity(
        legacyDecision.confidence,
        zaosDecision.confidence,
        10
      ),
      "Confidence difference measured with a 10-point tolerance."
    ),
    fieldComparison(
      "priorities",
      legacyPriorityIds,
      zaosPriorityIds,
      priorityScore,
      "Priority IDs compared as sets."
    ),
    fieldComparison(
      "actions",
      legacyEnabledActions,
      zaosActionKeys,
      actionScore,
      "Enabled legacy actions compared with ZAOS delegations."
    ),
    fieldComparison(
      "evidence",
      legacyDecision.evidence,
      zaosDecision.evidence,
      textSimilarity(
        legacyDecision.evidence.join(" "),
        zaosDecision.evidence.join(" ")
      ),
      "Evidence compared by normalized word overlap."
    ),
  ];

  const overallScore = Math.round(
    fields.reduce(
      (sum, item) => sum + item.score,
      0
    ) / Math.max(fields.length, 1)
  );

  return {
    version:
      AI_CEO_SHADOW_COMPARISON_VERSION,
    comparedAt: new Date().toISOString(),
    status: getFieldStatus(overallScore),
    overallScore,
    legacyAvailable: true,
    zaosAvailable: true,
    fields,
    matchingPriorityIds,
    missingPriorityIds,
    extraPriorityIds,
    matchingActionKeys,
    mismatchedActionKeys,
    notes: [
      `Legacy source: ${
        legacyResult.success
          ? legacyResult.source
          : "unavailable"
      }.`,
      `ZAOS stage: ${orchestration.stage}.`,
      "Shadow comparison does not change production data or the user-visible legacy result.",
    ],
  };
}