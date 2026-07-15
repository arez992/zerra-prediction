import "server-only";

import {
  evaluateLearningOutcome,
  type LearningEvaluationInput,
  type LearningEvaluationResult,
} from "./evaluator";
import {
  saveLearningRecord,
} from "./storage";

export type LearningRecordWriteResult = {
  success: boolean;

  evaluation:
    | LearningEvaluationResult
    | null;

  recordId:
    | string
    | null;

  error:
    | string
    | null;
};

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unable to record ZAOS learning outcome.";
}

export async function recordLearningOutcome(
  input: LearningEvaluationInput
): Promise<LearningRecordWriteResult> {
  try {
    const evaluation =
      evaluateLearningOutcome(
        input
      );

    await saveLearningRecord(
      evaluation.record
    );

    return {
      success: true,
      evaluation,
      recordId:
        evaluation.record.id,
      error: null,
    };
  } catch (error) {
    const message =
      getErrorMessage(error);

    console.error(
      "[ZAOS_LEARNING_RECORD_ERROR]",
      {
        agent:
          input.agent,
        recommendationId:
          input.recommendationId,
        recommendationType:
          input.recommendationType,
        error: message,
      }
    );

    return {
      success: false,
      evaluation: null,
      recordId: null,
      error: message,
    };
  }
}

export async function recordLearningOutcomeSafely(
  input: LearningEvaluationInput
): Promise<void> {
  await recordLearningOutcome(
    input
  );
}