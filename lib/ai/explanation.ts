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
   * Existing consumers may continue using them.
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
    source?.fixture?.teams?.home?.name ||
    "Home team";

  const awayTeam =
    source?.fixture?.teams?.away?.name ||
    "Away team";

  const publicReasons = [
    ...prediction.publicPrediction
      .keyInsights,
    `The overall risk level is ${prediction.risk}.`,
  ];

  const vipReasons: string[] = [];

  if (
    prediction.homeWin >
    prediction.awayWin
  ) {
    vipReasons.push(
      `${homeTeam} has the stronger win probability at ${prediction.homeWin}%.`
    );
  } else if (
    prediction.awayWin >
    prediction.homeWin
  ) {
    vipReasons.push(
      `${awayTeam} has the stronger win probability at ${prediction.awayWin}%.`
    );
  } else {
    vipReasons.push(
      "Both teams are closely balanced in the model."
    );
  }

  vipReasons.push(
    `The draw probability is ${prediction.draw}%.`
  );

  vipReasons.push(
    `Expected goals are ${prediction.homeExpectedGoals.toFixed(
      2
    )}-${prediction.awayExpectedGoals.toFixed(
      2
    )}.`
  );

  if (prediction.over25 >= 65) {
    vipReasons.push(
      `Over 2.5 goals has a ${prediction.over25}% probability signal.`
    );
  }

  if (prediction.btts >= 60) {
    vipReasons.push(
      `Both Teams To Score has a ${prediction.btts}% probability signal.`
    );
  }

  vipReasons.push(
    `Risk is ${prediction.risk} with a score of ${prediction.riskScore}/100.`
  );

  vipReasons.push(
    `The current value signal is ${prediction.valueBet}.`
  );

  const publicSummary =
    `ZERRA AI analyzed ${homeTeam} vs ${awayTeam} using match context, team strength, goal signals, and risk indicators. ` +
    "The final prediction and premium values remain locked for VIP.";

  const vipSummary =
    `ZERRA AI favors ${prediction.vipPrediction.finalPrediction} for ${homeTeam} vs ${awayTeam} ` +
    `with ${prediction.confidence}% confidence and an estimated score of ${prediction.vipPrediction.exactScore}.`;

  return {
    publicSummary,
    publicReasons,
    vipSummary,
    vipReasons,

    summary: vipSummary,
    reasons: vipReasons,
  };
}