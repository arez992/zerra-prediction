export type ValidationResult = {
  correct: boolean | null;
  result: string;
  checked: boolean;
};

export function validatePrediction(prediction: any, fixture: any): ValidationResult {
  const status = fixture?.fixture?.status?.short;

  if (!["FT", "AET", "PEN"].includes(status)) {
    return {
      correct: null,
      result: "Match not finished yet",
      checked: false,
    };
  }

  const homeGoals = fixture?.goals?.home;
  const awayGoals = fixture?.goals?.away;

  if (homeGoals === null || awayGoals === null) {
    return {
      correct: null,
      result: "Final score unavailable",
      checked: false,
    };
  }

  const valueBet = String(prediction?.valueBet || "").toLowerCase();
  const totalGoals = homeGoals + awayGoals;

  let correct: boolean | null = null;

  if (valueBet.includes("home")) {
    correct = homeGoals > awayGoals;
  } else if (valueBet.includes("away")) {
    correct = awayGoals > homeGoals;
  } else if (valueBet.includes("draw")) {
    correct = homeGoals === awayGoals;
  } else if (valueBet.includes("over 2.5")) {
    correct = totalGoals > 2.5;
  } else if (valueBet.includes("under 2.5")) {
    correct = totalGoals < 2.5;
  } else if (valueBet.includes("btts")) {
    correct = homeGoals > 0 && awayGoals > 0;
  }

  return {
    correct,
    result: `${homeGoals}-${awayGoals}`,
    checked: correct !== null,
  };
}