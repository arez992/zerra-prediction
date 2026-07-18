import "server-only";

import {
  recordLearningOutcomeSafely,
} from "./recorder";

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
    Number.isFinite(value)
    ? value
    : null;
}

export async function recordPredictionLearning(
  input: PredictionLearningInput
): Promise<void> {
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

  await recordLearningOutcomeSafely({
    agent:
      "prediction",

    /*
     * The prediction document becomes
     * the learning system's reference ID.
     */
    recommendationId:
      input.predictionId,

    recommendationType:
      "prediction-settlement",

    /*
     * A settled prediction is always
     * considered completed.
     *
     * executionSuccess represents whether
     * the prediction itself was correct.
     */
    executionSuccess:
      input.correct,

    executionCompleted:
      true,

    executionMessage:
      `Prediction ${input.predictionId} was settled as ${outcomeLabel}. Final result: ${input.result}.`,

    executionData: {
      predictionId:
        input.predictionId,

      fixtureId:
        input.fixtureId,

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

      predictionId:
        input.predictionId,

      fixtureId:
        input.fixtureId,

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
}