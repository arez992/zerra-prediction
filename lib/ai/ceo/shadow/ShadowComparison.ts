import "server-only";

import type {
  CEOActionKey,
  CEODecision,
  CEOEngineResult,
} from "../types";
import type {
  OrchestratorResult,
} from "@/lib/zaos/orchestration/DecisionOrchestrator";

export const AI_CEO_SHADOW_COMPARISON_VERSION = "1.1.0";

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

const FIELD_WEIGHTS: Record<string, number> = {
  priorities: 35,
  actions: 35,
  confidence: 10,
  summary: 10,
  evidence: 10,
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.%\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function tokenize(value: unknown): Set<string> {
  const normalized = normalizeText(value);

  if (!normalized) {
    return new Set();
  }

  return new Set(
    normalized
      .split(" ")
      .map((word) => word.trim())
      .filter(
        (word) =>
          word.length > 1 &&
          !STOP_WORDS.has(word)
      )
  );
}

function textSimilarity(
  first: unknown,
  second: unknown
): number {
  const a = normalizeText(first);
  const b = normalizeText(second);

  if (!a && !b) {
    return 100;
  }

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 100;
  }

  const aWords = tokenize(a);
  const bWords = tokenize(b);

  const intersection = [...aWords].filter(
    (word) => bWords.has(word)
  ).length;

  const union = new Set([
    ...aWords,
    ...bWords,
  ]).size;

  const jaccard =
    union === 0
      ? 100
      : (intersection / union) * 100;

  const containmentDenominator =
    Math.min(
      aWords.size,
      bWords.size
    );

  const containment =
    containmentDenominator === 0
      ? 0
      : (
          intersection /
          containmentDenominator
        ) * 100;

  return Math.round(
    jaccard * 0.6 +
    containment * 0.4
  );
}

function numberSimilarity(
  first: unknown,
  second: unknown,
  tolerance = 40
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

  if (difference === 0) {
    return 100;
  }

  if (difference >= tolerance) {
    return 0;
  }

  return Math.round(
    100 -
      (difference / tolerance) *
        100
  );
}

function getFieldStatus(
  score: number
): ShadowComparisonStatus {
  if (score >= 90) {
    return "match";
  }

  if (score >= 60) {
    return "partial_match";
  }

  return "mismatch";
}

function getOverallStatus(
  score: number,
  missingPriorityIds: string[],
  extraPriorityIds: string[],
  mismatchedActionKeys: CEOActionKey[]
): ShadowComparisonStatus {
  const businessMismatch =
    missingPriorityIds.length > 0 ||
    extraPriorityIds.length > 0 ||
    mismatchedActionKeys.length > 0;

  if (
    !businessMismatch &&
    score >= 90
  ) {
    return "match";
  }

  if (
    !businessMismatch &&
    score >= 60
  ) {
    return "partial_match";
  }

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
    status:
      getFieldStatus(score),
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
    (recommendation) =>
      recommendation.id
  );
}

function getZAOSActionKeys(
  orchestration: OrchestratorResult
): CEOActionKey[] {
  return orchestration.delegations
    .map(
      (delegation) =>
        delegation.taskType
    )
    .filter(
      (value): value is CEOActionKey =>
        ACTION_KEYS.includes(
          value as CEOActionKey
        )
    );
}

function calculateWeightedScore(
  fields: ShadowFieldComparison[]
): number {
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const field of fields) {
    const weight =
      FIELD_WEIGHTS[field.field] ?? 0;

    weightedTotal +=
      field.score * weight;

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(
    weightedTotal /
      totalWeight
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
      comparedAt:
        new Date().toISOString(),
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
    getZAOSPriorityIds(
      orchestration
    );

  const matchingPriorityIds =
    legacyPriorityIds.filter((id) =>
      zaosPriorityIds.includes(id)
    );

  const missingPriorityIds =
    legacyPriorityIds.filter(
      (id) =>
        !zaosPriorityIds.includes(id)
    );

  const extraPriorityIds =
    zaosPriorityIds.filter(
      (id) =>
        !legacyPriorityIds.includes(id)
    );

  const legacyEnabledActions =
    ACTION_KEYS.filter(
      (key) =>
        legacyDecision.actions[key]
          .enabled
    );

  const zaosActionKeys =
    getZAOSActionKeys(
      orchestration
    );

  const matchingActionKeys =
    legacyEnabledActions.filter((key) =>
      zaosActionKeys.includes(key)
    );

  const mismatchedActionKeys =
    ACTION_KEYS.filter((key) => {
      const legacyEnabled =
        legacyEnabledActions.includes(
          key
        );

      const zaosEnabled =
        zaosActionKeys.includes(key);

      return (
        legacyEnabled !== zaosEnabled
      );
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
          ) *
            100
        );

  const actionScore =
    ACTION_KEYS.length === 0
      ? 100
      : Math.round(
          (
            (
              ACTION_KEYS.length -
              mismatchedActionKeys.length
            ) /
            ACTION_KEYS.length
          ) *
            100
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
      "Normalized semantic word-overlap comparison. Summary has advisory weight only."
    ),
    fieldComparison(
      "confidence",
      legacyDecision.confidence,
      zaosDecision.confidence,
      numberSimilarity(
        legacyDecision.confidence,
        zaosDecision.confidence,
        40
      ),
      "Confidence difference measured with a 40-point tolerance because the engines use different confidence models."
    ),
    fieldComparison(
      "priorities",
      legacyPriorityIds,
      zaosPriorityIds,
      priorityScore,
      "Priority IDs compared as business-critical sets."
    ),
    fieldComparison(
      "actions",
      legacyEnabledActions,
      zaosActionKeys,
      actionScore,
      "Enabled legacy actions compared with ZAOS delegations as a business-critical field."
    ),
    fieldComparison(
      "evidence",
      legacyDecision.evidence,
      zaosDecision.evidence,
      textSimilarity(
        legacyDecision.evidence.join(
          " "
        ),
        zaosDecision.evidence.join(
          " "
        )
      ),
      "Evidence compared by normalized semantic overlap. Evidence wording has advisory weight."
    ),
  ];

  const overallScore =
    calculateWeightedScore(fields);

  return {
    version:
      AI_CEO_SHADOW_COMPARISON_VERSION,
    comparedAt:
      new Date().toISOString(),
    status:
      getOverallStatus(
        overallScore,
        missingPriorityIds,
        extraPriorityIds,
        mismatchedActionKeys
      ),
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
      "Priorities and actions carry 70% of the overall score because they represent business behavior.",
      "Summary, confidence, and evidence carry advisory weight and do not override business mismatches.",
      "Shadow comparison does not change production data or the user-visible legacy result.",
    ],
  };
}