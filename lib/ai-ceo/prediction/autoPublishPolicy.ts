import type {
  PredictionLearningPolicyContext,
} from "./learningPolicy";

export type PredictionAutoPublishDecision =
  | "auto-publish"
  | "review"
  | "withhold";

export type PredictionAutoPublishPolicyInput = {
  confidence: number | null;

  risk:
    | "Low"
    | "Medium"
    | "High"
    | null;

  primaryQualified: boolean | null;
  consistencyValid: boolean | null;
  generationAllowed: boolean;
  qualityGatePassed: boolean;
  preMatchStatusVerified: boolean;
  finalPrediction: string | null;

  learningPolicy?:
    | PredictionLearningPolicyContext
    | null;
};

export type PredictionAutoPublishPolicyResult = {
  decision: PredictionAutoPublishDecision;
  approvedAutomatically: boolean;
  publishAutomatically: boolean;
  reason: string;

  checks: {
    confidencePassed: boolean;
    riskPassed: boolean;
    qualificationPassed: boolean;
    consistencyPassed: boolean;
    generationPassed: boolean;
    qualityGatePassed: boolean;
    preMatchPassed: boolean;
    predictionAvailable: boolean;
    learningAllowsAutoPublish: boolean;
  };

  thresholds: {
    baseAutoPublishConfidence: number;
    effectiveAutoPublishConfidence: number;
    reviewMinimumConfidence: number;
    learningConfidenceIncrease: number;
  };

  learning: {
    applied: boolean;
    decision:
      | PredictionLearningPolicyContext["decision"]
      | null;
    reason: string | null;
    sampleSize: number | null;
    autoPublishAllowed: boolean;
    confidencePenalty: number;
    minimumConfidenceIncrease: number;
  };
};

const AUTO_PUBLISH_CONFIDENCE =
  68;

function normalizeConfidence(
  value: unknown
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(
      0,
      value
    )
  );
}

export function evaluatePredictionAutoPublishPolicy(
  input:
    PredictionAutoPublishPolicyInput
): PredictionAutoPublishPolicyResult {
  const confidence =
    normalizeConfidence(
      input.confidence
    );

  const learningRestrictions =
    input.learningPolicy
      ?.restrictions;

  const learningAllowsAutoPublish =
    learningRestrictions
      ?.autoPublishAllowed !==
    false;

  const learningConfidenceIncrease =
    Math.max(
      0,
      Number(
        learningRestrictions
          ?.minimumConfidenceIncrease ||
        0
      ),
      Number(
        learningRestrictions
          ?.confidencePenalty ||
        0
      )
    );

  const effectiveAutoPublishConfidence =
    Math.min(
      100,
      AUTO_PUBLISH_CONFIDENCE +
        learningConfidenceIncrease
    );

  const confidencePassed =
    confidence !==
      null &&
    confidence >
      effectiveAutoPublishConfidence;

  const riskPassed =
    input.risk ===
      "Low" ||
    input.risk ===
      "Medium";

  const qualificationPassed =
    input.primaryQualified ===
    true;

  const consistencyPassed =
    input.consistencyValid ===
    true;

  const generationPassed =
    input.generationAllowed ===
    true;

  const qualityGatePassed =
    input.qualityGatePassed ===
    true;

  const preMatchPassed =
    input.preMatchStatusVerified ===
    true;

  const predictionAvailable =
    Boolean(
      input.finalPrediction &&
      input.finalPrediction.trim()
    );

  const checks = {
    confidencePassed,
    riskPassed,
    qualificationPassed,
    consistencyPassed,
    generationPassed,
    qualityGatePassed,
    preMatchPassed,
    predictionAvailable,
    learningAllowsAutoPublish,
  };

  const thresholds = {
    baseAutoPublishConfidence:
      AUTO_PUBLISH_CONFIDENCE,

    effectiveAutoPublishConfidence,

    reviewMinimumConfidence:
      AUTO_PUBLISH_CONFIDENCE,

    learningConfidenceIncrease,
  };

  const learning = {
    applied:
      Boolean(
        input.learningPolicy
      ),

    decision:
      input.learningPolicy
        ?.decision ??
      null,

    reason:
      input.learningPolicy
        ?.reason ??
      null,

    sampleSize:
      input.learningPolicy
        ?.sampleSize ??
      null,

    autoPublishAllowed:
      learningAllowsAutoPublish,

    confidencePenalty:
      Number(
        learningRestrictions
          ?.confidencePenalty ||
        0
      ),

    minimumConfidenceIncrease:
      Number(
        learningRestrictions
          ?.minimumConfidenceIncrease ||
        0
      ),
  };

  const hardGatePassed =
    qualificationPassed &&
    consistencyPassed &&
    generationPassed &&
    qualityGatePassed &&
    preMatchPassed &&
    predictionAvailable;

  if (
    !hardGatePassed ||
    !riskPassed
  ) {
    const reasons:
      string[] = [];

    if (
      !qualificationPassed
    ) {
      reasons.push(
        "Primary market is not qualified."
      );
    }

    if (
      !consistencyPassed
    ) {
      reasons.push(
        "Prediction consistency validation did not pass."
      );
    }

    if (
      !generationPassed ||
      !qualityGatePassed
    ) {
      reasons.push(
        "Prediction generation/data-quality gate did not pass."
      );
    }

    if (
      !preMatchPassed
    ) {
      reasons.push(
        "Pre-match fixture status was not verified."
      );
    }

    if (
      !predictionAvailable
    ) {
      reasons.push(
        "No canonical final prediction is available."
      );
    }

    if (
      !riskPassed
    ) {
      reasons.push(
        `Risk ${input.risk ?? "unknown"} is not Low or Medium.`
      );
    }

    return {
      decision:
        "withhold",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        reasons.join(
          " "
        ),

      checks,
      thresholds,
      learning,
    };
  }

  if (
    !learningAllowsAutoPublish
  ) {
    return {
      decision:
        "review",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        input.learningPolicy
          ?.reason ||
        "Prediction learning policy currently requires human review before publication.",

      checks,
      thresholds,
      learning,
    };
  }

  if (
    confidencePassed
  ) {
    return {
      decision:
        "auto-publish",

      approvedAutomatically:
        true,

      publishAutomatically:
        true,

      reason:
        `AI CEO auto-published prediction because all publication gates passed, confidence ${confidence}% is greater than the effective ${effectiveAutoPublishConfidence}% threshold, and risk is ${input.risk}.`,

      checks,
      thresholds,
      learning,
    };
  }

  if (
    confidence !==
      null &&
    confidence >
      AUTO_PUBLISH_CONFIDENCE &&
    effectiveAutoPublishConfidence >
      AUTO_PUBLISH_CONFIDENCE
  ) {
    return {
      decision:
        "review",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        `Prediction passed the base ${AUTO_PUBLISH_CONFIDENCE}% confidence threshold but did not exceed the learning-adjusted ${effectiveAutoPublishConfidence}% threshold. Human review is required.`,

      checks,
      thresholds,
      learning,
    };
  }

  return {
    decision:
      "withhold",

    approvedAutomatically:
      false,

    publishAutomatically:
      false,

    reason:
      confidence ===
        null
        ? "Confidence is unavailable."
        : `Confidence ${confidence}% is not greater than the required ${effectiveAutoPublishConfidence}% threshold.`,

    checks,
    thresholds,
    learning,
  };
}
