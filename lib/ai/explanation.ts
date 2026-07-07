import type { PredictionResult } from "./prediction";

export type ExplanationResult = {
  summary: string;
  reasons: string[];
};

export function generateExplanation(
  match: any,
  prediction: PredictionResult
): ExplanationResult {
  const homeTeam = match?.fixture?.teams?.home?.name || "Home team";
  const awayTeam = match?.fixture?.teams?.away?.name || "Away team";

  const reasons: string[] = [];

  if (prediction.homeWin > prediction.awayWin) {
    reasons.push(`${homeTeam} has the stronger win probability.`);
  } else if (prediction.awayWin > prediction.homeWin) {
    reasons.push(`${awayTeam} has the stronger win probability.`);
  } else {
    reasons.push("Both teams are closely balanced in the model.");
  }

  if (prediction.over25 >= 65) {
    reasons.push("The model detects a strong Over 2.5 goals signal.");
  }

  if (prediction.btts >= 60) {
    reasons.push("Both Teams To Score has a positive probability signal.");
  }

  reasons.push(`Risk level is classified as ${prediction.risk}.`);
  reasons.push(`Best value opportunity: ${prediction.valueBet}.`);

  return {
    summary: `ZERRA AI has analyzed ${homeTeam} vs ${awayTeam} using match context, team strength, goal probability, and risk signals.`,
    reasons,
  };
}