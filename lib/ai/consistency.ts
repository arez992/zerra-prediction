import type {
  PredictionResult,
} from "./prediction";

export type PredictionConsistencyIssue = {
  code: string;
  severity:
    | "warning"
    | "error";
  message: string;
};

export type PredictionConsistencyResult = {
  prediction:
    PredictionResult;

  valid:
    boolean;

  issues:
    PredictionConsistencyIssue[];
};

type ParsedScore = {
  home: number;
  away: number;
};

function parseExactScore(
  value: string
): ParsedScore | null {
  const match =
    /^(\d+)-(\d+)$/.exec(
      value.trim()
    );

  if (!match) {
    return null;
  }

  const home =
    Number(match[1]);

  const away =
    Number(match[2]);

  if (
    !Number.isFinite(home) ||
    !Number.isFinite(away)
  ) {
    return null;
  }

  return {
    home,
    away,
  };
}

function outcomeFromScore(
  score: ParsedScore
):
  | "Home Win"
  | "Draw"
  | "Away Win" {
  if (
    score.home >
    score.away
  ) {
    return "Home Win";
  }

  if (
    score.away >
    score.home
  ) {
    return "Away Win";
  }

  return "Draw";
}

function scoreSupportsOver25(
  score: ParsedScore
): boolean {
  return (
    score.home +
      score.away >
    2
  );
}

function scoreSupportsBTTS(
  score: ParsedScore
): boolean {
  return (
    score.home > 0 &&
    score.away > 0
  );
}

function buildCanonicalScore(
  prediction:
    PredictionResult
): string {
  const finalPrediction =
    prediction
      .vipPrediction
      .finalPrediction;

  const markets =
    prediction
      .vipPrediction
      .markets;

  const prefersOver25 =
    markets.over25 >
    markets.under25;

  /*
   * Exact score is a single modal
   * estimate, not another independent
   * prediction model.
   *
   * It is therefore anchored to:
   *
   * 1. The canonical 1X2 result
   * 2. The stronger goal-total signal
   *
   * BTTS remains a probability signal.
   */
  if (
    finalPrediction ===
    "Home Win"
  ) {
    return prefersOver25
      ? "2-1"
      : "1-0";
  }

  if (
    finalPrediction ===
    "Away Win"
  ) {
    return prefersOver25
      ? "1-2"
      : "0-1";
  }

  if (
    finalPrediction ===
    "Draw"
  ) {
    return prefersOver25
      ? "2-2"
      : "1-1";
  }

  return "N/A";
}

export function enforcePredictionConsistency(
  prediction:
    PredictionResult
): PredictionConsistencyResult {
  const issues:
    PredictionConsistencyIssue[] = [];

  /*
   * Predictions that are not VIP-ready
   * intentionally have no exact score.
   */
  if (
    prediction
      .vipPrediction
      .finalPrediction ===
      "Insufficient Data"
  ) {
    return {
      prediction,
      valid: true,
      issues,
    };
  }

  const canonicalExactScore =
    buildCanonicalScore(
      prediction
    );

  const existingScore =
    parseExactScore(
      prediction
        .vipPrediction
        .exactScore
    );

  const canonicalScore =
    parseExactScore(
      canonicalExactScore
    );

  if (!canonicalScore) {
    issues.push({
      code:
        "INVALID_CANONICAL_SCORE",

      severity:
        "error",

      message:
        "Unable to create a canonical exact-score estimate.",
    });

    return {
      prediction,
      valid: false,
      issues,
    };
  }

  const finalPrediction =
    prediction
      .vipPrediction
      .finalPrediction;

  /*
   * Check the old score before replacing
   * it so inconsistencies are recorded.
   */
  if (existingScore) {
    const existingOutcome =
      outcomeFromScore(
        existingScore
      );

    if (
      existingOutcome !==
      finalPrediction
    ) {
      issues.push({
        code:
          "EXACT_SCORE_OUTCOME_MISMATCH",

        severity:
          "warning",

        message:
          `Exact score ${prediction.vipPrediction.exactScore} did not match final prediction ${finalPrediction}.`,
      });
    }

    const prefersOver25 =
      prediction
        .vipPrediction
        .markets
        .over25 >
      prediction
        .vipPrediction
        .markets
        .under25;

    if (
      scoreSupportsOver25(
        existingScore
      ) !==
      prefersOver25
    ) {
      issues.push({
        code:
          "EXACT_SCORE_GOALS_MISMATCH",

        severity:
          "warning",

        message:
          "Exact score did not match the stronger Over/Under 2.5 signal.",
      });
    }
  }

  /*
   * BTTS is a probability distribution,
   * not a hard exact-score constraint.
   *
   * A 55% BTTS probability can still have
   * a 1-0 modal exact-score estimate.
   *
   * We flag only strong disagreement.
   */
  const bttsProbability =
    prediction
      .vipPrediction
      .markets
      .btts;

  const canonicalBTTS =
    scoreSupportsBTTS(
      canonicalScore
    );

  if (
    bttsProbability >= 70 &&
    !canonicalBTTS
  ) {
    issues.push({
      code:
        "HIGH_BTTS_SCORE_DISAGREEMENT",

      severity:
        "warning",

      message:
        `BTTS probability is ${bttsProbability}% while the modal exact score is ${canonicalExactScore}.`,
    });
  }

  if (
    bttsProbability <= 30 &&
    canonicalBTTS
  ) {
    issues.push({
      code:
        "LOW_BTTS_SCORE_DISAGREEMENT",

      severity:
        "warning",

      message:
        `BTTS probability is ${bttsProbability}% while the modal exact score is ${canonicalExactScore}.`,
    });
  }

  const normalizedPrediction:
    PredictionResult = {
    ...prediction,

    vipPrediction: {
      ...prediction
        .vipPrediction,

      exactScore:
        canonicalExactScore,

      reasoning: [
        ...prediction
          .vipPrediction
          .reasoning,

        `Consistency V2 verified the canonical exact score as ${canonicalExactScore} for ${finalPrediction}.`,
      ],
    },
  };

  const hardErrors =
    issues.filter(
      (issue) =>
        issue.severity ===
        "error"
    );

  return {
    prediction:
      normalizedPrediction,

    valid:
      hardErrors.length ===
      0,

    issues,
  };
}