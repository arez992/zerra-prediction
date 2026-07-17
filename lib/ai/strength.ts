export type StrengthResult = {
  homeStrength: number;
  awayStrength: number;
  homeAdvantage: number;
};

type SplitNumbers = {
  home?: number;
  away?: number;
  total?: number;
};

type GoalAverageSplit = {
  home?: string | number | null;
  away?: string | number | null;
  total?: string | number | null;
};

type TeamSeasonStatisticsLike = {
  fixtures?: {
    played?: SplitNumbers;
    wins?: SplitNumbers;
    draws?: SplitNumbers;
    loses?: SplitNumbers;
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

type TeamStrengthMetrics = {
  score: number;
  matches: number;
  pointsPerGame: number;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  cleanSheetRate: number;
  failedToScoreRate: number;
};

const NEUTRAL_STRENGTH = 50;

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

  return Math.round(
    value * multiplier
  ) / multiplier;
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

function getSplitValue(
  split: SplitNumbers | undefined,
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

function getAverageValue(
  split:
    | GoalAverageSplit
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

function calculateTeamStrength(
  statistics:
    | TeamSeasonStatisticsLike
    | null
    | undefined,

  side: "home" | "away"
): TeamStrengthMetrics {
  if (!statistics) {
    return {
      score:
        NEUTRAL_STRENGTH,

      matches: 0,
      pointsPerGame: 0,
      goalsForPerGame: 0,
      goalsAgainstPerGame: 0,
      cleanSheetRate: 0,
      failedToScoreRate: 0,
    };
  }

  const matches =
    getSplitValue(
      statistics.fixtures
        ?.played,
      side
    );

  if (matches <= 0) {
    return {
      score:
        NEUTRAL_STRENGTH,

      matches: 0,
      pointsPerGame: 0,
      goalsForPerGame: 0,
      goalsAgainstPerGame: 0,
      cleanSheetRate: 0,
      failedToScoreRate: 0,
    };
  }

  const wins =
    getSplitValue(
      statistics.fixtures
        ?.wins,
      side
    );

  const draws =
    getSplitValue(
      statistics.fixtures
        ?.draws,
      side
    );

  const pointsPerGame =
    (
      wins * 3 +
      draws
    ) / matches;

  const goalsForPerGame =
    getAverageValue(
      statistics.goals
        ?.for?.average,
      side
    );

  const goalsAgainstPerGame =
    getAverageValue(
      statistics.goals
        ?.against?.average,
      side
    );

  const cleanSheets =
    getSplitValue(
      statistics.clean_sheet,
      side
    );

  const failedToScore =
    getSplitValue(
      statistics
        .failed_to_score,
      side
    );

  const cleanSheetRate =
    clamp(
      cleanSheets / matches,
      0,
      1
    );

  const failedToScoreRate =
    clamp(
      failedToScore / matches,
      0,
      1
    );

  /*
   * Strength components:
   *
   * Points per game:        45%
   * Scoring production:     20%
   * Defensive performance: 20%
   * Clean-sheet rate:       10%
   * Failure-to-score rate:  -5%
   */
  const pointsScore =
    clamp(
      pointsPerGame / 3,
      0,
      1
    ) * 45;

  const attackScore =
    clamp(
      goalsForPerGame / 2.5,
      0,
      1
    ) * 20;

  const defensiveScore =
    (
      1 -
      clamp(
        goalsAgainstPerGame / 2.5,
        0,
        1
      )
    ) * 20;

  const cleanSheetScore =
    cleanSheetRate * 10;

  const failedToScorePenalty =
    failedToScoreRate * 5;

  const rawScore =
    10 +
    pointsScore +
    attackScore +
    defensiveScore +
    cleanSheetScore -
    failedToScorePenalty;

  /*
   * Small samples are pulled toward
   * neutral strength to prevent
   * misleading confidence.
   */
  const sampleReliability =
    clamp(
      matches / 8,
      0.35,
      1
    );

  const adjustedScore =
    NEUTRAL_STRENGTH +
    (
      rawScore -
      NEUTRAL_STRENGTH
    ) *
      sampleReliability;

  return {
    score:
      round(
        clamp(
          adjustedScore,
          10,
          90
        ),
        1
      ),

    matches,

    pointsPerGame:
      round(
        pointsPerGame
      ),

    goalsForPerGame:
      round(
        goalsForPerGame
      ),

    goalsAgainstPerGame:
      round(
        goalsAgainstPerGame
      ),

    cleanSheetRate:
      round(
        cleanSheetRate
      ),

    failedToScoreRate:
      round(
        failedToScoreRate
      ),
  };
}

export function calculateStrength(
  match: MatchLike
): StrengthResult {
  const homeStatistics =
    match
      ?.teamSeasonStatistics
      ?.home;

  const awayStatistics =
    match
      ?.teamSeasonStatistics
      ?.away;

  /*
   * Home team is evaluated only from
   * its home split, while the away team
   * is evaluated only from its away split.
   */
  const homeMetrics =
    calculateTeamStrength(
      homeStatistics,
      "home"
    );

  const awayMetrics =
    calculateTeamStrength(
      awayStatistics,
      "away"
    );

  const homeStrength =
    homeMetrics.score;

  const awayStrength =
    awayMetrics.score;

  /*
   * Home advantage is no longer a fixed
   * artificial value. It reflects the
   * measured difference between the
   * home team's home performance and
   * the away team's away performance.
   */
  const homeAdvantage =
    round(
      clamp(
        homeStrength -
        awayStrength,
        -25,
        25
      ),
      1
    );

  return {
    homeStrength,
    awayStrength,
    homeAdvantage,
  };
}