import type {
  MatchIntelligenceResult,
  TeamIntelligence,
} from "./intelligence";

import type {
  PredictionMarketProbabilities,
} from "./prediction";

export type ProbabilityEngineInput = {
  intelligence: MatchIntelligenceResult;

  goals: {
    homeExpectedGoals: number;
    awayExpectedGoals: number;
    expectedGoals: number;
    over25: number;
    under25: number;
    btts: number;
  };
};

export type ProbabilityEngineResult = {
  markets: PredictionMarketProbabilities;

  confidence: number;

  strongestOutcome: {
    label:
      | "Home Win"
      | "Draw"
      | "Away Win";

    probability: number;
  };

  secondOutcome: {
    label:
      | "Home Win"
      | "Draw"
      | "Away Win";

    probability: number;
  };

  probabilityGap: number;

  calibration: {
    reliability: number;
    drawPressure: number;
    matchupBalance: number;
    goalEnvironment: number;
    homeEdge: number;
  };
};

type MainProbabilities = {
  homeWin: number;
  draw: number;
  awayWin: number;
};

type Outcome = {
  label:
    | "Home Win"
    | "Draw"
    | "Away Win";

  probability: number;
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

  return Math.round(
    value * multiplier
  ) / multiplier;
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

function safeProbability(
  value: number,
  fallback: number
): number {
  return Number.isFinite(value)
    ? clamp(value, 0, 100)
    : fallback;
}

function normalizeMainProbabilities(
  homeWin: number,
  draw: number,
  awayWin: number
): MainProbabilities {
  const safeHome =
    Math.max(
      0.5,
      safeProbability(
        homeWin,
        33.3
      )
    );

  const safeDraw =
    Math.max(
      0.5,
      safeProbability(
        draw,
        33.4
      )
    );

  const safeAway =
    Math.max(
      0.5,
      safeProbability(
        awayWin,
        33.3
      )
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

function calculateTeamMatchupRating(
  team: TeamIntelligence,
  opponent: TeamIntelligence,
  isHome: boolean
): number {
  const attackVsDefense =
    team.attackRating * 0.58 +
    (
      100 -
      opponent.defenseRating
    ) * 0.42;

  const currentState =
    team.formRating * 0.62 +
    team.momentumRating * 0.38;

  const scoringSignal =
    clamp(
      (
        team.recentGoalsForAverage * 0.6 +
        team.goalsForAverage * 0.4
      ) / 2.2,
      0,
      1
    ) * 100;

  const resilienceSignal =
    clamp(
      (
        (
          1 -
          team.lossRate
        ) * 0.45 +
        (
          1 -
          team.recentLossRate
        ) * 0.35 +
        team.cleanSheetRate * 0.2
      ) * 100,
      0,
      100
    );

  const consistencySignal =
    (
      team.attackingConsistency +
      team.defensiveConsistency +
      team.formStability
    ) / 3;

  const venueComponent =
    isHome
      ? team.venueRating
      : (
          team.venueRating * 0.75 +
          50 * 0.25
        );

  const rawRating =
    team.overallRating * 0.29 +
    attackVsDefense * 0.2 +
    team.defenseRating * 0.12 +
    currentState * 0.13 +
    venueComponent * 0.1 +
    scoringSignal * 0.07 +
    resilienceSignal * 0.05 +
    consistencySignal * 0.04;

  const reliability =
    clamp(
      team.dataReliability,
      0,
      1
    );

  return (
    50 +
    (
      rawRating -
      50
    ) *
    (
      0.76 +
      reliability * 0.24
    )
  );
}

function calculateBaseDrawProbability(
  intelligence: MatchIntelligenceResult,
  ratingDifference: number,
  goals: ProbabilityEngineInput["goals"]
): number {
  const closenessSignal =
    1 -
    clamp(
      Math.abs(
        ratingDifference
      ) / 22,
      0,
      1
    );

  const explicitDrawPressure =
    clamp(
      intelligence.drawPressure /
      100,
      0,
      1
    );

  const balanceSignal =
    clamp(
      intelligence.matchupBalance /
      100,
      0,
      1
    );

  const expectedGoalSignal =
    1 -
    clamp(
      (
        goals.expectedGoals -
        1.6
      ) / 2.4,
      0,
      1
    );

  const drawProbability =
    14 +
    closenessSignal * 8 +
    explicitDrawPressure * 8 +
    balanceSignal * 4 +
    expectedGoalSignal * 3;

  return clamp(
    drawProbability,
    14,
    37
  );
}

function calculateMainProbabilities(
  input: ProbabilityEngineInput
): MainProbabilities {
  const {
    intelligence,
    goals,
  } = input;

  const homeMatchupRating =
    calculateTeamMatchupRating(
      intelligence.home,
      intelligence.away,
      true
    );

  const awayMatchupRating =
    calculateTeamMatchupRating(
      intelligence.away,
      intelligence.home,
      false
    );

  const rawDifference =
    homeMatchupRating -
    awayMatchupRating;

  const reliability =
    clamp(
      intelligence
        .evidenceReliability,
      0,
      1
    );

  const reliableDifference =
    rawDifference *
    (
      0.64 +
      reliability * 0.36
    );

  const homeEdgeAdjustment =
    (
      intelligence.homeEdge -
      50
    ) * 0.085;

  const expectedGoalDifference =
    (
      goals.homeExpectedGoals -
      goals.awayExpectedGoals
    ) * 4.2;

  const adjustedDifference =
    reliableDifference +
    homeEdgeAdjustment +
    expectedGoalDifference;

  const drawProbability =
    calculateBaseDrawProbability(
      intelligence,
      adjustedDifference,
      goals
    );

  const remainingProbability =
    100 -
    drawProbability;

  const homeShare =
    sigmoid(
      adjustedDifference / 8.2
    );

  let homeWin =
    remainingProbability *
    homeShare;

  let awayWin =
    remainingProbability -
    homeWin;

  const balanceProtection =
    clamp(
      intelligence.matchupBalance /
      100,
      0,
      1
    );

  if (
    Math.abs(
      adjustedDifference
    ) < 3.5
  ) {
    const reduction =
      (
        3.5 -
        Math.abs(
          adjustedDifference
        )
      ) *
      0.55 *
      balanceProtection;

    if (
      homeWin >
      awayWin
    ) {
      homeWin -= reduction;
    } else {
      awayWin -= reduction;
    }
  }

  return normalizeMainProbabilities(
    homeWin,
    drawProbability,
    awayWin
  );
}

function calibrateGoalMarket(
  probability: number,
  reliability: number,
  neutralProbability: number
): number {
  const safe =
    safeProbability(
      probability,
      neutralProbability
    );

  const calibrated =
    neutralProbability +
    (
      safe -
      neutralProbability
    ) *
    (
      0.72 +
      reliability * 0.28
    );

  return Math.round(
    clamp(
      calibrated,
      5,
      95
    )
  );
}

function buildMarkets(
  input: ProbabilityEngineInput,
  mainProbabilities: MainProbabilities
): PredictionMarketProbabilities {
  const reliability =
    clamp(
      input.intelligence
        .evidenceReliability,
      0,
      1
    );

  let over25 =
    calibrateGoalMarket(
      input.goals.over25,
      reliability,
      50
    );

  let under25 =
    calibrateGoalMarket(
      input.goals.under25,
      reliability,
      50
    );

  const goalTotal =
    over25 +
    under25;

  if (goalTotal !== 100) {
    over25 =
      Math.round(
        (
          over25 /
          goalTotal
        ) * 100
      );

    under25 =
      100 -
      over25;
  }

  const btts =
    calibrateGoalMarket(
      input.goals.btts,
      reliability,
      50
    );

  return {
    ...mainProbabilities,

    over25,
    under25,
    btts,
  };
}

function rankOutcomes(
  markets: PredictionMarketProbabilities
): Outcome[] {
  const outcomes: Outcome[] = [
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
  ];

  return outcomes.sort(
    (first, second) =>
      second.probability -
      first.probability
  );
}

function calculateConfidence(
  markets: PredictionMarketProbabilities,
  intelligence: MatchIntelligenceResult
): number {
  const outcomes =
    rankOutcomes(markets);

  const strongest =
    outcomes[0].probability;

  const second =
    outcomes[1].probability;

  const probabilityGap =
    strongest -
    second;

  const reliability =
    clamp(
      intelligence
        .evidenceReliability,
      0,
      1
    );

  const balance =
    clamp(
      intelligence.matchupBalance /
      100,
      0,
      1
    );

  const drawPressure =
    clamp(
      intelligence.drawPressure /
      100,
      0,
      1
    );

  const separation =
    clamp(
      Math.abs(
        intelligence
          .ratingDifference
      ) / 25,
      0,
      1
    );

  const leadingProbabilitySignal =
    clamp(
      (
        strongest -
        34
      ) / 36,
      0,
      1
    );

  let rawConfidence =
    41 +
    probabilityGap * 0.78 +
    reliability * 17 +
    separation * 8 +
    leadingProbabilitySignal * 8;

  rawConfidence -=
    balance * 4;

  if (
    outcomes[0].label !== "Draw"
  ) {
    rawConfidence -=
      drawPressure * 4;
  }

  if (
    strongest < 45
  ) {
    rawConfidence -= 4;
  }

  return Math.round(
    clamp(
      rawConfidence,
      38,
      88
    )
  );
}

export function calculateMatchProbabilities(
  input: ProbabilityEngineInput
): ProbabilityEngineResult {
  const mainProbabilities =
    calculateMainProbabilities(
      input
    );

  const markets =
    buildMarkets(
      input,
      mainProbabilities
    );

  const rankedOutcomes =
    rankOutcomes(markets);

  const confidence =
    calculateConfidence(
      markets,
      input.intelligence
    );

  return {
    markets,
    confidence,

    strongestOutcome:
      rankedOutcomes[0],

    secondOutcome:
      rankedOutcomes[1],

    probabilityGap:
      rankedOutcomes[0]
        .probability -
      rankedOutcomes[1]
        .probability,

    calibration: {
      reliability:
        round(
          input.intelligence
            .evidenceReliability,
          2
        ),

      drawPressure:
        input.intelligence
          .drawPressure,

      matchupBalance:
        input.intelligence
          .matchupBalance,

      goalEnvironment:
        input.intelligence
          .goalEnvironment,

      homeEdge:
        input.intelligence
          .homeEdge,
    },
  };
}