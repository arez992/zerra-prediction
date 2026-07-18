import {
  calculateGoals,
} from "./goals";

import {
  calculateRisk,
} from "./risk";

import {
  calculateMatchIntelligence,
} from "./intelligence";

import {
  calculateDataCompleteness,
} from "./data-completeness";

import {
  buildPerformanceFactors,
  type PerformanceFactorSummary,
} from "./factors";

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
  "zerra-ai-v4.3-factor-confidence";

const DATA_VERSION =
  "fixture-intelligence-v4-factor-architecture-v1";

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

  return (
    Math.round(
      value *
        multiplier
    ) /
    multiplier
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
    Math.max(
      1,
      homeWin
    );

  const safeDraw =
    Math.max(
      1,
      draw
    );

  const safeAway =
    Math.max(
      1,
      awayWin
    );

  const total =
    safeHome +
    safeDraw +
    safeAway;

  const normalizedHome =
    Math.round(
      (
        safeHome /
        total
      ) *
        100
    );

  const normalizedAway =
    Math.round(
      (
        safeAway /
        total
      ) *
        100
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
      Math.exp(
        -value
      )
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
      evidenceReliability *
        0.35
    );

  const absoluteDifference =
    Math.abs(
      reliableDifference
    );

  const drawProbability =
    clamp(
      31 -
        absoluteDifference *
          0.42,
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
      ) /
        9
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

/*
 * Factor Architecture v4 does not
 * replace the existing model abruptly.
 *
 * It applies a controlled adjustment
 * to the established 1X2 probabilities.
 *
 * Maximum directional shift is kept
 * intentionally small to avoid unstable
 * prediction changes during rollout.
 */
function applyFactorInfluence(
  baseProbabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  },
  factorSummary:
    PerformanceFactorSummary
): {
  homeWin: number;
  draw: number;
  awayWin: number;
} {
  /*
   * weightedScore:
   *
   * 50  = neutral
   * >50 = home signal
   * <50 = away signal
   */
  const directionalSignal =
    clamp(
      (
        factorSummary
          .weightedScore -
        50
      ) /
        50,
      -1,
      1
    );

  const evidenceStrength =
    clamp(
      (
        factorSummary
          .weightedConfidence *
          0.5 +
        factorSummary
          .weightedReliability *
          0.5
      ) /
        100,
      0,
      1
    );

  /*
   * At maximum evidence strength,
   * factor architecture can move
   * Home/Away by at most 8 points.
   */
  const maximumShift = 8;

  const directionalShift =
    directionalSignal *
    maximumShift *
    evidenceStrength;

  /*
   * High uncertainty slightly
   * protects the draw probability
   * instead of forcing a side.
   */
  const uncertaintyDrawBoost =
    clamp(
      (
        factorSummary
          .uncertainty -
        50
      ) *
        0.04,
      0,
      2
    );

  return normalizeProbabilities(
    baseProbabilities
      .homeWin +
      directionalShift,

    baseProbabilities
      .draw +
      uncertaintyDrawBoost,

    baseProbabilities
      .awayWin -
      directionalShift
  );
}

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
    (
      first,
      second
    ) =>
      second.value -
      first.value
  );

  return outcomes[0].label;
}

function chooseExactScore(
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  markets:
    PredictionMarketProbabilities,
  finalPrediction: string
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

  if (
    finalPrediction ===
    "Home Win"
  ) {
    if (
      homeGoals <=
      awayGoals
    ) {
      homeGoals =
        awayGoals + 1;
    }
  } else if (
    finalPrediction ===
    "Away Win"
  ) {
    if (
      awayGoals <=
      homeGoals
    ) {
      awayGoals =
        homeGoals + 1;
    }
  } else if (
    finalPrediction ===
    "Draw"
  ) {
    const averageGoals =
      Math.max(
        0,
        Math.round(
          (
            homeExpectedGoals +
            awayExpectedGoals
          ) /
            2
        )
      );

    homeGoals =
      averageGoals;

    awayGoals =
      averageGoals;
  }

  if (
    prefersOver25
  ) {
    if (
      homeGoals +
        awayGoals <
      3
    ) {
      if (
        finalPrediction ===
        "Home Win"
      ) {
        homeGoals = 2;
        awayGoals = 1;
      } else if (
        finalPrediction ===
        "Away Win"
      ) {
        homeGoals = 1;
        awayGoals = 2;
      } else {
        homeGoals = 2;
        awayGoals = 2;
      }
    }
  } else {
    if (
      homeGoals +
        awayGoals >
      2
    ) {
      if (
        finalPrediction ===
        "Home Win"
      ) {
        homeGoals = 1;
        awayGoals = 0;
      } else if (
        finalPrediction ===
        "Away Win"
      ) {
        homeGoals = 0;
        awayGoals = 1;
      } else {
        homeGoals = 1;
        awayGoals = 1;
      }
    }
  }

  if (
    finalPrediction ===
      "Home Win" &&
    homeGoals <=
      awayGoals
  ) {
    homeGoals =
      awayGoals + 1;
  }

  if (
    finalPrediction ===
      "Away Win" &&
    awayGoals <=
      homeGoals
  ) {
    awayGoals =
      homeGoals + 1;
  }

  if (
    finalPrediction ===
    "Draw"
  ) {
    const drawGoals =
      prefersOver25
        ? 2
        : 1;

    homeGoals =
      drawGoals;

    awayGoals =
      drawGoals;
  }

  return `${homeGoals}-${awayGoals}`;
}

/*
 * Confidence Redesign v4
 *
 * Confidence is no longer derived
 * mainly from prediction probability.
 *
 * It now combines:
 *
 * - probability separation
 * - factor confidence
 * - factor reliability
 * - data completeness
 * - freshness
 * - model uncertainty
 *
 * Missing or weak evidence lowers
 * confidence instead of creating
 * fake certainty.
 */
function calculateV4Confidence(
  markets:
    PredictionMarketProbabilities,
  factorSummary:
    PerformanceFactorSummary,
  dataCompleteness:
    DataCompletenessResult
): number {
  const orderedOutcomes = [
    markets.homeWin,
    markets.draw,
    markets.awayWin,
  ].sort(
    (
      first,
      second
    ) =>
      second -
      first
  );

  const strongest =
    orderedOutcomes[0];

  const second =
    orderedOutcomes[1];

  const probabilityGap =
    strongest -
    second;

  const probabilityEvidence =
    clamp(
      42 +
        probabilityGap *
          1.65,
      35,
      88
    );

  const factorEvidence =
    (
      factorSummary
        .weightedConfidence *
        0.55 +
      factorSummary
        .weightedReliability *
        0.45
    );

  const dataEvidence =
    (
      dataCompleteness
        .score *
        0.5 +
      dataCompleteness
        .summary
        .weightedReliability *
        0.3 +
      dataCompleteness
        .summary
        .weightedFreshness *
        0.2
    );

  const baseConfidence =
    probabilityEvidence *
      0.38 +
    factorEvidence *
      0.34 +
    dataEvidence *
      0.28;

  const uncertaintyPenalty =
    factorSummary
      .uncertainty *
      0.22;

  const criticalPenalty =
    Math.min(
      24,
      dataCompleteness
        .missingCritical
        .length *
        8
    );

  const warningPenalty =
    Math.min(
      8,
      dataCompleteness
        .warnings
        .length *
        2
    );

  const adjusted =
    baseConfidence -
    uncertaintyPenalty -
    criticalPenalty -
    warningPenalty;

  /*
   * Hard confidence caps.
   *
   * Poor data can never produce
   * an artificially high score.
   */
  const maximumConfidence =
    dataCompleteness
      .vipReady
      ? factorSummary
          .uncertainty <=
        25
        ? 88
        : 82
      : dataCompleteness
            .score >=
          60
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

function chooseValueBet(
  markets:
    PredictionMarketProbabilities,
  confidence: number,
  dataCompleteness:
    DataCompletenessResult,
  risk:
    PredictionRisk
): string {
  if (
    !dataCompleteness
      .vipReady
  ) {
    return "No Value";
  }

  const minimumConfidence =
    risk === "High"
      ? 70
      : risk ===
          "Medium"
        ? 63
        : 58;

  if (
    confidence <
    minimumConfidence
  ) {
    return "No Value";
  }

  if (
    markets.homeWin >=
    62
  ) {
    return "Home Win";
  }

  if (
    markets.awayWin >=
    62
  ) {
    return "Away Win";
  }

  if (
    markets.over25 >=
    70
  ) {
    return "Over 2.5 Goals";
  }

  if (
    markets.under25 >=
    70
  ) {
    return "Under 2.5 Goals";
  }

  if (
    markets.btts >=
    70
  ) {
    return "BTTS Yes";
  }

  if (
    markets.draw >=
      34 &&
    confidence >=
      65 &&
    risk !==
      "High"
  ) {
    return "Draw";
  }

  return "No Value";
}

function riskFromScore(
  riskScore: number
): PredictionRisk {
  if (
    riskScore >=
    67
  ) {
    return "High";
  }

  if (
    riskScore >=
    36
  ) {
    return "Medium";
  }

  return "Low";
}

function applyV4RiskAdjustment(
  baseRiskScore: number,
  dataCompleteness:
    DataCompletenessResult,
  factorSummary:
    PerformanceFactorSummary
): {
  risk:
    PredictionRisk;

  riskScore:
    number;
} {
  const completenessRisk =
    100 -
    dataCompleteness
      .score;

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

  const factorUncertaintyRisk =
    factorSummary
      .uncertainty;

  const criticalPenalty =
    Math.min(
      32,
      dataCompleteness
        .missingCritical
        .length *
        9
    );

  const warningPenalty =
    Math.min(
      12,
      dataCompleteness
        .warnings
        .length *
        3
    );

  const dataRiskScore =
    completenessRisk *
      0.3 +
    reliabilityRisk *
      0.22 +
    freshnessRisk *
      0.15 +
    factorUncertaintyRisk *
      0.33 +
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
  risk:
    PredictionRisk,
  riskScore: number,
  markets:
    PredictionMarketProbabilities,
  dataCompleteness:
    DataCompletenessResult,
  factorSummary:
    PerformanceFactorSummary
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
    strongestOutcome >=
    58
  ) {
    keyInsights.push(
      "The prediction model identifies a measurable difference between the leading match outcomes."
    );
  } else {
    keyInsights.push(
      "The match remains relatively balanced across the main outcome probabilities."
    );
  }

  if (
    factorSummary
      .weightedScore >=
    56
  ) {
    keyInsights.push(
      "The combined performance factors lean toward the home team."
    );
  }

  if (
    factorSummary
      .weightedScore <=
    44
  ) {
    keyInsights.push(
      "The combined performance factors lean toward the away team."
    );
  }

  if (
    markets.over25 >=
    65
  ) {
    keyInsights.push(
      "The goal model identifies an elevated scoring environment."
    );
  }

  if (
    markets.under25 >=
    65
  ) {
    keyInsights.push(
      "The goal model identifies a lower-scoring match environment."
    );
  }

  if (
    markets.btts >=
    60
  ) {
    keyInsights.push(
      "Both teams show a positive scoring signal."
    );
  }

  if (
    factorSummary
      .uncertainty >=
    45
  ) {
    keyInsights.push(
      "Model uncertainty remains elevated, so confidence is intentionally limited."
    );
  }

  if (
    dataCompleteness
      .vipReady
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
      "ZERRA AI v4.3 evaluated weighted performance factors, attack and defense strength, venue performance, recent form, goal signals, model uncertainty, risk, and source-data completeness.",

    risk,
    riskScore,
    keyInsights,

    teaser:
      dataCompleteness
        .vipReady
        ? "The final prediction, confidence score, exact-score estimate, and model selection are reserved for VIP."
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

    `VIP readiness is ${
      dataCompleteness
        .vipReady
        ? "approved"
        : "not approved"
    }.`,
  ];

  dataCompleteness
    .missingCritical
    .forEach(
      (
        item
      ) => {
        reasoning.push(
          `Critical data issue: ${item}`
        );
      }
    );

  dataCompleteness
    .missingOptional
    .forEach(
      (
        item
      ) => {
        reasoning.push(
          `Optional data gap: ${item}`
        );
      }
    );

  dataCompleteness
    .warnings
    .forEach(
      (
        item
      ) => {
        reasoning.push(
          `Data warning: ${item}`
        );
      }
    );

  return reasoning;
}

function buildFactorReasoning(
  factorSummary:
    PerformanceFactorSummary
): string[] {
  const reasoning = [
    `Performance factor score is ${factorSummary.weightedScore}/100, where 50 represents a balanced matchup.`,

    `Factor confidence is ${factorSummary.weightedConfidence}% with weighted reliability of ${factorSummary.weightedReliability}%.`,

    `Estimated model uncertainty is ${factorSummary.uncertainty}%.`,

    `Available prediction factors: ${factorSummary.availableFactors}/${factorSummary.totalFactors}.`,
  ];

  const strongestFactors =
    factorSummary
      .factors
      .filter(
        (
          factor
        ) =>
          factor
            .availability
      )
      .sort(
        (
          first,
          second
        ) =>
          second.weight -
          first.weight
      )
      .slice(
        0,
        5
      );

  strongestFactors
    .forEach(
      (
        factor
      ) => {
        reasoning.push(
          `${factor.key}: ${factor.reason}`
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
    calculateGoals(
      match
    );

  /*
   * Factor Architecture v4
   *
   * This consumes data already present
   * in the prediction pipeline.
   *
   * It creates zero new API calls.
   */
  const factorSummary =
    buildPerformanceFactors({
      match,
      intelligence,
      goals,
      dataCompleteness,
    });

  const homeMatchupRating =
    intelligence
      .home
      .overallRating *
      0.45 +
    intelligence
      .home
      .attackRating *
      0.2 +
    intelligence
      .home
      .venueRating *
      0.15 +
    intelligence
      .home
      .formRating *
      0.1 +
    intelligence
      .home
      .momentumRating *
      0.1 +
    (
      100 -
      intelligence
        .away
        .defenseRating
    ) *
      0.1;

  const awayMatchupRating =
    intelligence
      .away
      .overallRating *
      0.45 +
    intelligence
      .away
      .attackRating *
      0.2 +
    intelligence
      .away
      .venueRating *
      0.15 +
    intelligence
      .away
      .formRating *
      0.1 +
    intelligence
      .away
      .momentumRating *
      0.1 +
    (
      100 -
      intelligence
        .home
        .defenseRating
    ) *
      0.1;

  const baseProbabilities =
    buildMainProbabilities(
      homeMatchupRating,
      awayMatchupRating,
      intelligence
        .evidenceReliability
    );

  /*
   * Controlled v4 factor influence.
   */
  const adjustedProbabilities =
    applyFactorInfluence(
      baseProbabilities,
      factorSummary
    );

  const markets:
    PredictionMarketProbabilities =
    {
      ...adjustedProbabilities,

      over25:
        goals.over25,

      under25:
        goals.under25,

      btts:
        goals.btts,
    };

  const confidence =
    calculateV4Confidence(
      markets,
      factorSummary,
      dataCompleteness
    );

  const baseRiskResult =
    calculateRisk(
      markets.homeWin,
      markets.draw,
      markets.awayWin
    );

  const riskResult =
    applyV4RiskAdjustment(
      baseRiskResult
        .riskScore,
      dataCompleteness,
      factorSummary
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
      markets,
      calculatedFinalPrediction
    );

  const finalPrediction =
    dataCompleteness
      .vipReady
      ? calculatedFinalPrediction
      : "Insufficient Data";

  const exactScore =
    dataCompleteness
      .vipReady
      ? calculatedExactScore
      : "N/A";

  const publicPrediction =
    buildPublicPrediction(
      riskResult.risk,
      riskResult.riskScore,
      markets,
      dataCompleteness,
      factorSummary
    );

  const vipReasoning = [
    `Home overall rating is ${intelligence.home.overallRating}/100 and away overall rating is ${intelligence.away.overallRating}/100.`,

    `The intelligence rating difference is ${intelligence.ratingDifference} points.`,

    `Home attack and defense ratings are ${intelligence.home.attackRating} and ${intelligence.home.defenseRating}.`,

    `Away attack and defense ratings are ${intelligence.away.attackRating} and ${intelligence.away.defenseRating}.`,

    `Recent form ratings are ${intelligence.home.formRating} for the home team and ${intelligence.away.formRating} for the away team.`,

    `Momentum ratings are ${intelligence.home.momentumRating} for the home team and ${intelligence.away.momentumRating} for the away team.`,

    `Expected goals are ${goals.homeExpectedGoals.toFixed(
      2
    )} for the home team and ${goals.awayExpectedGoals.toFixed(
      2
    )} for the away team.`,

    `Factor Architecture v4 produced a directional score of ${factorSummary.weightedScore}/100.`,

    `Factor confidence is ${factorSummary.weightedConfidence}%, factor reliability is ${factorSummary.weightedReliability}%, and model uncertainty is ${factorSummary.uncertainty}%.`,

    `The final match outcome is ${finalPrediction} and the consistent exact-score estimate is ${exactScore}.`,

    `The exact-score estimate is aligned with the model's stronger ${
      markets.over25 >
      markets.under25
        ? "Over 2.5"
        : "Under 2.5"
    } goal-market signal.`,

    `Confidence Redesign v4 produced a final confidence of ${confidence}%.`,

    `The prediction risk is ${riskResult.risk} with an adjusted score of ${riskResult.riskScore}/100.`,

    `The selected model signal is ${valueBet}.`,

    ...buildFactorReasoning(
      factorSummary
    ),

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
        generatedAt
          .toISOString(),
    },

    review: {
      approved:
        false,

      reviewedBy:
        null,

      reviewedAt:
        null,
    },

    status:
      dataCompleteness
        .vipReady
        ? "review"
        : "draft",
  };
}