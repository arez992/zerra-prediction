import { calculateGoals } from "./goals";
import { calculateRisk } from "./risk";
import {
  calculateMatchIntelligence,
} from "./intelligence";

import type {
  PredictionResult,
  PredictionMarketProbabilities,
  PredictionRisk,
} from "./prediction";

export type AIScoreResult =
  PredictionResult;

const MODEL_VERSION =
  "zerra-ai-v3.0";

const DATA_VERSION =
  "fixture-intelligence-v2";

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}

function round(
  value: number,
  decimals = 1
): number {
  const multiplier =
    10 ** decimals;

  return Math.round(
    value * multiplier
  ) / multiplier;
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
  const safeHome =
    Math.max(1, homeWin);

  const safeDraw =
    Math.max(1, draw);

  const safeAway =
    Math.max(1, awayWin);

  const total =
    safeHome +
    safeDraw +
    safeAway;

  const normalizedHome =
    Math.round(
      (
        safeHome /
        total
      ) * 100
    );

  const normalizedAway =
    Math.round(
      (
        safeAway /
        total
      ) * 100
    );

  const normalizedDraw =
    100 -
    normalizedHome -
    normalizedAway;

  return {
    homeWin:
      normalizedHome,

    draw:
      normalizedDraw,

    awayWin:
      normalizedAway,
  };
}

function sigmoid(
  value: number
): number {
  return (
    1 /
    (
      1 +
      Math.exp(-value)
    )
  );
}

function buildMainProbabilities(
  homeRating: number,
  awayRating: number,
  evidenceReliability: number
): {
  homeWin: number;
  draw: number;
  awayWin: number;
} {
  const ratingDifference =
    homeRating -
    awayRating;

  const reliableDifference =
    ratingDifference *
    (
      0.65 +
      evidenceReliability * 0.35
    );

  const absoluteDifference =
    Math.abs(
      reliableDifference
    );

  const drawProbability =
    clamp(
      31 -
      absoluteDifference * 0.42,
      16,
      31
    );

  const remainingProbability =
    100 -
    drawProbability;

  const homeShare =
    sigmoid(
      (
        reliableDifference +
        2.5
      ) / 9
    );

  const homeWin =
    remainingProbability *
    homeShare;

  const awayWin =
    remainingProbability -
    homeWin;

  return normalizeProbabilities(
    homeWin,
    drawProbability,
    awayWin
  );
}

function chooseFinalPrediction(
  markets:
    PredictionMarketProbabilities
): string {
  const outcomes = [
    {
      label: "Home Win",
      value:
        markets.homeWin,
    },
    {
      label: "Draw",
      value:
        markets.draw,
    },
    {
      label: "Away Win",
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
  confidence: number
): string {
  if (
    confidence < 58
  ) {
    return "No Value";
  }

  if (
    markets.homeWin >= 62
  ) {
    return "Home Win";
  }

  if (
    markets.awayWin >= 62
  ) {
    return "Away Win";
  }

  if (
    markets.over25 >= 70
  ) {
    return "Over 2.5 Goals";
  }

  if (
    markets.btts >= 70
  ) {
    return "BTTS Yes";
  }

  if (
    markets.draw >= 34 &&
    confidence >= 60
  ) {
    return "Draw";
  }

  return "No Value";
}

function calculateConfidence(
  markets:
    PredictionMarketProbabilities,
  ratingDifference: number,
  evidenceReliability: number
): number {
  const orderedOutcomes = [
    markets.homeWin,
    markets.draw,
    markets.awayWin,
  ].sort(
    (first, second) =>
      second - first
  );

  const strongestOutcome =
    orderedOutcomes[0];

  const secondOutcome =
    orderedOutcomes[1];

  const probabilityGap =
    strongestOutcome -
    secondOutcome;

  const ratingSeparation =
    clamp(
      Math.abs(
        ratingDifference
      ),
      0,
      30
    );

  const rawConfidence =
    38 +
    probabilityGap * 0.75 +
    ratingSeparation * 0.45 +
    evidenceReliability * 16;

  return Math.round(
    clamp(
      rawConfidence,
      38,
      88
    )
  );
}

function buildPublicPrediction(
  risk: PredictionRisk,
  riskScore: number,
  markets:
    PredictionMarketProbabilities
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
      "The intelligence model detects a clear difference between the leading match outcomes."
    );
  } else {
    keyInsights.push(
      "The match remains relatively balanced across the main outcome probabilities."
    );
  }

  if (
    markets.over25 >= 65
  ) {
    keyInsights.push(
      "The goal model identifies an elevated scoring environment."
    );
  }

  if (
    markets.btts >= 60
  ) {
    keyInsights.push(
      "Both teams show a positive scoring signal."
    );
  }

  return {
    overview:
      "ZERRA AI evaluated attack quality, defensive stability, venue strength, recent form, momentum, goal signals, and prediction risk.",

    risk,
    riskScore,
    keyInsights,

    teaser:
      "The final prediction, confidence score, exact-score estimate, and value selection are reserved for VIP.",
  };
}

export function calculateAIScore(
  match: any
): AIScoreResult {
  const intelligence =
    calculateMatchIntelligence(
      match
    );

  const goals =
    calculateGoals(match);

  const homeMatchupRating =
    intelligence.home
      .overallRating * 0.45 +
    intelligence.home
      .attackRating * 0.2 +
    intelligence.home
      .venueRating * 0.15 +
    intelligence.home
      .formRating * 0.1 +
    intelligence.home
      .momentumRating * 0.1 +
    (
      100 -
      intelligence.away
        .defenseRating
    ) * 0.1;

  const awayMatchupRating =
    intelligence.away
      .overallRating * 0.45 +
    intelligence.away
      .attackRating * 0.2 +
    intelligence.away
      .venueRating * 0.15 +
    intelligence.away
      .formRating * 0.1 +
    intelligence.away
      .momentumRating * 0.1 +
    (
      100 -
      intelligence.home
        .defenseRating
    ) * 0.1;

  const mainProbabilities =
    buildMainProbabilities(
      homeMatchupRating,
      awayMatchupRating,
      intelligence
        .evidenceReliability
    );

  const markets:
    PredictionMarketProbabilities = {
      ...mainProbabilities,

      over25:
        goals.over25,

      under25:
        goals.under25,

      btts:
        goals.btts,
    };

  const confidence =
    calculateConfidence(
      markets,
      intelligence
        .ratingDifference,
      intelligence
        .evidenceReliability
    );

  const riskResult =
    calculateRisk(
      markets.homeWin,
      markets.draw,
      markets.awayWin
    );

  const valueBet =
    chooseValueBet(
      markets,
      confidence
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
      markets
    );

  const vipReasoning = [
    `Home overall rating is ${intelligence.home.overallRating}/100 and away overall rating is ${intelligence.away.overallRating}/100.`,

    `The rating difference is ${intelligence.ratingDifference} points with evidence reliability of ${Math.round(
      intelligence.evidenceReliability * 100
    )}%.`,

    `Home attack and defense ratings are ${intelligence.home.attackRating} and ${intelligence.home.defenseRating}.`,

    `Away attack and defense ratings are ${intelligence.away.attackRating} and ${intelligence.away.defenseRating}.`,

    `Recent form ratings are ${intelligence.home.formRating} for the home team and ${intelligence.away.formRating} for the away team.`,

    `Momentum ratings are ${intelligence.home.momentumRating} for the home team and ${intelligence.away.momentumRating} for the away team.`,

    `Expected goals are ${goals.homeExpectedGoals.toFixed(
      2
    )} for the home team and ${goals.awayExpectedGoals.toFixed(
      2
    )} for the away team.`,

    `The model confidence is ${confidence}% and the prediction risk is ${riskResult.risk} with a score of ${riskResult.riskScore}/100.`,

    `The selected value signal is ${valueBet}.`,
  ];

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