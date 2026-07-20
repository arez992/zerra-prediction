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
    confidence >=
      AUTO_PUBLISH_CONFIDENCE;

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

  const checks = {
    confidencePassed,
    qualificationPassed,
    consistencyPassed,
    generationPassed,
    qualityGatePassed,
    preMatchPassed,
    predictionAvailable,
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
   * AI CEO may approve and publish
   * automatically only when all core
   * safeguards pass and confidence is
   * at or above the configured threshold.
   */
  if (
    hardSafetyPassed &&
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
        `AI CEO auto-publish approved because all safeguards passed and confidence was ${confidence}%, which meets the ${AUTO_PUBLISH_CONFIDENCE}% threshold.`,

      checks,
    };
  }

  /*
   * REVIEW
   *
   * Medium-confidence predictions remain
   * available for manual/admin review only
   * when all hard safety rules pass.
   */
  if (
    hardSafetyPassed &&
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
        `Prediction passed safety checks but confidence was ${confidence}%, below the ${AUTO_PUBLISH_CONFIDENCE}% auto-publish threshold. Manual review is required.`,

      checks,
    };
  }

  /*
   * WITHHOLD
   *
   * Any prediction that fails a core
   * safety rule must never be published
   * automatically.
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
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        ),

    checks,
  };
}