import type {
  PredictionLearningPolicyContext,
} from "./learningPolicy";

export type PredictionAutoPublishDecision =
  | "auto-publish"
  | "review"
  | "withhold";

export type PredictionAutoPublishPolicyInput = {
  confidence:
    number | null;

  primaryQualified:
    boolean | null;

  consistencyValid:
    boolean | null;

  generationAllowed:
    boolean;

  qualityGatePassed:
    boolean;

  preMatchStatusVerified:
    boolean;

  finalPrediction:
    string | null;

  /*
   * Optional ZAOS learning context.
   *
   * The base prediction policy remains
   * deterministic and synchronous.
   *
   * The caller may load historical
   * calibration separately and pass the
   * resulting decision context here.
   */
  learningPolicy?:
    PredictionLearningPolicyContext |
    null;
};

export type PredictionAutoPublishPolicyResult = {
  decision:
    PredictionAutoPublishDecision;

  approvedAutomatically:
    boolean;

  publishAutomatically:
    boolean;

  reason:
    string;

  checks: {
    confidencePassed:
      boolean;

    qualificationPassed:
      boolean;

    consistencyPassed:
      boolean;

    generationPassed:
      boolean;

    qualityGatePassed:
      boolean;

    preMatchPassed:
      boolean;

    predictionAvailable:
      boolean;

    learningAllowsAutoPublish:
      boolean;
  };

  thresholds: {
    baseAutoPublishConfidence:
      number;

    effectiveAutoPublishConfidence:
      number;

    reviewMinimumConfidence:
      number;

    learningConfidenceIncrease:
      number;
  };

  learning: {
    applied:
      boolean;

    decision:
      PredictionLearningPolicyContext["decision"] |
      null;

    reason:
      string | null;

    sampleSize:
      number | null;

    autoPublishAllowed:
      boolean;

    confidencePenalty:
      number;

    minimumConfidenceIncrease:
      number;
  };
};

const AUTO_PUBLISH_CONFIDENCE =
  75;

const REVIEW_MIN_CONFIDENCE =
  65;

function normalizeConfidence(
  value:
    unknown
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
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
  value:
    string | null
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
  ].includes(
    normalized
  );
}

function getLearningConfiguration(
  learningPolicy:
    PredictionLearningPolicyContext |
    null |
    undefined
) {
  /*
   * No learning context:
   * preserve the original policy.
   */
  if (!learningPolicy) {
    return {
      applied:
        false,

      decision:
        null,

      reason:
        null,

      sampleSize:
        null,

      autoPublishAllowed:
        true,

      confidencePenalty:
        0,

      minimumConfidenceIncrease:
        0,
    };
  }

  /*
   * Insufficient historical data must
   * never tighten production behavior.
   *
   * Learning is visible for auditability,
   * but the original thresholds remain.
   */
  if (
    learningPolicy.decision ===
    "insufficient-data"
  ) {
    return {
      applied:
        true,

      decision:
        learningPolicy
          .decision,

      reason:
        learningPolicy
          .reason,

      sampleSize:
        learningPolicy
          .sampleSize,

      autoPublishAllowed:
        true,

      confidencePenalty:
        0,

      minimumConfidenceIncrease:
        0,
    };
  }

  return {
    applied:
      true,

    decision:
      learningPolicy
        .decision,

    reason:
      learningPolicy
        .reason,

    sampleSize:
      learningPolicy
        .sampleSize,

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
  input:
    PredictionAutoPublishPolicyInput
): PredictionAutoPublishPolicyResult {
  const confidence =
    normalizeConfidence(
      input.confidence
    );

  const learning =
    getLearningConfiguration(
      input.learningPolicy
    );

  /*
   * Historical calibration may raise
   * the auto-publish threshold.
   *
   * Example:
   *
   * normal:
   * 75%
   *
   * caution:
   * 80%
   *
   * restriction:
   * auto-publish disabled completely.
   */
  const effectiveAutoPublishConfidence =
    Math.min(
      100,

      AUTO_PUBLISH_CONFIDENCE +
        learning
          .minimumConfidenceIncrease
    );

  const confidencePassed =
    confidence !==
      null &&
    confidence >=
      effectiveAutoPublishConfidence;

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
    hasUsablePrediction(
      input.finalPrediction
    );

  const learningAllowsAutoPublish =
    learning
      .autoPublishAllowed;

  const checks = {
    confidencePassed,

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
      learning
        .autoPublishAllowed,

    confidencePenalty:
      learning
        .confidencePenalty,

    minimumConfidenceIncrease:
      learning
        .minimumConfidenceIncrease,
  };

  const hardSafetyPassed =
    qualificationPassed &&
    consistencyPassed &&
    generationPassed &&
    qualityGatePassed &&
    preMatchPassed &&
    predictionAvailable;

  /*
   * AUTO-PUBLISH
   *
   * Every core safeguard must pass.
   *
   * Historical calibration must also
   * explicitly allow autonomous
   * publication.
   *
   * A caution policy may increase the
   * required confidence threshold.
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

    return {
      decision:
        "auto-publish",

      approvedAutomatically:
        true,

      publishAutomatically:
        true,

      reason:
        `AI CEO auto-publish approved because all safeguards passed and confidence was ${confidence}%, meeting the effective ${effectiveAutoPublishConfidence}% threshold.${learningReason}`,

      checks,

      thresholds,

      learning:
        learningResult,
    };
  }

  /*
   * LEARNING RESTRICTION
   *
   * The prediction itself may be strong,
   * but sufficiently large historical
   * calibration evidence has disabled
   * autonomous publication.
   *
   * Keep the prediction available for
   * review instead of withholding it.
   */
  if (
    hardSafetyPassed &&
    !learningAllowsAutoPublish &&
    confidence !==
      null &&
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
        `Prediction passed core safety checks with ${confidence}% confidence, but AI CEO learning policy restricted automatic publishing. ${learning.reason || "Historical calibration requires manual review."}`,

      checks,

      thresholds,

      learning:
        learningResult,
    };
  }

  /*
   * REVIEW
   *
   * Safety passed, but confidence is
   * below the effective autonomous
   * publication threshold.
   *
   * This includes learning-policy caution
   * where the normal 75% threshold may
   * have been increased.
   */
  if (
    hardSafetyPassed &&
    confidence !==
      null &&
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
        `Prediction passed safety checks but confidence was ${confidence}%, below the effective ${effectiveAutoPublishConfidence}% auto-publish threshold.${learningReason}`,

      checks,

      thresholds,

      learning:
        learningResult,
    };
  }

  /*
   * WITHHOLD
   *
   * A core prediction-safety condition
   * failed or confidence did not reach
   * the minimum review threshold.
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

        confidence ===
        null
          ? "Confidence unavailable."
          : `Confidence: ${confidence}%.`,

        qualificationPassed
          ? null
          : "Primary prediction was not qualified.",

        consistencyPassed
          ? null
          : "Prediction consistency validation did not pass.",

        generationPassed
          ? null
          : "Generation decision was not allowed.",

        qualityGatePassed
          ? null
          : "Data-quality gate did not pass.",

        preMatchPassed
          ? null
          : "Fixture was not verified as pre-match.",

        predictionAvailable
          ? null
          : "No usable canonical prediction was available.",

        hardSafetyPassed &&
        confidence !==
          null &&
        confidence <
          REVIEW_MIN_CONFIDENCE
          ? `Confidence was below the ${REVIEW_MIN_CONFIDENCE}% minimum review threshold.`
          : null,

        learning.applied &&
        learning.reason
          ? `Learning context: ${learning.reason}`
          : null,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        ),

    checks,

    thresholds,

    learning:
      learningResult,
  };
}