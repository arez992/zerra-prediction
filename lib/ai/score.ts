import { calculateForm } from "./form";
import { calculateStrength } from "./strength";
import { calculateGoals } from "./goals";
import { calculateRisk } from "./risk";

import type {
  PredictionResult,
  PredictionMarketProbabilities,
  PredictionRisk,
} from "./prediction";

export type AIScoreResult =
  PredictionResult;

const MODEL_VERSION = "zerra-ai-v2.1";
const DATA_VERSION = "fixture-context-v1";

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function normalizeProbabilities(
  homeWin: number,
  draw: number,
  awayWin: number
): {
  homeWin: number;
  draw: number;
  awayWin: number;
} {
  const safeHome = Math.max(1, homeWin);
  const safeDraw = Math.max(1, draw);
  const safeAway = Math.max(1, awayWin);

  const total =
    safeHome + safeDraw + safeAway;

  const normalizedHome = Math.round(
    (safeHome / total) * 100
  );

  const normalizedAway = Math.round(
    (safeAway / total) * 100
  );

  const normalizedDraw =
    100 -
    normalizedHome -
    normalizedAway;

  return {
    homeWin: normalizedHome,
    draw: normalizedDraw,
    awayWin: normalizedAway,
  };
}

function chooseFinalPrediction(
  markets: PredictionMarketProbabilities
): string {
  const outcomes = [
    {
      label: "Home Win",
      value: markets.homeWin,
    },
    {
      label: "Draw",
      value: markets.draw,
    },
    {
      label: "Away Win",
      value: markets.awayWin,
    },
  ];

  outcomes.sort(
    (a, b) => b.value - a.value
  );

  return outcomes[0].label;
}

function chooseExactScore(
  homeExpectedGoals: number,
  awayExpectedGoals: number
): string {
  return `${Math.max(
    0,
    Math.round(homeExpectedGoals)
  )}-${Math.max(
    0,
    Math.round(awayExpectedGoals)
  )}`;
}

function chooseValueBet(
  markets: PredictionMarketProbabilities
): string {
  if (markets.over25 >= 70) {
    return "Over 2.5 Goals";
  }

  if (markets.homeWin >= 60) {
    return "Home Win";
  }

  if (markets.awayWin >= 60) {
    return "Away Win";
  }

  if (markets.btts >= 70) {
    return "BTTS Yes";
  }

  if (markets.draw >= 38) {
    return "Draw";
  }

  return "No Value";
}

function buildPublicPrediction(
  risk: PredictionRisk,
  riskScore: number,
  markets: PredictionMarketProbabilities
) {
  const keyInsights: string[] = [];

  const strongestOutcome = Math.max(
    markets.homeWin,
    markets.draw,
    markets.awayWin
  );

  if (strongestOutcome >= 55) {
    keyInsights.push(
      "The model detects a meaningful difference between the main outcome probabilities."
    );
  } else {
    keyInsights.push(
      "The match appears relatively balanced across the main outcome probabilities."
    );
  }

  if (markets.over25 >= 65) {
    keyInsights.push(
      "The goal model identifies an elevated scoring environment."
    );
  }

  if (markets.btts >= 60) {
    keyInsights.push(
      "Both teams have a positive scoring signal."
    );
  }

  return {
    overview:
      "ZERRA AI evaluated recent form, team strength, goal signals, and match risk.",
    risk,
    riskScore,
    keyInsights,
    teaser:
      "The final prediction, confidence score, exact-score estimate, and value selection are reserved for VIP.",
  };
}

export function calculateAIScore(
  match: unknown
): AIScoreResult {
  const form = calculateForm(match);
  const strength =
    calculateStrength(match);
  const goals = calculateGoals(match);

  const rawHomeWin =
    form.homeFormScore * 0.45 +
    strength.homeStrength * 0.55;

  const rawAwayWin =
    form.awayFormScore * 0.45 +
    strength.awayStrength * 0.55;

  const initialHomeWin = clamp(
    Math.round(rawHomeWin),
    5,
    80
  );

  const initialAwayWin = clamp(
    Math.round(rawAwayWin),
    5,
    80
  );

  const initialDraw = Math.max(
    10,
    100 -
      initialHomeWin -
      initialAwayWin
  );

  const probabilities =
    normalizeProbabilities(
      initialHomeWin,
      initialDraw,
      initialAwayWin
    );

  const markets:
    PredictionMarketProbabilities = {
      ...probabilities,
      over25: goals.over25,
      under25: goals.under25,
      btts: goals.btts,
    };

  const confidence = Math.max(
    markets.homeWin,
    markets.draw,
    markets.awayWin
  );

  const riskResult = calculateRisk(
    markets.homeWin,
    markets.draw,
    markets.awayWin
  );

  const valueBet = chooseValueBet(markets);

  const finalPrediction =
    chooseFinalPrediction(markets);

  const exactScore = chooseExactScore(
    goals.homeExpectedGoals,
    goals.awayExpectedGoals
  );

  const publicPrediction =
    buildPublicPrediction(
      riskResult.risk,
      riskResult.riskScore,
      markets
    );

  const vipReasoning = [
    `The highest 1X2 probability is ${confidence}%.`,
    `Expected goals are ${goals.homeExpectedGoals.toFixed(
      2
    )} for the home team and ${goals.awayExpectedGoals.toFixed(
      2
    )} for the away team.`,
    `The model classifies the prediction risk as ${riskResult.risk} with a score of ${riskResult.riskScore}/100.`,
    `The selected value signal is ${valueBet}.`,
  ];

  return {
    confidence,
    homeWin: markets.homeWin,
    draw: markets.draw,
    awayWin: markets.awayWin,
    over25: markets.over25,
    under25: markets.under25,
    btts: markets.btts,
    risk: riskResult.risk,
    riskScore:
      riskResult.riskScore,
    valueBet,
    expectedGoals:
      goals.expectedGoals,
    homeExpectedGoals:
      goals.homeExpectedGoals,
    awayExpectedGoals:
      goals.awayExpectedGoals,

    publicPrediction,

    vipPrediction: {
      finalPrediction,
      confidence,
      exactScore,
      valueBet,
      markets,
      expectedGoals: {
        home:
          goals.homeExpectedGoals,
        away:
          goals.awayExpectedGoals,
        total: goals.expectedGoals,
      },
      reasoning: vipReasoning,
    },

    model: {
      version: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      generatedAt:
        new Date().toISOString(),
    },

    review: {
      approved: false,
      reviewedBy: null,
      reviewedAt: null,
    },

    status: "draft",
  };
}