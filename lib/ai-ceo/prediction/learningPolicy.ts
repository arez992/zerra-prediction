import "server-only";

import {
  getPredictionCalibrationSummary,
  type CalibrationGroupStats,
  type PredictionCalibrationSummary,
} from "@/lib/zaos/learning/predictionCalibration";

export type PredictionLearningPolicyDecision =
  | "insufficient-data"
  | "allow"
  | "caution"
  | "restrict-auto-publish";

export type PredictionLearningPolicyContext = {
  decision:
    PredictionLearningPolicyDecision;

  reason:
    string;

  sampleSize:
    number;

  safeguards: {
    automaticModelChanges:
      false;

    automaticModelDeployment:
      false;

    humanApprovalForModelChanges:
      true;
  };

  overall: {
    accuracy:
      number | null;

    averageConfidence:
      number | null;

    averageCalibrationError:
      number | null;

    highConfidenceFailureRate:
      number | null;
  };

  market:
    CalibrationGroupStats | null;

  model:
    CalibrationGroupStats | null;

  restrictions: {
    autoPublishAllowed:
      boolean;

    confidencePenalty:
      number;

    minimumConfidenceIncrease:
      number;
  };

  warnings:
    string[];
};

type EvaluatePredictionLearningPolicyInput = {
  marketCategory?:
    string | null;

  modelVersion?:
    string | null;
};

const MINIMUM_GLOBAL_SAMPLE =
  30;

const MINIMUM_MARKET_SAMPLE =
  20;

const MINIMUM_MODEL_SAMPLE =
  30;

const RESTRICT_ACCURACY_THRESHOLD =
  45;

const CAUTION_ACCURACY_THRESHOLD =
  55;

const RESTRICT_CALIBRATION_ERROR =
  35;

const CAUTION_CALIBRATION_ERROR =
  25;

const RESTRICT_HIGH_CONFIDENCE_FAILURE_RATE =
  50;

const CAUTION_HIGH_CONFIDENCE_FAILURE_RATE =
  35;

function normalizeText(
  value:
    unknown
): string | null {
  return (
    typeof value ===
      "string" &&
    value.trim()
  )
    ? value.trim()
    : null;
}

function findGroup(
  groups:
    CalibrationGroupStats[],

  key:
    string | null
): CalibrationGroupStats | null {
  if (!key) {
    return null;
  }

  const normalized =
    key.trim().toLowerCase();

  return (
    groups.find(
      (
        group
      ) =>
        group.key
          .trim()
          .toLowerCase() ===
        normalized
    ) ||
    null
  );
}

function hasReliableMarketSample(
  market:
    CalibrationGroupStats | null
): boolean {
  return Boolean(
    market &&
    market.total >=
      MINIMUM_MARKET_SAMPLE
  );
}

function hasReliableModelSample(
  model:
    CalibrationGroupStats | null
): boolean {
  return Boolean(
    model &&
    model.total >=
      MINIMUM_MODEL_SAMPLE
  );
}

function evaluateRestrictCondition(
  group:
    CalibrationGroupStats
): string | null {
  if (
    group.accuracy !==
      null &&
    group.accuracy <
      RESTRICT_ACCURACY_THRESHOLD
  ) {
    return `Accuracy is ${group.accuracy}%, below the ${RESTRICT_ACCURACY_THRESHOLD}% restriction threshold.`;
  }

  if (
    group.averageCalibrationError !==
      null &&
    group.averageCalibrationError >=
      RESTRICT_CALIBRATION_ERROR
  ) {
    return `Average calibration error is ${group.averageCalibrationError}%, above the ${RESTRICT_CALIBRATION_ERROR}% restriction threshold.`;
  }

  if (
    group.highConfidenceFailureRate !==
      null &&
    group.highConfidenceFailureRate >=
      RESTRICT_HIGH_CONFIDENCE_FAILURE_RATE
  ) {
    return `High-confidence failure rate is ${group.highConfidenceFailureRate}%, above the ${RESTRICT_HIGH_CONFIDENCE_FAILURE_RATE}% restriction threshold.`;
  }

  return null;
}

function evaluateCautionCondition(
  group:
    CalibrationGroupStats
): string | null {
  if (
    group.accuracy !==
      null &&
    group.accuracy <
      CAUTION_ACCURACY_THRESHOLD
  ) {
    return `Accuracy is ${group.accuracy}%, below the preferred ${CAUTION_ACCURACY_THRESHOLD}% level.`;
  }

  if (
    group.averageCalibrationError !==
      null &&
    group.averageCalibrationError >=
      CAUTION_CALIBRATION_ERROR
  ) {
    return `Average calibration error is ${group.averageCalibrationError}%, above the preferred ${CAUTION_CALIBRATION_ERROR}% level.`;
  }

  if (
    group.highConfidenceFailureRate !==
      null &&
    group.highConfidenceFailureRate >=
      CAUTION_HIGH_CONFIDENCE_FAILURE_RATE
  ) {
    return `High-confidence failure rate is ${group.highConfidenceFailureRate}%, above the preferred ${CAUTION_HIGH_CONFIDENCE_FAILURE_RATE}% level.`;
  }

  return null;
}

function buildBaseContext(
  summary:
    PredictionCalibrationSummary,

  market:
    CalibrationGroupStats | null,

  model:
    CalibrationGroupStats | null
) {
  return {
    sampleSize:
      summary
        .evaluablePredictions,

    safeguards: {
      automaticModelChanges:
        false as const,

      automaticModelDeployment:
        false as const,

      humanApprovalForModelChanges:
        true as const,
    },

    overall: {
      accuracy:
        summary
          .overall
          .accuracy,

      averageConfidence:
        summary
          .overall
          .averageConfidence,

      averageCalibrationError:
        summary
          .overall
          .averageCalibrationError,

      highConfidenceFailureRate:
        summary
          .overall
          .highConfidenceFailureRate,
    },

    market,

    model,

    warnings:
      summary
        .sampleWarnings,
  };
}

export async function evaluatePredictionLearningPolicy(
  input?:
    EvaluatePredictionLearningPolicyInput
): Promise<
  PredictionLearningPolicyContext
> {
  const summary =
    await getPredictionCalibrationSummary();

  const marketCategory =
    normalizeText(
      input
        ?.marketCategory
    );

  const modelVersion =
    normalizeText(
      input
        ?.modelVersion
    );

  const market =
    findGroup(
      summary
        .byMarketCategory,

      marketCategory
    );

  const model =
    findGroup(
      summary
        .byModelVersion,

      modelVersion
    );

  const base =
    buildBaseContext(
      summary,
      market,
      model
    );

  /*
   * Insufficient global sample.
   *
   * Learning exists, but it must not
   * tighten production behavior yet.
   */
  if (
    summary
      .evaluablePredictions <
    MINIMUM_GLOBAL_SAMPLE
  ) {
    return {
      ...base,

      decision:
        "insufficient-data",

      reason:
        `Prediction learning has only ${summary.evaluablePredictions} evaluable prediction(s). At least ${MINIMUM_GLOBAL_SAMPLE} are required before calibration data can influence auto-publishing.`,

      restrictions: {
        autoPublishAllowed:
          true,

        confidencePenalty:
          0,

        minimumConfidenceIncrease:
          0,
      },
    };
  }

  /*
   * Market-level restriction.
   *
   * Only apply when the market sample
   * is statistically meaningful.
   */
  if (
    hasReliableMarketSample(
      market
    )
  ) {
    const reason =
      evaluateRestrictCondition(
        market as CalibrationGroupStats
      );

    if (reason) {
      return {
        ...base,

        decision:
          "restrict-auto-publish",

        reason:
          `AI CEO restricted automatic publishing for market "${market?.key}". ${reason}`,

        restrictions: {
          autoPublishAllowed:
            false,

          confidencePenalty:
            10,

          minimumConfidenceIncrease:
            10,
        },
      };
    }
  }

  /*
   * Model-level restriction.
   *
   * This does NOT change or deploy the
   * model. It only prevents autonomous
   * publishing when historical evidence
   * shows meaningful risk.
   */
  if (
    hasReliableModelSample(
      model
    )
  ) {
    const reason =
      evaluateRestrictCondition(
        model as CalibrationGroupStats
      );

    if (reason) {
      return {
        ...base,

        decision:
          "restrict-auto-publish",

        reason:
          `AI CEO restricted automatic publishing for model "${model?.key}". ${reason}`,

        restrictions: {
          autoPublishAllowed:
            false,

          confidencePenalty:
            10,

          minimumConfidenceIncrease:
            10,
        },
      };
    }
  }

  /*
   * Market-level caution.
   */
  if (
    hasReliableMarketSample(
      market
    )
  ) {
    const reason =
      evaluateCautionCondition(
        market as CalibrationGroupStats
      );

    if (reason) {
      return {
        ...base,

        decision:
          "caution",

        reason:
          `AI CEO applied caution for market "${market?.key}". ${reason}`,

        restrictions: {
          autoPublishAllowed:
            true,

          confidencePenalty:
            5,

          minimumConfidenceIncrease:
            5,
        },
      };
    }
  }

  /*
   * Model-level caution.
   */
  if (
    hasReliableModelSample(
      model
    )
  ) {
    const reason =
      evaluateCautionCondition(
        model as CalibrationGroupStats
      );

    if (reason) {
      return {
        ...base,

        decision:
          "caution",

        reason:
          `AI CEO applied caution for model "${model?.key}". ${reason}`,

        restrictions: {
          autoPublishAllowed:
            true,

          confidencePenalty:
            5,

          minimumConfidenceIncrease:
            5,
        },
      };
    }
  }

  /*
   * Global calibration restriction.
   */
  const globalStats:
    CalibrationGroupStats = {
    key:
      "overall",

    total:
      summary
        .evaluablePredictions,

    correct:
      summary
        .overall
        .correct,

    incorrect:
      summary
        .overall
        .incorrect,

    accuracy:
      summary
        .overall
        .accuracy,

    averageConfidence:
      summary
        .overall
        .averageConfidence,

    averageCalibrationError:
      summary
        .overall
        .averageCalibrationError,

    highConfidencePredictions:
      summary
        .overall
        .highConfidencePredictions,

    highConfidenceFailures:
      summary
        .overall
        .highConfidenceFailures,

    highConfidenceFailureRate:
      summary
        .overall
        .highConfidenceFailureRate,
  };

  const globalRestriction =
    evaluateRestrictCondition(
      globalStats
    );

  if (
    globalRestriction
  ) {
    return {
      ...base,

      decision:
        "restrict-auto-publish",

      reason:
        `AI CEO restricted automatic prediction publishing based on global calibration performance. ${globalRestriction}`,

      restrictions: {
        autoPublishAllowed:
          false,

        confidencePenalty:
          10,

        minimumConfidenceIncrease:
          10,
      },
    };
  }

  const globalCaution =
    evaluateCautionCondition(
      globalStats
    );

  if (
    globalCaution
  ) {
    return {
      ...base,

      decision:
        "caution",

      reason:
        `AI CEO applied global prediction caution. ${globalCaution}`,

      restrictions: {
        autoPublishAllowed:
          true,

        confidencePenalty:
          5,

        minimumConfidenceIncrease:
          5,
      },
    };
  }

  return {
    ...base,

    decision:
      "allow",

    reason:
      "Prediction calibration performance is within acceptable operational thresholds. AI CEO may continue using the normal auto-publish policy.",

    restrictions: {
      autoPublishAllowed:
        true,

      confidencePenalty:
        0,

      minimumConfidenceIncrease:
        0,
    },
  };
}