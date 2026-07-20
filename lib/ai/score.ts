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
  PredictionMarketCategory,
  PredictionMarketProbabilities,
  PredictionPrimarySelection,
  PredictionResult,
  PredictionRisk,
} from "./prediction";

export type AIScoreResult =
  PredictionResult;

const MODEL_VERSION =
  "zerra-ai-v5.0-market-selection";

const DATA_VERSION =
  "fixture-intelligence-v5-market-architecture-v1";

type MainProbabilities = {
  homeWin: number;
  draw: number;
  awayWin: number;
};

type MarketCandidate = {
  category:
    Exclude<
      PredictionMarketCategory,
      "No Strong Prediction"
    >;

  pick: string;

  probability: number;

  confidence: number;

  minimumProbability: number;

  minimumConfidence: number;

  qualified: boolean;

  reason: string;
};

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
): MainProbabilities {
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

function factorial(
  value: number
): number {
  if (
    value <=
    1
  ) {
    return 1;
  }

  let result =
    1;

  for (
    let index = 2;
    index <= value;
    index += 1
  ) {
    result *=
      index;
  }

  return result;
}

function poissonProbability(
  lambda: number,
  goals: number
): number {
  if (
    lambda < 0 ||
    goals < 0
  ) {
    return 0;
  }

  return (
    Math.exp(
      -lambda
    ) *
    lambda ** goals /
    factorial(
      goals
    )
  );
}

function probabilityUnderThreshold(
  lambda: number,
  maximumGoals: number
): number {
  let probability =
    0;

  for (
    let goals = 0;
    goals <= maximumGoals;
    goals += 1
  ) {
    probability +=
      poissonProbability(
        lambda,
        goals
      );
  }

  return clamp(
    probability *
      100,
    0,
    100
  );
}

function buildMainProbabilities(
  homeRating: number,
  awayRating: number,
  evidenceReliability: number
): MainProbabilities {
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

function applyFactorInfluence(
  baseProbabilities:
    MainProbabilities,
  factorSummary:
    PerformanceFactorSummary
): MainProbabilities {
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

  const maximumShift =
    8;

  const directionalShift =
    directionalSignal *
    maximumShift *
    evidenceStrength;

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

function buildExtendedMarkets(
  base:
    MainProbabilities,

  goals: {
    over25: number;
    under25: number;
    btts: number;
    homeExpectedGoals: number;
    awayExpectedGoals: number;
    expectedGoals: number;
  }
): PredictionMarketProbabilities {
  const totalExpectedGoals =
    Math.max(
      0,
      goals.expectedGoals
    );

  const homeExpectedGoals =
    Math.max(
      0,
      goals.homeExpectedGoals
    );

  const awayExpectedGoals =
    Math.max(
      0,
      goals.awayExpectedGoals
    );

  const under15 =
    probabilityUnderThreshold(
      totalExpectedGoals,
      1
    );

  const over15 =
    100 -
    under15;

  const under35 =
    probabilityUnderThreshold(
      totalExpectedGoals,
      3
    );

  const over35 =
    100 -
    under35;

  const homeUnder05 =
    probabilityUnderThreshold(
      homeExpectedGoals,
      0
    );

  const homeOver05 =
    100 -
    homeUnder05;

  const homeUnder15 =
    probabilityUnderThreshold(
      homeExpectedGoals,
      1
    );

  const homeOver15 =
    100 -
    homeUnder15;

  const awayUnder05 =
    probabilityUnderThreshold(
      awayExpectedGoals,
      0
    );

  const awayOver05 =
    100 -
    awayUnder05;

  const awayUnder15 =
    probabilityUnderThreshold(
      awayExpectedGoals,
      1
    );

  const awayOver15 =
    100 -
    awayUnder15;

  const bttsYes =
    clamp(
      goals.btts,
      0,
      100
    );

  const bttsNo =
    100 -
    bttsYes;

  const doubleChance1X =
    clamp(
      base.homeWin +
        base.draw,
      0,
      100
    );

  const doubleChanceX2 =
    clamp(
      base.awayWin +
        base.draw,
      0,
      100
    );

  const doubleChance12 =
    clamp(
      base.homeWin +
        base.awayWin,
      0,
      100
    );

  return {
    homeWin:
      base.homeWin,

    draw:
      base.draw,

    awayWin:
      base.awayWin,

    over25:
      round(
        goals.over25
      ),

    under25:
      round(
        goals.under25
      ),

    btts:
      round(
        bttsYes
      ),

    over15:
      round(
        over15
      ),

    under15:
      round(
        under15
      ),

    over35:
      round(
        over35
      ),

    under35:
      round(
        under35
      ),

    bttsYes:
      round(
        bttsYes
      ),

    bttsNo:
      round(
        bttsNo
      ),

    homeOver05:
      round(
        homeOver05
      ),

    homeUnder05:
      round(
        homeUnder05
      ),

    homeOver15:
      round(
        homeOver15
      ),

    homeUnder15:
      round(
        homeUnder15
      ),

    awayOver05:
      round(
        awayOver05
      ),

    awayUnder05:
      round(
        awayUnder05
      ),

    awayOver15:
      round(
        awayOver15
      ),

    awayUnder15:
      round(
        awayUnder15
      ),

    doubleChance1X:
      round(
        doubleChance1X
      ),

    doubleChanceX2:
      round(
        doubleChanceX2
      ),

    doubleChance12:
      round(
        doubleChance12
      ),
  };
}

function calculateMarketConfidence(
  probability: number,

  factorSummary:
    PerformanceFactorSummary,

  dataCompleteness:
    DataCompletenessResult
): number {
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
    probability *
      0.55 +
    factorEvidence *
      0.2 +
    dataEvidence *
      0.25;

  const uncertaintyPenalty =
    factorSummary
      .uncertainty *
      0.18;

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

  const maximumConfidence =
    dataCompleteness
      .vipReady
      ? factorSummary
          .uncertainty <=
        25
        ? 90
        : 84
      : dataCompleteness
            .score >=
          60
        ? 64
        : 54;

  return Math.round(
    clamp(
      adjusted,
      25,
      maximumConfidence
    )
  );
}

function createMarketCandidate(
  category:
    MarketCandidate["category"],

  pick: string,

  probability: number,

  minimumProbability: number,

  minimumConfidence: number,

  factorSummary:
    PerformanceFactorSummary,

  dataCompleteness:
    DataCompletenessResult
): MarketCandidate {
  const confidence =
    calculateMarketConfidence(
      probability,
      factorSummary,
      dataCompleteness
    );

  const qualified =
    dataCompleteness
      .vipReady &&
    probability >=
      minimumProbability &&
    confidence >=
      minimumConfidence;

  return {
    category,

    pick,

    probability:
      round(
        probability
      ),

    confidence,

    minimumProbability,

    minimumConfidence,

    qualified,

    reason:
      qualified
        ? `${pick} qualified with a raw market probability of ${round(
            probability
          )}% and an evidence-adjusted confidence of ${confidence}%.`
        : `${pick} did not meet ZERRA's publication threshold. Raw market probability: ${round(
            probability
          )}%. Evidence-adjusted confidence: ${confidence}%.`,
  };
}

function buildMarketCandidates(
  markets:
    PredictionMarketProbabilities,

  factorSummary:
    PerformanceFactorSummary,

  dataCompleteness:
    DataCompletenessResult
): MarketCandidate[] {
  const candidates:
    MarketCandidate[] = [];

  const add =
    (
      category:
        MarketCandidate["category"],

      pick:
        string,

      probability:
        number | undefined,

      minimumProbability:
        number,

      minimumConfidence:
        number
    ) => {
      if (
        typeof probability !==
          "number" ||
        !Number.isFinite(
          probability
        )
      ) {
        return;
      }

      candidates.push(
        createMarketCandidate(
          category,
          pick,
          probability,
          minimumProbability,
          minimumConfidence,
          factorSummary,
          dataCompleteness
        )
      );
    };

  add(
    "Total Goals",
    "Over 1.5 Goals",
    markets.over15,
    76,
    68
  );

  add(
    "Total Goals",
    "Under 1.5 Goals",
    markets.under15,
    72,
    67
  );

  add(
    "Total Goals",
    "Over 2.5 Goals",
    markets.over25,
    68,
    65
  );

  add(
    "Total Goals",
    "Under 2.5 Goals",
    markets.under25,
    68,
    65
  );

  add(
    "Total Goals",
    "Over 3.5 Goals",
    markets.over35,
    70,
    66
  );

  add(
    "Total Goals",
    "Under 3.5 Goals",
    markets.under35,
    76,
    68
  );

  add(
    "BTTS",
    "BTTS Yes",
    markets.bttsYes ??
      markets.btts,
    68,
    65
  );

  add(
    "BTTS",
    "BTTS No",
    markets.bttsNo ??
      (
        100 -
        markets.btts
      ),
    68,
    65
  );

  add(
    "Team Total Goals",
    "Home Team Over 0.5 Goals",
    markets.homeOver05,
    78,
    69
  );

  add(
    "Team Total Goals",
    "Home Team Under 0.5 Goals",
    markets.homeUnder05,
    72,
    67
  );

  add(
    "Team Total Goals",
    "Home Team Over 1.5 Goals",
    markets.homeOver15,
    69,
    65
  );

  add(
    "Team Total Goals",
    "Home Team Under 1.5 Goals",
    markets.homeUnder15,
    75,
    68
  );

  add(
    "Team Total Goals",
    "Away Team Over 0.5 Goals",
    markets.awayOver05,
    78,
    69
  );

  add(
    "Team Total Goals",
    "Away Team Under 0.5 Goals",
    markets.awayUnder05,
    72,
    67
  );

  add(
    "Team Total Goals",
    "Away Team Over 1.5 Goals",
    markets.awayOver15,
    69,
    65
  );

  add(
    "Team Total Goals",
    "Away Team Under 1.5 Goals",
    markets.awayUnder15,
    75,
    68
  );

  add(
    "Double Chance",
    "Double Chance 1X",
    markets.doubleChance1X,
    78,
    70
  );

  add(
    "Double Chance",
    "Double Chance X2",
    markets.doubleChanceX2,
    78,
    70
  );

  add(
    "Double Chance",
    "Double Chance 12",
    markets.doubleChance12,
    80,
    71
  );

  return candidates;
}

function candidateRankingScore(
  candidate:
    MarketCandidate
): number {
  return (
    candidate.confidence *
      0.65 +
    candidate.probability *
      0.35
  );
}

function selectPrimaryPrediction(
  candidates:
    MarketCandidate[],

  dataCompleteness:
    DataCompletenessResult
): PredictionPrimarySelection {
  if (
    !dataCompleteness
      .vipReady
  ) {
    return {
      category:
        "No Strong Prediction",

      pick:
        "Insufficient Data",

      confidence:
        0,

      qualified:
        false,

      reason:
        "The available match evidence does not meet ZERRA's minimum data-quality standard for a premium prediction.",
    };
  }

  const qualifiedCandidates =
    candidates
      .filter(
        (
          candidate
        ) =>
          candidate
            .qualified
      )
      .sort(
        (
          first,
          second
        ) =>
          candidateRankingScore(
            second
          ) -
          candidateRankingScore(
            first
          )
      );

  const strongest =
    qualifiedCandidates[0];

  if (
    !strongest
  ) {
    const strongestAvailable =
      [...candidates].sort(
        (
          first,
          second
        ) =>
          candidateRankingScore(
            second
          ) -
          candidateRankingScore(
            first
          )
      )[0];

    return {
      category:
        "No Strong Prediction",

      pick:
        "No Strong Prediction",

      confidence:
        strongestAvailable
          ?.confidence ??
        0,

      qualified:
        false,

      reason:
        strongestAvailable
          ? `The strongest available signal was ${strongestAvailable.pick}, but it did not meet ZERRA's minimum publication threshold.`
          : "No supported market produced sufficient evidence for a reliable primary prediction.",
    };
  }

  return {
    category:
      strongest.category,

    pick:
      strongest.pick,

    confidence:
      strongest.confidence,

    qualified:
      true,

    reason:
      strongest.reason,
  };
}

function chooseSupplementalExactScore(
  homeExpectedGoals:
    number,

  awayExpectedGoals:
    number
): string {
  const homeGoals =
    Math.max(
      0,
      Math.round(
        homeExpectedGoals
      )
    );

  const awayGoals =
    Math.max(
      0,
      Math.round(
        awayExpectedGoals
      )
    );

  return `${homeGoals}-${awayGoals}`;
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

function applyV5RiskAdjustment(
  baseRiskScore:
    number,

  primaryPrediction:
    PredictionPrimarySelection,

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

  const marketConfidenceRisk =
    primaryPrediction
      .qualified
      ? 100 -
        primaryPrediction
          .confidence
      : 75;

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
      0.24 +
    reliabilityRisk *
      0.18 +
    freshnessRisk *
      0.12 +
    factorUncertaintyRisk *
      0.22 +
    marketConfidenceRisk *
      0.24 +
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

  riskScore:
    number,

  primaryPrediction:
    PredictionPrimarySelection,

  markets:
    PredictionMarketProbabilities,

  dataCompleteness:
    DataCompletenessResult,

  factorSummary:
    PerformanceFactorSummary
) {
  const keyInsights:
    string[] = [];

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
    (
      markets.bttsYes ??
      markets.btts
    ) >=
    65
  ) {
    keyInsights.push(
      "Both teams show a meaningful positive scoring signal."
    );
  }

  if (
    (
      markets.bttsNo ??
      (
        100 -
        markets.btts
      )
    ) >=
    65
  ) {
    keyInsights.push(
      "The model identifies a meaningful possibility that at least one team may fail to score."
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

  if (
    primaryPrediction
      .qualified
  ) {
    keyInsights.push(
      `ZERRA identified the strongest qualified signal in the ${primaryPrediction.category} market family.`
    );
  } else {
    keyInsights.push(
      "No market currently meets ZERRA's minimum standard for a strong primary prediction."
    );
  }

  return {
    overview:
      "ZERRA AI v5.0 evaluates goal markets, both-teams-to-score signals, team goal totals, double-chance probabilities, performance factors, model uncertainty, risk, and source-data completeness before selecting a primary prediction.",

    risk,

    riskScore,

    keyInsights,

    teaser:
      primaryPrediction
        .qualified
        ? "The strongest qualified market, confidence score, supplemental exact-score estimate, and full reasoning are reserved for VIP."
        : dataCompleteness
            .vipReady
          ? "ZERRA did not identify a market strong enough to meet the current primary-prediction threshold."
          : "VIP prediction details are withheld until the available match data meets the required quality threshold.",

    marketCategory:
      primaryPrediction
        .category,
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

  strongestFactors.forEach(
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

function buildMarketReasoning(
  candidates:
    MarketCandidate[],

  primaryPrediction:
    PredictionPrimarySelection
): string[] {
  const ranked =
    [...candidates]
      .sort(
        (
          first,
          second
        ) =>
          candidateRankingScore(
            second
          ) -
          candidateRankingScore(
            first
          )
      )
      .slice(
        0,
        6
      );

  const reasoning = [
    `Primary market decision: ${primaryPrediction.pick}.`,

    `Primary market category: ${primaryPrediction.category}.`,

    `Primary confidence: ${primaryPrediction.confidence}%.`,

    `Qualification status: ${
      primaryPrediction
        .qualified
        ? "qualified"
        : "not qualified"
    }.`,

    primaryPrediction.reason,
  ];

  ranked.forEach(
    (
      candidate
    ) => {
      reasoning.push(
        `${candidate.pick}: probability ${candidate.probability}%, confidence ${candidate.confidence}%, qualification ${
          candidate
            .qualified
            ? "passed"
            : "failed"
        }.`
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

  const adjustedProbabilities =
    applyFactorInfluence(
      baseProbabilities,
      factorSummary
    );

  const markets =
    buildExtendedMarkets(
      adjustedProbabilities,
      {
        over25:
          goals.over25,

        under25:
          goals.under25,

        btts:
          goals.btts,

        homeExpectedGoals:
          goals.homeExpectedGoals,

        awayExpectedGoals:
          goals.awayExpectedGoals,

        expectedGoals:
          goals.expectedGoals,
      }
    );

  const marketCandidates =
    buildMarketCandidates(
      markets,
      factorSummary,
      dataCompleteness
    );

  const primaryPrediction =
    selectPrimaryPrediction(
      marketCandidates,
      dataCompleteness
    );

  const baseRiskResult =
    calculateRisk(
      markets.homeWin,
      markets.draw,
      markets.awayWin
    );

  const riskResult =
    applyV5RiskAdjustment(
      baseRiskResult
        .riskScore,
      primaryPrediction,
      dataCompleteness,
      factorSummary
    );

  const exactScore =
    dataCompleteness
      .vipReady
      ? chooseSupplementalExactScore(
          goals.homeExpectedGoals,
          goals.awayExpectedGoals
        )
      : "N/A";

  const finalPrediction =
    primaryPrediction.pick;

  const valueBet =
    primaryPrediction
      .qualified
      ? primaryPrediction.pick
      : "No Value";

  const confidence =
    primaryPrediction
      .confidence;

  const publicPrediction =
    buildPublicPrediction(
      riskResult.risk,
      riskResult.riskScore,
      primaryPrediction,
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

    `Supporting 1X2 probabilities are Home ${markets.homeWin}%, Draw ${markets.draw}%, Away ${markets.awayWin}%.`,

    `1X2 probabilities are supporting analysis only and no longer define the canonical ZERRA prediction.`,

    `The canonical ZERRA prediction is ${primaryPrediction.pick} in the ${primaryPrediction.category} market family.`,

    `The selected market confidence is ${primaryPrediction.confidence}%.`,

    `The prediction risk is ${riskResult.risk} with an adjusted score of ${riskResult.riskScore}/100.`,

    `The supplemental exact-score estimate is ${exactScore} and does not override the primary market selection.`,

    ...buildMarketReasoning(
      marketCandidates,
      primaryPrediction
    ),

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

      primaryPrediction,

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
          .vipReady &&
        primaryPrediction
          .qualified
        ? "review"
        : "draft",

    dataCompleteness,
  };
}