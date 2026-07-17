import { calculateGoals } from "./goals";
import { calculateRisk } from "./risk";

import {
  calculateMatchIntelligence,
} from "./intelligence";

import {
  calculateMatchProbabilities,
} from "./probability";

import type {
  PredictionResult,
  PredictionMarketProbabilities,
  PredictionRisk,
} from "./prediction";

export type AIScoreResult =
  PredictionResult;

const MODEL_VERSION =
  "zerra-ai-v4.0";

const DATA_VERSION =
  "fixture-intelligence-v3";

function chooseFinalPrediction(
  markets:
    PredictionMarketProbabilities
): string {
  const outcomes = [
    {
      label:
        "Home Win",

      value:
        markets.homeWin,
    },

    {
      label:
        "Draw",

      value:
        markets.draw,
    },

    {
      label:
        "Away Win",

      value:
        markets.awayWin,
    },
  ];

  outcomes.sort(
    (first, second) =>
      second.value -
      first.value
  );

  return outcomes[0].label;
}

function chooseExactScore(
  homeExpectedGoals: number,
  awayExpectedGoals: number
): string {
  return `${Math.max(
    0,
    Math.round(
      homeExpectedGoals
    )
  )}-${Math.max(
    0,
    Math.round(
      awayExpectedGoals
    )
  )}`;
}

function chooseValueBet(
  markets:
    PredictionMarketProbabilities,
  confidence: number,
  riskScore: number
): string {
  if (
    confidence < 58 ||
    riskScore >= 72
  ) {
    return "No Value";
  }

  const mainOutcomes = [
    {
      label:
        "Home Win",

      probability:
        markets.homeWin,
    },

    {
      label:
        "Draw",

      probability:
        markets.draw,
    },

    {
      label:
        "Away Win",

      probability:
        markets.awayWin,
    },
  ].sort(
    (first, second) =>
      second.probability -
      first.probability
  );

  const leadingOutcome =
    mainOutcomes[0];

  const secondOutcome =
    mainOutcomes[1];

  const mainGap =
    leadingOutcome.probability -
    secondOutcome.probability;

  if (
    leadingOutcome.label ===
      "Home Win" &&
    markets.homeWin >= 57 &&
    mainGap >= 10 &&
    confidence >= 61
  ) {
    return "Home Win";
  }

  if (
    leadingOutcome.label ===
      "Away Win" &&
    markets.awayWin >= 57 &&
    mainGap >= 10 &&
    confidence >= 61
  ) {
    return "Away Win";
  }

  if (
    leadingOutcome.label ===
      "Draw" &&
    markets.draw >= 35 &&
    mainGap >= 4 &&
    confidence >= 60
  ) {
    return "Draw";
  }

  if (
    markets.over25 >= 68 &&
    confidence >= 60
  ) {
    return "Over 2.5 Goals";
  }

  if (
    markets.under25 >= 68 &&
    confidence >= 60
  ) {
    return "Under 2.5 Goals";
  }

  if (
    markets.btts >= 68 &&
    confidence >= 60
  ) {
    return "BTTS Yes";
  }

  return "No Value";
}

function buildPublicPrediction(
  risk: PredictionRisk,
  riskScore: number,
  markets:
    PredictionMarketProbabilities,
  confidence: number,
  drawPressure: number,
  matchupBalance: number
) {
  const keyInsights:
    string[] = [];

  const strongestOutcome =
    Math.max(
      markets.homeWin,
      markets.draw,
      markets.awayWin
    );

  if (
    strongestOutcome >= 58
  ) {
    keyInsights.push(
      "The intelligence model detects a meaningful separation between the leading match outcomes."
    );
  } else if (
    matchupBalance >= 70
  ) {
    keyInsights.push(
      "The matchup is highly balanced, so the result market requires additional caution."
    );
  } else {
    keyInsights.push(
      "The main outcome probabilities remain competitive without a dominant result signal."
    );
  }

  if (
    drawPressure >= 65
  ) {
    keyInsights.push(
      "The model detects elevated draw pressure from matchup balance, scoring conditions, and historical draw signals."
    );
  }

  if (
    markets.over25 >= 65
  ) {
    keyInsights.push(
      "The goal model identifies an elevated scoring environment."
    );
  } else if (
    markets.under25 >= 65
  ) {
    keyInsights.push(
      "The goal model identifies a controlled or lower-scoring environment."
    );
  }

  if (
    markets.btts >= 60
  ) {
    keyInsights.push(
      "Both teams show a positive scoring signal."
    );
  }

  if (
    confidence < 55
  ) {
    keyInsights.push(
      "Confidence is limited because the available signals do not create enough separation."
    );
  }

  return {
    overview:
      "ZERRA AI evaluated attack quality, defensive stability, venue performance, recent form, momentum, scoring consistency, matchup balance, draw pressure, expected goals, evidence reliability, and prediction risk.",

    risk,
    riskScore,
    keyInsights,

    teaser:
      "The final prediction, calibrated confidence, exact-score estimate, market probabilities, and value selection are reserved for VIP.",
  };
}

function buildVipReasoning(
  intelligence:
    ReturnType<
      typeof calculateMatchIntelligence
    >,

  goals:
    ReturnType<
      typeof calculateGoals
    >,

  markets:
    PredictionMarketProbabilities,

  confidence: number,
  risk: PredictionRisk,
  riskScore: number,
  valueBet: string,
  strongestOutcome: {
    label:
      | "Home Win"
      | "Draw"
      | "Away Win";

    probability: number;
  },
  probabilityGap: number
): string[] {
  const reasoning:
    string[] = [];

  reasoning.push(
    `The calibrated result model ranks ${strongestOutcome.label} first at ${strongestOutcome.probability}%, with a ${probabilityGap}-point advantage over the second outcome.`
  );

  reasoning.push(
    `Home overall rating is ${intelligence.home.overallRating}/100, compared with ${intelligence.away.overallRating}/100 for the away team.`
  );

  reasoning.push(
    `The intelligence rating difference is ${intelligence.ratingDifference} points, while evidence reliability is ${Math.round(
      intelligence.evidenceReliability * 100
    )}%.`
  );

  reasoning.push(
    `Matchup balance is ${intelligence.matchupBalance}/100 and draw pressure is ${intelligence.drawPressure}/100.`
  );

  reasoning.push(
    `The home edge signal is ${intelligence.homeEdge}/100, based on venue performance, result rates, and scoring balance.`
  );

  reasoning.push(
    `Home attack and defense ratings are ${intelligence.home.attackRating} and ${intelligence.home.defenseRating}; away attack and defense ratings are ${intelligence.away.attackRating} and ${intelligence.away.defenseRating}.`
  );

  reasoning.push(
    `Recent form ratings are ${intelligence.home.formRating} for the home team and ${intelligence.away.formRating} for the away team.`
  );

  reasoning.push(
    `Momentum ratings are ${intelligence.home.momentumRating} for the home team and ${intelligence.away.momentumRating} for the away team.`
  );

  reasoning.push(
    `Recent scoring averages are ${intelligence.home.recentGoalsForAverage} for the home team and ${intelligence.away.recentGoalsForAverage} for the away team.`
  );

  reasoning.push(
    `Expected goals are ${goals.homeExpectedGoals.toFixed(
      2
    )} for the home team and ${goals.awayExpectedGoals.toFixed(
      2
    )} for the away team, producing a total expectation of ${goals.expectedGoals.toFixed(
      2
    )}.`
  );

  reasoning.push(
    `Goal-market probabilities are Over 2.5 at ${markets.over25}%, Under 2.5 at ${markets.under25}%, and BTTS Yes at ${markets.btts}%.`
  );

  reasoning.push(
    `The model confidence is ${confidence}%, while prediction risk is ${risk} with a score of ${riskScore}/100.`
  );

  reasoning.push(
    `The selected value signal is ${valueBet}.`
  );

  return reasoning;
}

export function calculateAIScore(
  match: any
): AIScoreResult {
  const intelligence =
    calculateMatchIntelligence(
      match
    );

  const goals =
    calculateGoals(
      match
    );

  const probabilityResult =
    calculateMatchProbabilities({
      intelligence,

      goals: {
        homeExpectedGoals:
          goals.homeExpectedGoals,

        awayExpectedGoals:
          goals.awayExpectedGoals,

        expectedGoals:
          goals.expectedGoals,

        over25:
          goals.over25,

        under25:
          goals.under25,

        btts:
          goals.btts,
      },
    });

  const markets =
    probabilityResult.markets;

  const confidence =
    probabilityResult.confidence;

  const riskResult =
    calculateRisk(
      markets.homeWin,
      markets.draw,
      markets.awayWin
    );

  const valueBet =
    chooseValueBet(
      markets,
      confidence,
      riskResult.riskScore
    );

  const finalPrediction =
    chooseFinalPrediction(
      markets
    );

  const exactScore =
    chooseExactScore(
      goals.homeExpectedGoals,
      goals.awayExpectedGoals
    );

  const publicPrediction =
    buildPublicPrediction(
      riskResult.risk,
      riskResult.riskScore,
      markets,
      confidence,
      intelligence.drawPressure,
      intelligence.matchupBalance
    );

  const vipReasoning =
    buildVipReasoning(
      intelligence,
      goals,
      markets,
      confidence,
      riskResult.risk,
      riskResult.riskScore,
      valueBet,
      probabilityResult
        .strongestOutcome,
      probabilityResult
        .probabilityGap
    );

  return {
    confidence,

    homeWin:
      markets.homeWin,

    draw:
      markets.draw,

    awayWin:
      markets.awayWin,

    over25:
      markets.over25,

    under25:
      markets.under25,

    btts:
      markets.btts,

    risk:
      riskResult.risk,

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

        total:
          goals.expectedGoals,
      },

      reasoning:
        vipReasoning,
    },

    model: {
      version:
        MODEL_VERSION,

      dataVersion:
        DATA_VERSION,

      generatedAt:
        new Date().toISOString(),
    },

    review: {
      approved: false,
      reviewedBy: null,
      reviewedAt: null,
    },

    status:
      "draft",
  };
}