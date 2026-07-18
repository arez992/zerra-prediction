import "server-only";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  evaluateLearningOutcome,
} from "./evaluator";

import type {
  LearningRecord,
} from "./types";

type PredictionLearningInput = {
  predictionId: string;
  fixtureId: string;

  correct: boolean;

  result: string;

  valueBet?: string | null;

  finalPrediction?:
    string | null;

  confidence?:
    number | null;

  risk?:
    string | null;

  modelVersion?:
    string | null;

  exactScore?:
    string | null;

  actual?: {
    homeGoals?: number;
    awayGoals?: number;
    totalGoals?: number;
    actualWinner?: string;
    btts?: boolean;
    over25?: boolean;
    under25?: boolean;
    exactScore?: string;
  } | null;
};

const COLLECTION =
  "zaosLearning";

function normalizeText(
  value: unknown
): string | null {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function normalizeNumber(
  value: unknown
): number | null {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
    ? value
    : null;
}

function normalizeIdPart(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9-_]/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );
}

function createLearningRecordId(
  predictionId: string
): string {
  /*
   * Deterministic ID.
   *
   * The same prediction can never create
   * multiple ZAOS learning records.
   *
   * Safe retries overwrite the same
   * learning document instead of creating
   * duplicates.
   */
  return `learning-prediction-${normalizeIdPart(
    predictionId
  )}`;
}

export async function recordPredictionLearning(
  input:
    PredictionLearningInput
): Promise<void> {
  const predictionId =
    normalizeText(
      input.predictionId
    );

  const fixtureId =
    normalizeText(
      input.fixtureId
    );

  if (!predictionId) {
    throw new Error(
      "Prediction ID is required for prediction learning."
    );
  }

  if (!fixtureId) {
    throw new Error(
      "Fixture ID is required for prediction learning."
    );
  }

  const valueBet =
    normalizeText(
      input.valueBet
    );

  const finalPrediction =
    normalizeText(
      input.finalPrediction
    );

  const modelVersion =
    normalizeText(
      input.modelVersion
    );

  const confidence =
    normalizeNumber(
      input.confidence
    );

  const risk =
    normalizeText(
      input.risk
    );

  const exactScore =
    normalizeText(
      input.exactScore
    );

  const outcomeLabel =
    input.correct
      ? "correct"
      : "incorrect";

  /*
   * Reuse the existing ZAOS evaluator
   * so prediction learning remains
   * compatible with the global learning
   * metrics and dashboard.
   */
  const evaluation =
    evaluateLearningOutcome({
      agent:
        "prediction",

      recommendationId:
        predictionId,

      recommendationType:
        "prediction-settlement",

      executionSuccess:
        input.correct,

      executionCompleted:
        true,

      executionMessage:
        `Prediction ${predictionId} was settled as ${outcomeLabel}. Final result: ${input.result}.`,

      executionData: {
        predictionId,

        fixtureId,

        correct:
          input.correct,

        result:
          input.result,

        valueBet,

        finalPrediction,

        confidence,

        risk,

        modelVersion,

        exactScore,

        actual:
          input.actual ||
          {},
      },

      tags: [
        "prediction",
        "settlement",
        outcomeLabel,

        ...(valueBet
          ? [
              valueBet
                .toLowerCase()
                .replace(
                  /\s+/g,
                  "-"
                ),
            ]
          : []),

        ...(modelVersion
          ? [
              modelVersion
                .toLowerCase(),
            ]
          : []),
      ],

      metadata: {
        source:
          "prediction-settlement-engine",

        predictionId,

        fixtureId,

        correct:
          input.correct,

        result:
          input.result,

        modelVersion,

        confidence,

        risk,

        valueBet,

        finalPrediction,

        exactScore,

        actual:
          input.actual ||
          {},
      },
    });

  const deterministicId =
    createLearningRecordId(
      predictionId
    );

  const record:
    LearningRecord = {
      ...evaluation.record,

      /*
       * Replace the evaluator's UUID-based
       * ID with a deterministic prediction
       * learning ID.
       */
      id:
        deterministicId,
  };

  /*
   * set() on a deterministic document ID
   * makes this operation idempotent.
   *
   * Retrying the same settled prediction
   * updates the same learning record.
   */
  await adminDb
    .collection(
      COLLECTION
    )
    .doc(
      deterministicId
    )
    .set(
      record,
      {
        merge:
          true,
      }
    );
}