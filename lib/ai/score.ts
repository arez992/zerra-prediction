import { calculateGoals } from "./goals";
import { calculateRisk } from "./risk";

import {
  calculateMatchIntelligence,
} from "./intelligence";

import {
  calculateDataCompleteness,
} from "./data-completeness";

import type {
  DataCompletenessResult,
} from "./data-completeness";

import type {
  PredictionResult,
  PredictionMarketProbabilities,
  PredictionRisk,
} from "./prediction";

export type AIScoreResult =
  PredictionResult;

const MODEL_VERSION =
  "zerra-ai-v4.2";

const DATA_VERSION =
  "fixture-intelligence-v3-data-completeness-v1";

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
  awayExpectedGoals: number,
  markets:
    PredictionMarketProbabilities
): string {
  let homeGoals =
    Math.max(
      0,
      Math.round(
        homeExpectedGoals
      )
    );

  let awayGoals =
    Math.max(
      0,
      Math.round(
        awayExpectedGoals
      )
    );

  const prefersOver25 =
    markets.over25 >
    markets.under25;

  const prefersUnder25 =
    markets.under25 >=
    markets.over25;

  if (
    prefersUnder25 &&
    homeGoals + awayGoals >= 3
  ) {
    while (
      homeGoals +
        awayGoals >
      2
    ) {
      if (
        homeGoals >
        awayGoals &&
        homeGoals > 0
      ) {
        homeGoals -= 1;
      } else if (
        awayGoals >
        homeGoals &&
        awayGoals > 0
      ) {
        awayGoals -= 1;
      } else if (
        homeExpectedGoals >=
          awayExpectedGoals &&
        homeGoals > 0
      ) {
        homeGoals -= 1;
      } else if (
        awayGoals > 0
      ) {
        awayGoals -= 1;
      } else {
        break;
      }
    }
  }

  if (
    prefersOver25 &&
    homeGoals + awayGoals <= 2
  ) {
    while (
      homeGoals +
        awayGoals <
      3
    ) {
      if (
        homeExpectedGoals >=
        awayExpectedGoals
      ) {
        homeGoals += 1;
      } else {
        awayGoals += 1;
      }
    }
  }

  return `${homeGoals}-${awayGoals}`;
}

function chooseValueBet(
  markets:
    PredictionMarketProbabilities,
  confidence: number,
  dataCompleteness:
    DataCompletenessResult,
  risk: PredictionRisk
): string {
  if (
    !dataCompleteness.vipReady
  ) {
    return "No Value";
  }

  const minimumConfidence =
    risk === "High"
      ? 70
      : risk === "Medium"
        ? 63
        : 58;

  if (
    confidence <
    minimumConfidence
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
    markets.under25 >= 70
  ) {
    return "Under 2.5 Goals";
  }

  if (
    markets.btts >= 70
  ) {
    return "BTTS Yes";
  }

  if (
    markets.draw >= 34 &&
    confidence >= 65 &&
    risk !== "High"
  ) {
    return "Draw";
  }

  return "No Value";
}

function calculateBaseConfidence(
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

function applyDataConfidenceAdjustment(
  baseConfidence: number,
  dataCompleteness:
    DataCompletenessResult
): number {
  const completenessMultiplier =
    0.62 +
    (
      dataCompleteness.score /
      100
    ) * 0.38;

  const reliabilityMultiplier =
    0.72 +
    (
      dataCompleteness
        .summary
        .weightedReliability /
      100
    ) * 0.28;

  const criticalPenalty =
    Math.min(
      24,
      dataCompleteness
        .missingCritical
        .length * 7
    );

  const warningPenalty =
    Math.min(
      8,
      dataCompleteness
        .warnings
        .length * 2
    );

  const adjusted =
    baseConfidence *
    completenessMultiplier *
    reliabilityMultiplier -
    criticalPenalty -
    warningPenalty;

  const maximumConfidence =
    dataCompleteness.vipReady
      ? 88
      : dataCompleteness.score >= 60
        ? 64
        : 54;

  return Math.round(
    clamp(
      adjusted,
      30,
      maximumConfidence
    )
  );
}

function riskFromScore(
  riskScore: number
): PredictionRisk {
  if (riskScore >= 67) {
    return "High";
  }

  if (riskScore >= 36) {
    return "Medium";
  }

  return "Low";
}

function applyDataRiskAdjustment(
  baseRiskScore: number,
  dataCompleteness:
    DataCompletenessResult
): {
  risk: PredictionRisk;
  riskScore: number;
} {
  const completenessRisk =
    100 -
    dataCompleteness.score;

  const reliabilityRisk =
    100 -
    dataCompleteness
      .summary
      .weightedReliability;

  const freshnessRisk =
    100 -
    dataCompleteness
      .summary
      .weightedFreshness;

  const criticalPenalty =
    Math.min(
      32,
      dataCompleteness
        .missingCritical
        .length * 9
    );

  const warningPenalty =
    Math.min(
      12,
      dataCompleteness
        .warnings
        .length * 3
    );

  const dataRiskScore =
    completenessRisk * 0.45 +
    reliabilityRisk * 0.32 +
    freshnessRisk * 0.23 +
    criticalPenalty +
    warningPenalty;

  const adjustedRiskScore =
    Math.round(
      clamp(
        Math.max(
          baseRiskScore,
          dataRiskScore
        ),
        0,
        100
      )
    );

  return {
    risk:
      riskFromScore(
        adjustedRiskScore
      ),

    riskScore:
      adjustedRiskScore,
  };
}

function buildPublicPrediction(
  risk: PredictionRisk,
  riskScore: number,
  markets:
    PredictionMarketProbabilities,
  dataCompleteness:
    DataCompletenessResult
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
    markets.under25 >= 65
  ) {
    keyInsights.push(
      "The goal model identifies a lower-scoring match environment."
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
    dataCompleteness.vipReady
  ) {
    keyInsights.push(
      `Prediction data quality is ${dataCompleteness.level} with a completeness score of ${dataCompleteness.score}/100.`
    );
  } else {
    keyInsights.push(
      "The available evidence does not currently meet ZERRA's VIP publication standard."
    );
  }

  return {
    overview:
      "ZERRA AI evaluated attack quality, defensive stability, venue strength, recent form, momentum, goal signals, prediction risk, and source-data completeness.",

    risk,
    riskScore,
    keyInsights,

    teaser:
      dataCompleteness.vipReady
        ? "The final prediction, confidence score, exact-score estimate, and value selection are reserved for VIP."
        : "VIP prediction details are withheld until the available match data meets the required quality threshold.",
  };
}

function buildDataReasoning(
  dataCompleteness:
    DataCompletenessResult
): string[] {
  const reasoning = [
    `Data completeness is ${dataCompleteness.score}/100 (${dataCompleteness.level}).`,

    `Weighted data reliability is ${dataCompleteness.summary.weightedReliability}% and weighted freshness is ${dataCompleteness.summary.weightedFreshness}%.`,

    `Available evidence factors: ${dataCompleteness.summary.availableFactors}/${dataCompleteness.summary.totalFactors}.`,

    `VIP readiness is ${dataCompleteness.vipReady ? "approved" : "not approved"}.`,
  ];

  dataCompleteness
    .missingCritical
    .forEach(
      (item) => {
        reasoning.push(
          `Critical data issue: ${item}`
        );
      }
    );

  dataCompleteness
    .missingOptional
    .forEach(
      (item) => {
        reasoning.push(
          `Optional data gap: ${item}`
        );
      }
    );

  dataCompleteness
    .warnings
    .forEach(
      (item) => {
        reasoning.push(
          `Data warning: ${item}`
        );
      }
    );

  return reasoning;
}

export function calculateAIScore(
  match: any
): AIScoreResult {
  const generatedAt =
    new Date();

  const intelligence =
    calculateMatchIntelligence(
      match
    );

  const dataCompleteness =
    calculateDataCompleteness({
      match,
      intelligence,
      generatedAt,
    });

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

  const baseConfidence =
    calculateBaseConfidence(
      markets,
      intelligence
        .ratingDifference,
      intelligence
        .evidenceReliability
    );

  const confidence =
    applyDataConfidenceAdjustment(
      baseConfidence,
      dataCompleteness
    );

  const baseRiskResult =
    calculateRisk(
      markets.homeWin,
      markets.draw,
      markets.awayWin
    );

  const riskResult =
    applyDataRiskAdjustment(
      baseRiskResult.riskScore,
      dataCompleteness
    );

  const valueBet =
    chooseValueBet(
      markets,
      confidence,
      dataCompleteness,
      riskResult.risk
    );

  const calculatedFinalPrediction =
    chooseFinalPrediction(
      markets
    );

  const calculatedExactScore =
    chooseExactScore(
      goals.homeExpectedGoals,
      goals.awayExpectedGoals,
      markets
    );

  const finalPrediction =
    dataCompleteness.vipReady
      ? calculatedFinalPrediction
      : "Insufficient Data";

  const exactScore =
    dataCompleteness.vipReady
      ? calculatedExactScore
      : "N/A";

  const publicPrediction =
    buildPublicPrediction(
      riskResult.risk,
      riskResult.riskScore,
      markets,
      dataCompleteness
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

    `The exact-score estimate is ${exactScore}, aligned with the model's stronger ${
      markets.over25 >
      markets.under25
        ? "Over 2.5"
        : "Under 2.5"
    } goal-market signal.`,

    `Base model confidence was ${baseConfidence}% and data-adjusted confidence is ${confidence}%.`,

    `The prediction risk is ${riskResult.risk} with a data-adjusted score of ${riskResult.riskScore}/100.`,

    `The selected value signal is ${valueBet}.`,

    ...buildDataReasoning(
      dataCompleteness
    ),
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
        generatedAt.toISOString(),
    },

    review: {
      approved: false,
      reviewedBy: null,
      reviewedAt: null,
    },

    status:
      dataCompleteness.vipReady
        ? "review"
        : "draft",
  };
}