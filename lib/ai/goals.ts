export type GoalsResult = {
  over25: number;
  under25: number;
  btts: number;

  expectedGoals: number;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
};

type GoalAverageSplit = {
  home?: string | number | null;
  away?: string | number | null;
  total?: string | number | null;
};

type SplitNumbers = {
  home?: number;
  away?: number;
  total?: number;
};

type TeamSeasonStatisticsLike = {
  fixtures?: {
    played?: SplitNumbers;
  };

  goals?: {
    for?: {
      average?: GoalAverageSplit;
    };

    against?: {
      average?: GoalAverageSplit;
    };
  };

  clean_sheet?: SplitNumbers;

  failed_to_score?: SplitNumbers;
};

type MatchLike = {
  teamSeasonStatistics?: {
    home?:
      | TeamSeasonStatisticsLike
      | null;

    away?:
      | TeamSeasonStatisticsLike
      | null;
  };
};

const NEUTRAL_HOME_GOALS = 1.35;
const NEUTRAL_AWAY_GOALS = 1.1;

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
  decimals = 2
): number {
  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value * multiplier
    ) / multiplier
  );
}

function toFiniteNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function getAverage(
  split:
    | GoalAverageSplit
    | undefined,

  side: "home" | "away"
): number | null {
  const direct =
    toFiniteNumber(
      split?.[side]
    );

  if (
    direct !== null &&
    direct >= 0
  ) {
    return direct;
  }

  const total =
    toFiniteNumber(
      split?.total
    );

  return total !== null &&
    total >= 0
    ? total
    : null;
}

function getSplitNumber(
  split:
    | SplitNumbers
    | undefined,

  side: "home" | "away"
): number {
  const direct =
    toFiniteNumber(
      split?.[side]
    );

  if (
    direct !== null &&
    direct >= 0
  ) {
    return direct;
  }

  const total =
    toFiniteNumber(
      split?.total
    );

  return total !== null &&
    total >= 0
    ? total
    : 0;
}

function calculatePoissonProbability(
  lambda: number,
  goals: number
): number {
  let factorial = 1;

  for (
    let value = 2;
    value <= goals;
    value += 1
  ) {
    factorial *= value;
  }

  return (
    Math.exp(-lambda) *
    Math.pow(
      lambda,
      goals
    )
  ) / factorial;
}

function calculateOver25Probability(
  expectedGoals: number
): number {
  const probabilityZero =
    calculatePoissonProbability(
      expectedGoals,
      0
    );

  const probabilityOne =
    calculatePoissonProbability(
      expectedGoals,
      1
    );

  const probabilityTwo =
    calculatePoissonProbability(
      expectedGoals,
      2
    );

  const overProbability =
    1 -
    probabilityZero -
    probabilityOne -
    probabilityTwo;

  return clamp(
    Math.round(
      overProbability * 100
    ),
    5,
    95
  );
}

function calculateBTTSProbability(
  homeExpectedGoals: number,
  awayExpectedGoals: number
): number {
  const probability =
    1 -
    Math.exp(
      -homeExpectedGoals
    ) -
    Math.exp(
      -awayExpectedGoals
    ) +
    Math.exp(
      -(
        homeExpectedGoals +
        awayExpectedGoals
      )
    );

  return clamp(
    Math.round(
      probability * 100
    ),
    5,
    95
  );
}

function calculateReliability(
  statistics:
    | TeamSeasonStatisticsLike
    | null
    | undefined,

  side: "home" | "away"
): number {
  const matches =
    getSplitNumber(
      statistics
        ?.fixtures
        ?.played,
      side
    );

  return clamp(
    matches / 8,
    0.35,
    1
  );
}

function blendWithNeutral(
  calculated: number,
  neutral: number,
  reliability: number
): number {
  return (
    neutral +
    (
      calculated -
      neutral
    ) *
      reliability
  );
}

export function calculateGoals(
  match: MatchLike
): GoalsResult {
  const homeStatistics =
    match
      ?.teamSeasonStatistics
      ?.home;

  const awayStatistics =
    match
      ?.teamSeasonStatistics
      ?.away;

  const homeScoringAverage =
    getAverage(
      homeStatistics
        ?.goals
        ?.for
        ?.average,
      "home"
    );

  const awayConcedingAverage =
    getAverage(
      awayStatistics
        ?.goals
        ?.against
        ?.average,
      "away"
    );

  const awayScoringAverage =
    getAverage(
      awayStatistics
        ?.goals
        ?.for
        ?.average,
      "away"
    );

  const homeConcedingAverage =
    getAverage(
      homeStatistics
        ?.goals
        ?.against
        ?.average,
      "home"
    );

  const rawHomeExpectedGoals =
    homeScoringAverage !== null &&
    awayConcedingAverage !== null
      ? (
          homeScoringAverage +
          awayConcedingAverage
        ) / 2
      : NEUTRAL_HOME_GOALS;

  const rawAwayExpectedGoals =
    awayScoringAverage !== null &&
    homeConcedingAverage !== null
      ? (
          awayScoringAverage +
          homeConcedingAverage
        ) / 2
      : NEUTRAL_AWAY_GOALS;

  const homeReliability =
    Math.min(
      calculateReliability(
        homeStatistics,
        "home"
      ),
      calculateReliability(
        awayStatistics,
        "away"
      )
    );

  const awayReliability =
    Math.min(
      calculateReliability(
        awayStatistics,
        "away"
      ),
      calculateReliability(
        homeStatistics,
        "home"
      )
    );

  let homeExpectedGoals =
    blendWithNeutral(
      rawHomeExpectedGoals,
      NEUTRAL_HOME_GOALS,
      homeReliability
    );

  let awayExpectedGoals =
    blendWithNeutral(
      rawAwayExpectedGoals,
      NEUTRAL_AWAY_GOALS,
      awayReliability
    );

  const homeMatches =
    getSplitNumber(
      homeStatistics
        ?.fixtures
        ?.played,
      "home"
    );

  const awayMatches =
    getSplitNumber(
      awayStatistics
        ?.fixtures
        ?.played,
      "away"
    );

  const homeCleanSheetRate =
    homeMatches > 0
      ? getSplitNumber(
          homeStatistics
            ?.clean_sheet,
          "home"
        ) / homeMatches
      : 0;

  const awayCleanSheetRate =
    awayMatches > 0
      ? getSplitNumber(
          awayStatistics
            ?.clean_sheet,
          "away"
        ) / awayMatches
      : 0;

  const homeFailedToScoreRate =
    homeMatches > 0
      ? getSplitNumber(
          homeStatistics
            ?.failed_to_score,
          "home"
        ) / homeMatches
      : 0;

  const awayFailedToScoreRate =
    awayMatches > 0
      ? getSplitNumber(
          awayStatistics
            ?.failed_to_score,
          "away"
        ) / awayMatches
      : 0;

  homeExpectedGoals -=
    awayCleanSheetRate * 0.2;

  homeExpectedGoals -=
    homeFailedToScoreRate * 0.15;

  awayExpectedGoals -=
    homeCleanSheetRate * 0.2;

  awayExpectedGoals -=
    awayFailedToScoreRate * 0.15;

  homeExpectedGoals =
    round(
      clamp(
        homeExpectedGoals,
        0.2,
        4.5
      )
    );

  awayExpectedGoals =
    round(
      clamp(
        awayExpectedGoals,
        0.2,
        4.5
      )
    );

  const expectedGoals =
    round(
      homeExpectedGoals +
      awayExpectedGoals
    );

  const over25 =
    calculateOver25Probability(
      expectedGoals
    );

  const under25 =
    100 - over25;

  const btts =
    calculateBTTSProbability(
      homeExpectedGoals,
      awayExpectedGoals
    );

  return {
    over25,
    under25,
    btts,

    expectedGoals,
    homeExpectedGoals,
    awayExpectedGoals,
  };
}