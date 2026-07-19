import type {
  PredictionPrimarySelection,
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
    Number(
      match[1]
    );

  const away =
    Number(
      match[2]
    );

  if (
    !Number.isFinite(
      home
    ) ||
    !Number.isFinite(
      away
    )
  ) {
    return null;
  }

  return {
    home,
    away,
  };
}

function getTotalGoals(
  score: ParsedScore
): number {
  return (
    score.home +
    score.away
  );
}

function supportsBTTS(
  score: ParsedScore
): boolean {
  return (
    score.home > 0 &&
    score.away > 0
  );
}

function buildExpectedScore(
  prediction:
    PredictionResult
): string {
  const homeGoals =
    Math.max(
      0,
      Math.round(
        prediction
          .homeExpectedGoals
      )
    );

  const awayGoals =
    Math.max(
      0,
      Math.round(
        prediction
          .awayExpectedGoals
      )
    );

  return `${homeGoals}-${awayGoals}`;
}

function getMarketProbability(
  prediction:
    PredictionResult,
  primary:
    PredictionPrimarySelection
): number | null {
  const markets =
    prediction
      .vipPrediction
      .markets;

  const pick =
    primary.pick;

  if (
    pick ===
    "Over 1.5 Goals"
  ) {
    return (
      markets.over15 ??
      null
    );
  }

  if (
    pick ===
    "Under 1.5 Goals"
  ) {
    return (
      markets.under15 ??
      null
    );
  }

  if (
    pick ===
    "Over 2.5 Goals"
  ) {
    return (
      markets.over25
    );
  }

  if (
    pick ===
    "Under 2.5 Goals"
  ) {
    return (
      markets.under25
    );
  }

  if (
    pick ===
    "Over 3.5 Goals"
  ) {
    return (
      markets.over35 ??
      null
    );
  }

  if (
    pick ===
    "Under 3.5 Goals"
  ) {
    return (
      markets.under35 ??
      null
    );
  }

  if (
    pick ===
      "BTTS Yes" ||
    pick ===
      "Both Teams To Score - Yes"
  ) {
    return (
      markets.bttsYes ??
      markets.btts
    );
  }

  if (
    pick ===
      "BTTS No" ||
    pick ===
      "Both Teams To Score - No"
  ) {
    return (
      markets.bttsNo ??
      100 -
        markets.btts
    );
  }

  if (
    pick ===
    "Home Team Over 0.5 Goals"
  ) {
    return (
      markets.homeOver05 ??
      null
    );
  }

  if (
    pick ===
    "Home Team Under 0.5 Goals"
  ) {
    return (
      markets.homeUnder05 ??
      null
    );
  }

  if (
    pick ===
    "Home Team Over 1.5 Goals"
  ) {
    return (
      markets.homeOver15 ??
      null
    );
  }

  if (
    pick ===
    "Home Team Under 1.5 Goals"
  ) {
    return (
      markets.homeUnder15 ??
      null
    );
  }

  if (
    pick ===
    "Away Team Over 0.5 Goals"
  ) {
    return (
      markets.awayOver05 ??
      null
    );
  }

  if (
    pick ===
    "Away Team Under 0.5 Goals"
  ) {
    return (
      markets.awayUnder05 ??
      null
    );
  }

  if (
    pick ===
    "Away Team Over 1.5 Goals"
  ) {
    return (
      markets.awayOver15 ??
      null
    );
  }

  if (
    pick ===
    "Away Team Under 1.5 Goals"
  ) {
    return (
      markets.awayUnder15 ??
      null
    );
  }

  if (
    pick ===
      "Double Chance 1X" ||
    pick ===
      "1X"
  ) {
    return (
      markets.doubleChance1X ??
      null
    );
  }

  if (
    pick ===
      "Double Chance X2" ||
    pick ===
      "X2"
  ) {
    return (
      markets.doubleChanceX2 ??
      null
    );
  }

  if (
    pick ===
      "Double Chance 12" ||
    pick ===
      "12"
  ) {
    return (
      markets.doubleChance12 ??
      null
    );
  }

  return null;
}

function exactScoreSupportsPick(
  score:
    ParsedScore,
  primary:
    PredictionPrimarySelection
): boolean | null {
  const totalGoals =
    getTotalGoals(
      score
    );

  const pick =
    primary.pick;

  if (
    pick ===
    "Over 1.5 Goals"
  ) {
    return (
      totalGoals >
      1
    );
  }

  if (
    pick ===
    "Under 1.5 Goals"
  ) {
    return (
      totalGoals <
      2
    );
  }

  if (
    pick ===
    "Over 2.5 Goals"
  ) {
    return (
      totalGoals >
      2
    );
  }

  if (
    pick ===
    "Under 2.5 Goals"
  ) {
    return (
      totalGoals <
      3
    );
  }

  if (
    pick ===
    "Over 3.5 Goals"
  ) {
    return (
      totalGoals >
      3
    );
  }

  if (
    pick ===
    "Under 3.5 Goals"
  ) {
    return (
      totalGoals <
      4
    );
  }

  if (
    pick ===
      "BTTS Yes" ||
    pick ===
      "Both Teams To Score - Yes"
  ) {
    return supportsBTTS(
      score
    );
  }

  if (
    pick ===
      "BTTS No" ||
    pick ===
      "Both Teams To Score - No"
  ) {
    return !supportsBTTS(
      score
    );
  }

  if (
    pick ===
    "Home Team Over 0.5 Goals"
  ) {
    return (
      score.home >
      0
    );
  }

  if (
    pick ===
    "Home Team Under 0.5 Goals"
  ) {
    return (
      score.home <
      1
    );
  }

  if (
    pick ===
    "Home Team Over 1.5 Goals"
  ) {
    return (
      score.home >
      1
    );
  }

  if (
    pick ===
    "Home Team Under 1.5 Goals"
  ) {
    return (
      score.home <
      2
    );
  }

  if (
    pick ===
    "Away Team Over 0.5 Goals"
  ) {
    return (
      score.away >
      0
    );
  }

  if (
    pick ===
    "Away Team Under 0.5 Goals"
  ) {
    return (
      score.away <
      1
    );
  }

  if (
    pick ===
    "Away Team Over 1.5 Goals"
  ) {
    return (
      score.away >
      1
    );
  }

  if (
    pick ===
    "Away Team Under 1.5 Goals"
  ) {
    return (
      score.away <
      2
    );
  }

  if (
    pick ===
      "Double Chance 1X" ||
    pick ===
      "1X"
  ) {
    return (
      score.home >=
      score.away
    );
  }

  if (
    pick ===
      "Double Chance X2" ||
    pick ===
      "X2"
  ) {
    return (
      score.away >=
      score.home
    );
  }

  if (
    pick ===
      "Double Chance 12" ||
    pick ===
      "12"
  ) {
    return (
      score.home !==
      score.away
    );
  }

  return null;
}

function isNoPrediction(
  primary:
    PredictionPrimarySelection
): boolean {
  return (
    primary.category ===
      "No Strong Prediction" ||
    !primary.qualified ||
    primary.pick ===
      "No Strong Prediction" ||
    primary.pick ===
      "Insufficient Data"
  );
}

export function enforcePredictionConsistency(
  prediction:
    PredictionResult
): PredictionConsistencyResult {
  const issues:
    PredictionConsistencyIssue[] = [];

  const primary =
    prediction
      .vipPrediction
      .primaryPrediction;

  /*
   * The primary market decision is now
   * the canonical ZERRA prediction.
   *
   * Exact score is supplemental only.
   * It must never override or replace
   * the selected primary market.
   */

  if (
    !primary
  ) {
    issues.push({
      code:
        "MISSING_PRIMARY_PREDICTION",

      severity:
        "error",

      message:
        "The prediction does not contain a canonical primary market selection.",
    });

    return {
      prediction,
      valid:
        false,
      issues,
    };
  }

  /*
   * A deliberately withheld prediction
   * is a valid model decision.
   */
  if (
    isNoPrediction(
      primary
    )
  ) {
    const normalizedPrediction:
      PredictionResult = {
      ...prediction,

      valueBet:
        "No Value",

      vipPrediction: {
        ...prediction
          .vipPrediction,

        finalPrediction:
          primary.pick,

        valueBet:
          "No Value",

        exactScore:
          prediction
            .vipPrediction
            .exactScore ||
          "N/A",

        reasoning: [
          ...prediction
            .vipPrediction
            .reasoning,

          "Market Consistency V3 confirmed that no prediction should be forced when the available market evidence does not meet ZERRA's qualification standard.",
        ],
      },
    };

    return {
      prediction:
        normalizedPrediction,

      valid:
        true,

      issues,
    };
  }

  /*
   * The backwards-compatible
   * finalPrediction field must mirror
   * the canonical primary market pick.
   */
  if (
    prediction
      .vipPrediction
      .finalPrediction !==
    primary.pick
  ) {
    issues.push({
      code:
        "FINAL_PREDICTION_PRIMARY_MISMATCH",

      severity:
        "warning",

      message:
        `Legacy finalPrediction "${prediction.vipPrediction.finalPrediction}" did not match canonical primary pick "${primary.pick}".`,
    });
  }

  /*
   * Verify that the selected market
   * actually exists in the calculated
   * probability set.
   */
  const marketProbability =
    getMarketProbability(
      prediction,
      primary
    );

  if (
    marketProbability ===
    null
  ) {
    issues.push({
      code:
        "PRIMARY_MARKET_PROBABILITY_UNAVAILABLE",

      severity:
        "error",

      message:
        `No calculated probability was available for primary market pick "${primary.pick}".`,
    });
  } else {
    const probabilityDifference =
      Math.abs(
        marketProbability -
        primary.confidence
      );

    /*
     * Confidence may include reliability,
     * completeness and uncertainty, so it
     * does not need to equal raw market
     * probability exactly.
     *
     * Only large divergence is flagged.
     */
    if (
      probabilityDifference >
      30
    ) {
      issues.push({
        code:
          "PRIMARY_CONFIDENCE_PROBABILITY_DIVERGENCE",

        severity:
          "warning",

        message:
          `Primary confidence is ${primary.confidence}% while the raw market probability for "${primary.pick}" is ${marketProbability}%.`,
      });
    }
  }

  /*
   * Validate category/pick semantics.
   */
  const category =
    primary.category;

  if (
    category ===
      "Total Goals" &&
    ![
      "Over 1.5 Goals",
      "Under 1.5 Goals",
      "Over 2.5 Goals",
      "Under 2.5 Goals",
      "Over 3.5 Goals",
      "Under 3.5 Goals",
    ].includes(
      primary.pick
    )
  ) {
    issues.push({
      code:
        "INVALID_TOTAL_GOALS_PICK",

      severity:
        "error",

      message:
        `Primary pick "${primary.pick}" is not a supported Total Goals market.`,
    });
  }

  if (
    category ===
      "BTTS" &&
    ![
      "BTTS Yes",
      "BTTS No",
      "Both Teams To Score - Yes",
      "Both Teams To Score - No",
    ].includes(
      primary.pick
    )
  ) {
    issues.push({
      code:
        "INVALID_BTTS_PICK",

      severity:
        "error",

      message:
        `Primary pick "${primary.pick}" is not a supported BTTS market.`,
    });
  }

  if (
    category ===
      "Team Total Goals" &&
    ![
      "Home Team Over 0.5 Goals",
      "Home Team Under 0.5 Goals",
      "Home Team Over 1.5 Goals",
      "Home Team Under 1.5 Goals",
      "Away Team Over 0.5 Goals",
      "Away Team Under 0.5 Goals",
      "Away Team Over 1.5 Goals",
      "Away Team Under 1.5 Goals",
    ].includes(
      primary.pick
    )
  ) {
    issues.push({
      code:
        "INVALID_TEAM_TOTAL_PICK",

      severity:
        "error",

      message:
        `Primary pick "${primary.pick}" is not a supported Team Total Goals market.`,
    });
  }

  if (
    category ===
      "Double Chance" &&
    ![
      "Double Chance 1X",
      "Double Chance X2",
      "Double Chance 12",
      "1X",
      "X2",
      "12",
    ].includes(
      primary.pick
    )
  ) {
    issues.push({
      code:
        "INVALID_DOUBLE_CHANCE_PICK",

      severity:
        "error",

      message:
        `Primary pick "${primary.pick}" is not a supported Double Chance market.`,
    });
  }

  /*
   * Exact score remains only a modal
   * estimate.
   *
   * If the current exact score is absent
   * or invalid, generate a neutral fallback
   * from expected goals.
   *
   * The exact score never changes the
   * canonical market selection.
   */
  const existingExactScore =
    prediction
      .vipPrediction
      .exactScore;

  const parsedExistingScore =
    parseExactScore(
      existingExactScore
    );

  const fallbackExactScore =
    buildExpectedScore(
      prediction
    );

  const normalizedExactScore =
    parsedExistingScore
      ? existingExactScore
      : fallbackExactScore;

  const parsedNormalizedScore =
    parseExactScore(
      normalizedExactScore
    );

  if (
    !parsedExistingScore &&
    existingExactScore !==
      "N/A"
  ) {
    issues.push({
      code:
        "INVALID_EXACT_SCORE_FORMAT",

      severity:
        "warning",

      message:
        `Exact score "${existingExactScore}" was invalid and was replaced by the expected-goals estimate ${fallbackExactScore}.`,
    });
  }

  /*
   * The exact score can disagree with the
   * primary market because it is only one
   * modal estimate.
   *
   * We record disagreement as a warning,
   * never as authority to rewrite the pick.
   */
  if (
    parsedNormalizedScore
  ) {
    const supportsPrimary =
      exactScoreSupportsPick(
        parsedNormalizedScore,
        primary
      );

    if (
      supportsPrimary ===
      false
    ) {
      issues.push({
        code:
          "EXACT_SCORE_PRIMARY_MARKET_DISAGREEMENT",

        severity:
          "warning",

        message:
          `Supplemental exact score ${normalizedExactScore} does not support primary market "${primary.pick}". The primary market remains canonical.`,
      });
    }
  }

  const normalizedPrediction:
    PredictionResult = {
    ...prediction,

    confidence:
      primary.confidence,

    valueBet:
      primary.pick,

    publicPrediction: {
      ...prediction
        .publicPrediction,

      marketCategory:
        primary.category,
    },

    vipPrediction: {
      ...prediction
        .vipPrediction,

      finalPrediction:
        primary.pick,

      confidence:
        primary.confidence,

      valueBet:
        primary.pick,

      exactScore:
        normalizedExactScore,

      reasoning: [
        ...prediction
          .vipPrediction
          .reasoning,

        `Market Consistency V3 verified "${primary.pick}" as the canonical ZERRA primary prediction in the ${primary.category} category.`,

        `The exact-score estimate ${normalizedExactScore} remains supplemental and does not override the primary market selection.`,
      ],
    },
  };

  const hardErrors =
    issues.filter(
      (
        issue
      ) =>
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