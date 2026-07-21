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
  65;

const REVIEW_MIN_CONFIDENCE =
  65;

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

function hasUsablePrediction(
  value: string | null
): boolean {
  if (!value) {
    return false;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return ![
    "",
    "insufficient data",
    "no strong prediction",
    "no value",
  ].includes(normalized);
}

function getLearningConfiguration(
  learningPolicy:
    | PredictionLearningPolicyContext
    | null
    | undefined
) {
  if (!learningPolicy) {
    return {
      applied: false,

      decision: null,

      reason: null,

      sampleSize: null,

      autoPublishAllowed: true,

      confidencePenalty: 0,

      minimumConfidenceIncrease: 0,
    };
  }

  if (
    learningPolicy.decision ===
    "insufficient-data"
  ) {
    return {
      applied: true,

      decision:
        learningPolicy.decision,

      reason:
        learningPolicy.reason,

      sampleSize:
        learningPolicy.sampleSize,

      autoPublishAllowed: true,

      confidencePenalty: 0,

      minimumConfidenceIncrease: 0,
    };
  }

  return {
    applied: true,

    decision:
      learningPolicy.decision,

    reason:
      learningPolicy.reason,

    sampleSize:
      learningPolicy.sampleSize,

    autoPublishAllowed:
      learningPolicy
        .restrictions
        .autoPublishAllowed,

    confidencePenalty:
      learningPolicy
        .restrictions
        .confidencePenalty,

    minimumConfidenceIncrease:
      learningPolicy
        .restrictions
        .minimumConfidenceIncrease,
  };
}

export function evaluatePredictionAutoPublishPolicy(
  input: PredictionAutoPublishPolicyInput
): PredictionAutoPublishPolicyResult {
  const confidence =
    normalizeConfidence(
      input.confidence
    );

  const learning =
    getLearningConfiguration(
      input.learningPolicy
    );

  const effectiveAutoPublishConfidence =
    Math.min(
      100,
      AUTO_PUBLISH_CONFIDENCE +
        learning
          .minimumConfidenceIncrease
    );

  const confidencePassed =
    confidence !== null &&
    confidence >=
      effectiveAutoPublishConfidence;

  const riskPassed =
    input.risk === "Low" ||
    input.risk === "Medium";

  const qualificationPassed =
    input.primaryQualified ===
    true;

  const consistencyPassed =
    input.consistencyValid ===
    true;

  /*
   * These remain recorded for diagnostics
   * and auditability.
   *
   * They are no longer hard publication
   * blockers by themselves because
   * insufficient data alone should not
   * reject an otherwise strong prediction.
   */
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
    hasUsablePrediction(
      input.finalPrediction
    );

  const learningAllowsAutoPublish =
    learning
      .autoPublishAllowed;

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
      REVIEW_MIN_CONFIDENCE,

    learningConfidenceIncrease:
      learning
        .minimumConfidenceIncrease,
  };

  const learningResult = {
    applied:
      learning.applied,

    decision:
      learning.decision,

    reason:
      learning.reason,

    sampleSize:
      learning.sampleSize,

    autoPublishAllowed:
      learning.autoPublishAllowed,

    confidencePenalty:
      learning.confidencePenalty,

    minimumConfidenceIncrease:
      learning.minimumConfidenceIncrease,
  };

  /*
   * ZERRA hard safety policy.
   *
   * Auto-publish requires:
   *
   * - confidence >= effective threshold
   * - Low or Medium risk
   * - qualified canonical prediction
   * - valid consistency
   * - verified pre-match fixture
   * - usable canonical prediction
   *
   * generationAllowed and
   * qualityGatePassed remain visible
   * for audit/diagnostics but are
   * advisory when the only problem is
   * insufficient supporting data.
   */
  const hardSafetyPassed =
    riskPassed &&
    qualificationPassed &&
    consistencyPassed &&
    preMatchPassed &&
    predictionAvailable;

  /*
   * AUTO-PUBLISH
   */
  if (
    hardSafetyPassed &&
    confidencePassed &&
    learningAllowsAutoPublish
  ) {
    const learningReason =
      learning.applied &&
      learning.reason
        ? ` Learning context: ${learning.reason}`
        : "";

    const dataNote =
      !generationPassed ||
      !qualityGatePassed
        ? " Supporting data was incomplete, but insufficient data alone is advisory under the current ZERRA publication policy."
        : "";

    return {
      decision:
        "auto-publish",

      approvedAutomatically:
        true,

      publishAutomatically:
        true,

      reason:
        `AI CEO auto-publish approved: confidence ${confidence}%, risk ${input.risk}, qualified canonical prediction, valid consistency, and verified pre-match status.${dataNote}${learningReason}`,

      checks,

      thresholds,

      learning:
        learningResult,
    };
  }

  /*
   * LEARNING RESTRICTION
   */
  if (
    hardSafetyPassed &&
    !learningAllowsAutoPublish &&
    confidence !== null &&
    confidence >=
      REVIEW_MIN_CONFIDENCE
  ) {
    return {
      decision:
        "review",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        `Prediction passed core safety checks with ${confidence}% confidence and ${input.risk} risk, but AI CEO learning policy restricted automatic publishing. ${
          learning.reason ||
          "Historical calibration requires manual review."
        }`,

      checks,

      thresholds,

      learning:
        learningResult,
    };
  }

  /*
   * REVIEW
   *
   * This normally matters when learning
   * increases the effective threshold
   * above the 65% base threshold.
   */
  if (
    hardSafetyPassed &&
    confidence !== null &&
    confidence >=
      REVIEW_MIN_CONFIDENCE
  ) {
    const learningReason =
      learning.applied &&
      learning.reason
        ? ` Learning context: ${learning.reason}`
        : "";

    return {
      decision:
        "review",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        `Prediction passed core safety checks but confidence was ${confidence}%, below the effective ${effectiveAutoPublishConfidence}% auto-publish threshold.${learningReason}`,

      checks,

      thresholds,

      learning:
        learningResult,
    };
  }

  /*
   * WITHHOLD
   */
  return {
    decision:
      "withhold",

    approvedAutomatically:
      false,

    publishAutomatically:
      false,

    reason:
      [
        "Prediction withheld by AI CEO policy.",

        confidence === null
          ? "Confidence unavailable."
          : `Confidence: ${confidence}%.`,

        riskPassed
          ? null
          : "Risk must be Low or Medium.",

        qualificationPassed
          ? null
          : "Primary prediction was not qualified.",

        consistencyPassed
          ? null
          : "Prediction consistency validation did not pass.",

        preMatchPassed
          ? null
          : "Fixture was not verified as pre-match.",

        predictionAvailable
          ? null
          : "No usable canonical prediction was available.",

        !generationPassed
          ? "Generation/data gate reported insufficient data; this is advisory and was not the sole withholding reason."
          : null,

        !qualityGatePassed
          ? "Data-quality gate did not pass; this is advisory and was not the sole withholding reason."
          : null,

        learning.applied &&
        learning.reason
          ? `Learning context: ${learning.reason}`
          : null,
      ]
        .filter(Boolean)
        .join(" "),

    checks,

    thresholds,

    learning:
      learningResult,
  };
}