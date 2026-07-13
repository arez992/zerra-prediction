import {
  runPredictionPipeline,
  type PredictionPipelineInput,
  type PredictionPipelineResult,
} from "./pipeline";

export type PredictionEngineResult = {
  success: true;
  data: PredictionPipelineResult;
};

export type PredictionEngineFailure = {
  success: false;
  error: string;
};

export async function runPredictionEngine(
  input: PredictionPipelineInput
): Promise<
  PredictionEngineResult | PredictionEngineFailure
> {
  try {
    const data =
      await runPredictionPipeline(input);

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to run prediction engine.",
    };
  }
}