import "server-only";

import { randomUUID } from "crypto";

import {
  ZAOS_LEARNING_VERSION,
  type LearningAgent,
  type LearningMetricsSnapshot,
  type LearningOutcome,
  type LearningRecord,
} from "./types";

export type LearningEvaluationInput = {
  agent: LearningAgent;
  recommendationId: string;
  recommendationType: string;
  createdAt?: string | null;
  completedAt?: string | null;
  executionSuccess: boolean;
  executionCompleted: boolean;
  executionMessage?: string | null;
  executionData?: Record<string, unknown> | null;
  metricsBefore?: LearningMetricsSnapshot;
  metricsAfter?: LearningMetricsSnapshot;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type LearningEvaluationResult = {
  outcome: LearningOutcome;
  score: number;
  notes: string[];
  record: LearningRecord;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeDate(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;

  const parsed = Date.parse(value);

  return Number.isFinite(parsed)
    ? new Date(parsed).toISOString()
    : fallback;
}

function getNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function evaluatePaymentAudit(
  input: LearningEvaluationInput
): {
  outcome: LearningOutcome;
  score: number;
  notes: string[];
} {
  const data = input.executionData ?? {};

  const total = getNumber(data.total) ?? 0;
  const completed = getNumber(data.completed) ?? 0;
  const pending = getNumber(data.pending) ?? 0;
  const failed = getNumber(data.failed) ?? 0;
  const unknown = getNumber(data.unknown) ?? 0;
  const successRate = getNumber(data.successRate);

  const notes: string[] = [
    `Payment audit inspected ${total} payment record(s).`,
    `Completed payments: ${completed}.`,
    `Pending payments: ${pending}.`,
    `Failed payments: ${failed}.`,
    `Unknown payment statuses: ${unknown}.`,
  ];

  if (
    !input.executionSuccess ||
    !input.executionCompleted
  ) {
    notes.push(
      input.executionMessage ||
        "Payment audit execution did not complete successfully."
    );

    return {
      outcome: "failure",
      score: 0,
      notes,
    };
  }

  notes.push(
    "Payment audit execution completed successfully."
  );

  if (successRate !== null) {
    notes.push(
      `Observed payment success rate: ${successRate}%.`
    );
  }

  if (total === 0) {
    notes.push(
      "The audit completed, but there were no payment records to evaluate."
    );

    return {
      outcome: "neutral",
      score: 60,
      notes,
    };
  }

  if (
    failed === 0 &&
    unknown === 0 &&
    pending === 0
  ) {
    notes.push(
      "Payment health is strong in the inspected data."
    );

    return {
      outcome: "success",
      score:
        successRate !== null
          ? clampScore(Math.max(85, successRate))
          : 90,
      notes,
    };
  }

  if (
    successRate !== null &&
    successRate >= 80 &&
    unknown === 0
  ) {
    notes.push(
      "The audit completed and payment health is acceptable, although some records still need attention."
    );

    return {
      outcome: "success",
      score: clampScore(successRate),
      notes,
    };
  }

  if (
    successRate !== null &&
    successRate >= 50
  ) {
    notes.push(
      "The audit completed successfully, but payment health needs improvement."
    );

    return {
      outcome: "neutral",
      score: clampScore(Math.max(50, successRate)),
      notes,
    };
  }

  notes.push(
    "The audit completed successfully and identified serious payment-health issues requiring follow-up."
  );

  return {
    outcome: "neutral",
    score:
      successRate !== null
        ? clampScore(Math.max(35, successRate))
        : 40,
    notes,
  };
}

function evaluateExecutionPlan(
  input: LearningEvaluationInput
): {
  outcome: LearningOutcome;
  score: number;
  notes: string[];
} {
  const data = input.executionData ?? {};
  const planCreated = data.planCreated === true;
  const requiresSpecializedExecutor =
    data.requiresSpecializedExecutor === true;

  const notes = input.executionMessage
    ? [input.executionMessage]
    : [];

  if (!input.executionSuccess) {
    return {
      outcome: "failure",
      score: 0,
      notes: [
        ...notes,
        "Execution plan creation failed.",
      ],
    };
  }

  if (
    input.executionCompleted &&
    planCreated &&
    requiresSpecializedExecutor
  ) {
    return {
      outcome: "neutral",
      score: 60,
      notes: [
        ...notes,
        "A valid execution plan was created, but final business impact has not been measured yet.",
      ],
    };
  }

  if (
    input.executionCompleted &&
    planCreated
  ) {
    return {
      outcome: "success",
      score: 75,
      notes: [
        ...notes,
        "Execution plan was created successfully.",
      ],
    };
  }

  return {
    outcome: "neutral",
    score: 40,
    notes: [
      ...notes,
      "The execution plan exists, but completion evidence is incomplete.",
    ],
  };
}

function evaluateGenericExecution(
  input: LearningEvaluationInput
): {
  outcome: LearningOutcome;
  score: number;
  notes: string[];
} {
  const notes = input.executionMessage
    ? [input.executionMessage]
    : [];

  if (!input.executionSuccess) {
    return {
      outcome: "failure",
      score: 0,
      notes: [
        ...notes,
        "Execution failed.",
      ],
    };
  }

  if (input.executionCompleted) {
    return {
      outcome: "success",
      score: 80,
      notes: [
        ...notes,
        "Execution completed successfully.",
      ],
    };
  }

  return {
    outcome: "neutral",
    score: 50,
    notes: [
      ...notes,
      "Execution succeeded but is not yet complete.",
    ],
  };
}

function evaluateByType(
  input: LearningEvaluationInput
): {
  outcome: LearningOutcome;
  score: number;
  notes: string[];
} {
  switch (input.recommendationType) {
    case "payment-audit":
      return evaluatePaymentAudit(input);

    case "vip-conversion-review":
    case "registration-funnel-review":
    case "seo-metadata-optimization":
    case "create-country-landing-page":
    case "create-seo-content-cluster":
    case "growth-foundation-plan":
    case "controlled-user-acquisition":
      return evaluateExecutionPlan(input);

    default:
      return evaluateGenericExecution(input);
  }
}

export function evaluateLearningOutcome(
  input: LearningEvaluationInput
): LearningEvaluationResult {
  const now = new Date().toISOString();
  const evaluation = evaluateByType(input);

  const createdAt = normalizeDate(
    input.createdAt,
    now
  );

  const completedAt = normalizeDate(
    input.completedAt,
    now
  );

  const recommendationType =
    input.recommendationType.trim() ||
    "unknown";

  const record: LearningRecord = {
    id:
      `learning-${input.agent}-${input.recommendationId}-${randomUUID()}`,
    version: ZAOS_LEARNING_VERSION,
    agent: input.agent,
    recommendationId: input.recommendationId,
    recommendationType,
    createdAt,
    completedAt,
    outcome: evaluation.outcome,
    score: clampScore(evaluation.score),
    metricsBefore: input.metricsBefore ?? {},
    metricsAfter: input.metricsAfter ?? {},
    notes: evaluation.notes,
    tags: [
      input.agent,
      recommendationType,
      evaluation.outcome,
      ...(input.tags ?? []),
    ],
    metadata: {
      executionSuccess:
        input.executionSuccess,
      executionCompleted:
        input.executionCompleted,
      executionMessage:
        input.executionMessage ?? null,
      executionData:
        input.executionData ?? {},
      ...(input.metadata ?? {}),
    },
  };

  return {
    outcome: evaluation.outcome,
    score: record.score,
    notes: evaluation.notes,
    record,
  };
}