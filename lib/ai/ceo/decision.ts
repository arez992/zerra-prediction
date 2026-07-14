import {
  CEO_ENGINE_VERSION,
  type CEOActionDecision,
  type CEOActionKey,
  type CEOActions,
  type CEODecision,
  type CEOHealth,
  type CEOOpportunity,
  type CEOPriority,
  type CEORisk,
} from "./types";

const ACTION_KEYS: CEOActionKey[] = [
  "publishPredictions",
  "publishArticles",
  "promoteVip",
  "pauseMarketing",
  "improveSeo",
  "retrainAi",
  "investigateApi",
];

const HEALTH_VALUES: CEOHealth[] = [
  "Excellent",
  "Good",
  "Warning",
  "Critical",
];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asString(
  value: unknown,
  fallback = ""
): string {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function asBoolean(
  value: unknown
): boolean {
  return value === true;
}

function asNumber(
  value: unknown,
  fallback = 0
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : fallback;
}

function asStringArray(
  value: unknown,
  limit = 20
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeAction(
  value: unknown,
  key: CEOActionKey
): CEOActionDecision {
  const source = isRecord(value)
    ? value
    : {};

  const mustRequireApproval =
    key !== "investigateApi";

  return {
    enabled: asBoolean(source.enabled),
    requiresApproval:
      mustRequireApproval ||
      asBoolean(
        source.requiresApproval
      ),
    reason:
      asString(source.reason) ||
      "No verified reason was provided.",
  };
}

function normalizeActions(
  value: unknown
): CEOActions {
  const source = isRecord(value)
    ? value
    : {};

  return ACTION_KEYS.reduce(
    (result, key) => {
      result[key] =
        normalizeAction(
          source[key],
          key
        );

      return result;
    },
    {} as CEOActions
  );
}

function normalizePriority(
  value: unknown,
  index: number
): CEOPriority | null {
  if (!isRecord(value)) {
    return null;
  }

  const impact =
    value.impact === "High" ||
    value.impact === "Medium"
      ? value.impact
      : "Low";

  const urgency =
    value.urgency === "High" ||
    value.urgency === "Medium"
      ? value.urgency
      : "Low";

  const actionKey =
    typeof value.actionKey ===
      "string" &&
    ACTION_KEYS.includes(
      value.actionKey as CEOActionKey
    )
      ? (value.actionKey as CEOActionKey)
      : null;

  const title =
    asString(value.title);

  const reason =
    asString(value.reason);

  if (!title || !reason) {
    return null;
  }

  return {
    id:
      asString(value.id) ||
      `priority-${index + 1}`,
    title,
    reason,
    impact,
    urgency,
    requiresApproval:
      actionKey === "investigateApi"
        ? asBoolean(
            value.requiresApproval
          )
        : true,
    actionKey,
  };
}

function normalizeRisk(
  value: unknown
): CEORisk | null {
  if (!isRecord(value)) {
    return null;
  }

  const title =
    asString(value.title);

  const reason =
    asString(value.reason);

  if (!title || !reason) {
    return null;
  }

  const level =
    value.level === "Critical" ||
    value.level === "High" ||
    value.level === "Medium"
      ? value.level
      : "Low";

  return {
    title,
    level,
    reason,
    mitigation:
      asString(value.mitigation) ||
      "Human review is required.",
  };
}

function normalizeOpportunity(
  value: unknown
): CEOOpportunity | null {
  if (!isRecord(value)) {
    return null;
  }

  const title =
    asString(value.title);

  const reason =
    asString(value.reason);

  if (!title || !reason) {
    return null;
  }

  const expectedImpact =
    value.expectedImpact === "High" ||
    value.expectedImpact === "Medium"
      ? value.expectedImpact
      : "Low";

  return {
    title,
    reason,
    expectedImpact,
    nextStep:
      asString(value.nextStep) ||
      "Collect more evidence before action.",
  };
}

export function extractJsonObject(
  raw: string
): string {
  const trimmed = raw.trim();

  if (
    trimmed.startsWith("{") &&
    trimmed.endsWith("}")
  ) {
    return trimmed;
  }

  const firstBrace =
    trimmed.indexOf("{");

  const lastBrace =
    trimmed.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    throw new Error(
      "AI CEO response did not contain a JSON object."
    );
  }

  return trimmed.slice(
    firstBrace,
    lastBrace + 1
  );
}

export function parseCEODecision(
  raw: string
): CEODecision {
  const parsed = JSON.parse(
    extractJsonObject(raw)
  ) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(
      "AI CEO decision must be a JSON object."
    );
  }

  const health =
    typeof parsed.overallHealth ===
      "string" &&
    HEALTH_VALUES.includes(
      parsed.overallHealth as CEOHealth
    )
      ? (parsed.overallHealth as CEOHealth)
      : "Warning";

  const priorities = Array.isArray(
    parsed.todayPriorities
  )
    ? parsed.todayPriorities
        .map(normalizePriority)
        .filter(
          (
            item
          ): item is CEOPriority =>
            item !== null
        )
        .slice(0, 10)
    : [];

  const risks = Array.isArray(
    parsed.risks
  )
    ? parsed.risks
        .map(normalizeRisk)
        .filter(
          (
            item
          ): item is CEORisk =>
            item !== null
        )
        .slice(0, 10)
    : [];

  const opportunities =
    Array.isArray(
      parsed.opportunities
    )
      ? parsed.opportunities
          .map(
            normalizeOpportunity
          )
          .filter(
            (
              item
            ): item is CEOOpportunity =>
              item !== null
          )
          .slice(0, 10)
      : [];

  return {
    version:
      asString(parsed.version) ||
      CEO_ENGINE_VERSION,
    generatedAt:
      asString(parsed.generatedAt) ||
      new Date().toISOString(),
    summary:
      asString(parsed.summary) ||
      "Insufficient verified data for a complete executive summary.",
    confidence: Math.min(
      100,
      Math.max(
        0,
        asNumber(
          parsed.confidence,
          0
        )
      )
    ),
    overallHealth: health,
    insufficientData:
      asStringArray(
        parsed.insufficientData
      ),
    todayPriorities:
      priorities,
    actions:
      normalizeActions(
        parsed.actions
      ),
    risks,
    opportunities,
    evidence:
      asStringArray(
        parsed.evidence
      ),
  };
}