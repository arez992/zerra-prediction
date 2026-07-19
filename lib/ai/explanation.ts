import type {
  PredictionResult,
} from "./prediction";

export type ExplanationResult = {
  publicSummary: string;
  publicReasons: string[];

  vipSummary: string;
  vipReasons: string[];

  /*
   * Backward-compatible fields.
   * Existing consumers may continue
   * using them.
   */
  summary: string;
  reasons: string[];
};

export function generateExplanation(
  match: unknown,
  prediction: PredictionResult
): ExplanationResult {
  const source = match as {
    fixture?: {
      teams?: {
        home?: {
          name?: string;
        };

        away?: {
          name?: string;
        };
      };
    };
  };

  const homeTeam =
    source?.fixture
      ?.teams
      ?.home
      ?.name ||
    "Home team";

  const awayTeam =
    source?.fixture
      ?.teams
      ?.away
      ?.name ||
    "Away team";

  const primaryPrediction =
    prediction
      .vipPrediction
      .primaryPrediction;

  const publicReasons = [
    ...prediction
      .publicPrediction
      .keyInsights,

    `The overall risk level is ${prediction.risk}.`,
  ];

  const vipReasons:
    string[] = [];

  /*
   * Canonical market explanation.
   */
  if (
    primaryPrediction
      .qualified
  ) {
    vipReasons.push(
      `ZERRA selected ${primaryPrediction.pick} as the strongest qualified market for this match.`
    );

    vipReasons.push(
      `The selected market belongs to the ${primaryPrediction.category} category.`
    );

    vipReasons.push(
      `The evidence-adjusted confidence for this prediction is ${primaryPrediction.confidence}%.`
    );

    vipReasons.push(
      primaryPrediction.reason
    );
  } else if (
    primaryPrediction.pick ===
    "Insufficient Data"
  ) {
    vipReasons.push(
      "The available match data does not meet ZERRA's minimum quality standard for a premium prediction."
    );
  } else {
    vipReasons.push(
      "ZERRA did not identify a market strong enough to meet the current primary-prediction threshold."
    );

    vipReasons.push(
      primaryPrediction.reason
    );
  }

  /*
   * Supporting 1X2 analysis.
   *
   * Match winner probabilities remain
   * useful context but do not define
   * the canonical prediction.
   */
  const strongestOutcome =
    Math.max(
      prediction.homeWin,
      prediction.draw,
      prediction.awayWin
    );

  if (
    strongestOutcome ===
    prediction.homeWin
  ) {
    vipReasons.push(
      `Supporting match-outcome analysis gives ${homeTeam} the highest 1X2 probability at ${prediction.homeWin}%.`
    );
  } else if (
    strongestOutcome ===
    prediction.awayWin
  ) {
    vipReasons.push(
      `Supporting match-outcome analysis gives ${awayTeam} the highest 1X2 probability at ${prediction.awayWin}%.`
    );
  } else {
    vipReasons.push(
      `Supporting match-outcome analysis gives the draw the highest 1X2 probability at ${prediction.draw}%.`
    );
  }

  vipReasons.push(
    `Supporting 1X2 probabilities are Home ${prediction.homeWin}%, Draw ${prediction.draw}%, Away ${prediction.awayWin}%.`
  );

  /*
   * Goal intelligence.
   */
  vipReasons.push(
    `Expected goals are ${prediction.homeExpectedGoals.toFixed(
      2
    )}-${prediction.awayExpectedGoals.toFixed(
      2
    )}, with ${prediction.expectedGoals.toFixed(
      2
    )} total expected goals.`
  );

  vipReasons.push(
    `Over 2.5 Goals is ${prediction.over25}% and Under 2.5 Goals is ${prediction.under25}%.`
  );

  vipReasons.push(
    `Both Teams To Score has a ${prediction.btts}% Yes probability signal.`
  );

  /*
   * Additional market intelligence.
   */
  const markets =
    prediction
      .vipPrediction
      .markets;

  if (
    typeof markets
      .doubleChance1X ===
    "number"
  ) {
    vipReasons.push(
      `Double Chance 1X is ${markets.doubleChance1X}%.`
    );
  }

  if (
    typeof markets
      .doubleChanceX2 ===
    "number"
  ) {
    vipReasons.push(
      `Double Chance X2 is ${markets.doubleChanceX2}%.`
    );
  }

  if (
    typeof markets
      .doubleChance12 ===
    "number"
  ) {
    vipReasons.push(
      `Double Chance 12 is ${markets.doubleChance12}%.`
    );
  }

  vipReasons.push(
    `Risk is ${prediction.risk} with a score of ${prediction.riskScore}/100.`
  );

  if (
    prediction
      .vipPrediction
      .exactScore !==
    "N/A"
  ) {
    vipReasons.push(
      `The supplemental exact-score estimate is ${prediction.vipPrediction.exactScore}. This estimate does not override the primary market prediction.`
    );
  }

  const publicSummary =
    `ZERRA AI analyzed ${homeTeam} vs ${awayTeam} across goal markets, BTTS, team-goal totals, double-chance probabilities, supporting match-outcome probabilities, data quality, and risk. ` +
    (
      primaryPrediction
        .qualified
        ? "The strongest qualified prediction and full premium reasoning remain protected for VIP."
        : "No strong public market prediction is being forced when the available evidence does not meet ZERRA's quality standard."
    );

  let vipSummary:
    string;

  if (
    primaryPrediction
      .qualified
  ) {
    vipSummary =
      `ZERRA AI selected ${primaryPrediction.pick} as the primary prediction for ${homeTeam} vs ${awayTeam}, ` +
      `with ${primaryPrediction.confidence}% evidence-adjusted confidence and ${prediction.risk.toLowerCase()} risk.`;
  } else if (
    primaryPrediction.pick ===
    "Insufficient Data"
  ) {
    vipSummary =
      `ZERRA AI withheld a primary prediction for ${homeTeam} vs ${awayTeam} because the available match data does not meet the required quality standard.`;
  } else {
    vipSummary =
      `ZERRA AI analyzed all supported primary markets for ${homeTeam} vs ${awayTeam}, but no market currently meets the threshold for a strong prediction.`;
  }

  return {
    publicSummary,
    publicReasons,

    vipSummary,
    vipReasons,

    summary:
      vipSummary,

    reasons:
      vipReasons,
  };
}