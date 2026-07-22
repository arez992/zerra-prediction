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

  const confidencePassed =
    confidence !==
      null &&
    confidence >
      AUTO_PUBLISH_CONFIDENCE;

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
    learningAllowsAutoPublish:
      true,
  };

  const thresholds = {
    baseAutoPublishConfidence:
      AUTO_PUBLISH_CONFIDENCE,

    effectiveAutoPublishConfidence:
      AUTO_PUBLISH_CONFIDENCE,

    reviewMinimumConfidence:
      AUTO_PUBLISH_CONFIDENCE,

    learningConfidenceIncrease:
      0,
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
      true,

    confidencePenalty:
      0,

    minimumConfidenceIncrease:
      0,
  };

  if (
    confidencePassed &&
    riskPassed
  ) {
    return {
      decision:
        "auto-publish",

      approvedAutomatically:
        true,

      publishAutomatically:
        true,

      reason:
        `AI CEO auto-published prediction because confidence ${confidence}% is greater than 68% and risk is ${input.risk}.`,

      checks,
      thresholds,
      learning,
    };
  }

  const reasons:
    string[] = [];

  if (
    !confidencePassed
  ) {
    reasons.push(
      confidence ===
        null
        ? "Confidence is unavailable."
        : `Confidence ${confidence}% is not greater than 68%.`
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
