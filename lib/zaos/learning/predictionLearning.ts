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
  predictionId:
    string;

  fixtureId:
    string;

  correct:
    boolean;

  result:
    string;

  /*
   * Legacy/backward-compatible fields.
   */
  valueBet?:
    string | null;

  finalPrediction?:
    string | null;

  /*
   * Canonical ZERRA Market Architecture.
   */
  primaryMarketCategory?:
    string | null;

  primaryPick?:
    string | null;

  primaryQualified?:
    boolean | null;

  primaryConfidence?:
    number | null;

  confidence?:
    number | null;

  risk?:
    string | null;

  modelVersion?:
    string | null;

  exactScore?:
    string | null;

  actual?: {
    homeGoals?:
      number;

    awayGoals?:
      number;

    totalGoals?:
      number;

    actualWinner?:
      string;

    btts?:
      boolean;

    over25?:
      boolean;

    under25?:
      boolean;

    exactScore?:
      string;
  } | null;
};

const COLLECTION =
  "zaosLearning";

function normalizeText(
  value:
    unknown
):
  string | null {
  return (
    typeof value ===
      "string" &&
    value.trim()
  )
    ? value.trim()
    : null;
}

function normalizeNumber(
  value:
    unknown
):
  number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}

function normalizeBoolean(
  value:
    unknown
):
  boolean | null {
  return (
    typeof value ===
      "boolean"
  )
    ? value
    : null;
}

function normalizeIdPart(
  value:
    string
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

function normalizeTag(
  value:
    string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function createLearningRecordId(
  predictionId:
    string
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

  if (
    !predictionId
  ) {
    throw new Error(
      "Prediction ID is required for prediction learning."
    );
  }

  if (
    !fixtureId
  ) {
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

  const primaryMarketCategory =
    normalizeText(
      input
        .primaryMarketCategory
    );

  const primaryPick =
    normalizeText(
      input.primaryPick
    );

  const primaryQualified =
    normalizeBoolean(
      input
        .primaryQualified
    );

  const primaryConfidence =
    normalizeNumber(
      input
        .primaryConfidence
    );

  const confidence =
    normalizeNumber(
      input.confidence
    );

  const risk =
    normalizeText(
      input.risk
    );

  const modelVersion =
    normalizeText(
      input.modelVersion
    );

  const exactScore =
    normalizeText(
      input.exactScore
    );

  const canonicalConfidence =
    primaryConfidence ??
    confidence;

  const canonicalPick =
    primaryPick ??
    finalPrediction ??
    valueBet;

  const outcomeLabel =
    input.correct
      ? "correct"
      : "incorrect";

  /*
   * Reuse the existing ZAOS evaluator
   * so prediction learning remains
   * compatible with the global learning
   * metrics and dashboard.
   *
   * The primary market fields allow
   * future Accuracy/Calibration systems
   * to evaluate performance by:
   *
   * - market family
   * - market pick
   * - confidence
   * - qualification state
   * - model version
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
        `Prediction ${predictionId} was settled as ${outcomeLabel}. ` +
        `Primary pick: ${canonicalPick || "unknown"}. ` +
        `Final result: ${input.result}.`,

      executionData: {
        predictionId,

        fixtureId,

        correct:
          input.correct,

        result:
          input.result,

        /*
         * Canonical market-learning data.
         */
        primaryMarketCategory,

        primaryPick,

        primaryQualified,

        primaryConfidence,

        /*
         * Backward-compatible fields.
         */
        valueBet,

        finalPrediction,

        confidence,

        canonicalConfidence,

        canonicalPick,

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

        ...(primaryMarketCategory
          ? [
              `market-${normalizeTag(
                primaryMarketCategory
              )}`,
            ]
          : []),

        ...(primaryPick
          ? [
              `pick-${normalizeTag(
                primaryPick
              )}`,
            ]
          : []),

        ...(primaryQualified ===
        true
          ? [
              "qualified",
            ]
          : []),

        ...(valueBet
          ? [
              normalizeTag(
                valueBet
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

        /*
         * Canonical ZERRA prediction.
         */
        primaryMarketCategory,

        primaryPick,

        primaryQualified,

        primaryConfidence,

        canonicalPick,

        canonicalConfidence,

        /*
         * Legacy compatibility.
         */
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