export type TeamIntelligence = {
  attackRating: number;
  defenseRating: number;
  formRating: number;
  momentumRating: number;
  venueRating: number;
  overallRating: number;
  sampleSize: number;

  goalsForAverage: number;
  goalsAgainstAverage: number;
  pointsPerGame: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  cleanSheetRate: number;
  failedToScoreRate: number;

  recentGoalsForAverage: number;
  recentGoalsAgainstAverage: number;
  recentWinRate: number;
  recentDrawRate: number;
  recentLossRate: number;

  attackingConsistency: number;
  defensiveConsistency: number;
  formStability: number;
  dataReliability: number;
};

export type MatchIntelligenceResult = {
  home: TeamIntelligence;
  away: TeamIntelligence;

  ratingDifference: number;
  evidenceReliability: number;

  drawPressure: number;
  goalEnvironment: number;
  matchupBalance: number;
  homeEdge: number;
};

type TeamLike = {
  id?: number;
  name?: string;
};

type SplitNumbers = {
  home?: number;
  away?: number;
  total?: number;
};

type AverageSplit = {
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
      average?: AverageSplit;
    };

    against?: {
      average?: AverageSplit;
    };
  };

  clean_sheet?: SplitNumbers;
  failed_to_score?: SplitNumbers;
};

type RecentFixtureLike = {
  fixture?: {
    date?: string;
    timestamp?: number;
    status?: {
      short?: string;
    };
  };

  teams?: {
    home?: TeamLike;
    away?: TeamLike;
  };

  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type MatchLike = {
  fixture?: {
    teams?: {
      home?: TeamLike;
      away?: TeamLike;
    };
  };

  recentFixtures?: {
    home?: RecentFixtureLike[];
    away?: RecentFixtureLike[];
  };

  teamSeasonStatistics?: {
    home?: TeamSeasonStatisticsLike | null;
    away?: TeamSeasonStatisticsLike | null;
  };
};

type RecentPerformance = {
  formRating: number;
  momentumRating: number;
  sampleSize: number;

  goalsForAverage: number;
  goalsAgainstAverage: number;
  winRate: number;
  drawRate: number;
  lossRate: number;

  attackingConsistency: number;
  defensiveConsistency: number;
  formStability: number;
};

type SeasonPerformance = {
  attackRating: number;
  defenseRating: number;
  venueRating: number;
  seasonMatches: number;

  goalsForAverage: number;
  goalsAgainstAverage: number;
  pointsPerGame: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  cleanSheetRate: number;
  failedToScoreRate: number;
};

const NEUTRAL_RATING = 50;
const MAX_RECENT_FIXTURES = 10;

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

function safeDivide(
  numerator: number,
  denominator: number,
  fallback = 0
): number {
  return denominator > 0
    ? numerator / denominator
    : fallback;
}

function toNumber(
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

function splitNumber(
  value: SplitNumbers | undefined,
  side: "home" | "away"
): number {
  const direct =
    toNumber(
      value?.[side]
    );

  if (
    direct !== null &&
    direct >= 0
  ) {
    return direct;
  }

  const total =
    toNumber(
      value?.total
    );

  return total !== null &&
    total >= 0
    ? total
    : 0;
}

function averageNumber(
  value: AverageSplit | undefined,
  side: "home" | "away"
): number | null {
  const direct =
    toNumber(
      value?.[side]
    );

  if (
    direct !== null &&
    direct >= 0
  ) {
    return direct;
  }

  const total =
    toNumber(
      value?.total
    );

  return total !== null &&
    total >= 0
    ? total
    : null;
}

function normalizedName(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function sameTeam(
  candidate: TeamLike | undefined,
  target: TeamLike | undefined
): boolean {
  if (
    !candidate ||
    !target
  ) {
    return false;
  }

  if (
    typeof candidate.id === "number" &&
    typeof target.id === "number"
  ) {
    return candidate.id === target.id;
  }

  const candidateName =
    normalizedName(
      candidate.name
    );

  const targetName =
    normalizedName(
      target.name
    );

  return Boolean(
    candidateName &&
    targetName &&
    candidateName === targetName
  );
}

function timestamp(
  fixture: RecentFixtureLike
): number {
  const direct =
    fixture.fixture?.timestamp;

  if (
    typeof direct === "number" &&
    Number.isFinite(direct)
  ) {
    return direct;
  }

  const date =
    fixture.fixture?.date;

  if (
    typeof date !== "string"
  ) {
    return 0;
  }

  const parsed =
    Date.parse(date);

  return Number.isFinite(parsed)
    ? Math.floor(parsed / 1000)
    : 0;
}

function completed(
  fixture: RecentFixtureLike
): boolean {
  const status =
    String(
      fixture.fixture?.status?.short ??
      ""
    )
      .trim()
      .toUpperCase();

  return (
    (
      status === "FT" ||
      status === "AET" ||
      status === "PEN"
    ) &&
    typeof fixture.goals?.home ===
      "number" &&
    typeof fixture.goals?.away ===
      "number"
  );
}

function standardDeviation(
  values: number[]
): number {
  if (values.length <= 1) {
    return 0;
  }

  const mean =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length;

  const variance =
    values.reduce(
      (sum, value) =>
        sum +
        (value - mean) ** 2,
      0
    ) / values.length;

  return Math.sqrt(variance);
}

function consistencyRating(
  values: number[],
  maximumDeviation: number
): number {
  if (values.length <= 1) {
    return NEUTRAL_RATING;
  }

  const deviation =
    standardDeviation(values);

  return round(
    clamp(
      100 -
      (
        deviation /
        maximumDeviation
      ) * 100,
      15,
      95
    )
  );
}

function calculateRecentForm(
  fixtures: RecentFixtureLike[],
  team: TeamLike | undefined
): RecentPerformance {
  const neutral: RecentPerformance = {
    formRating: NEUTRAL_RATING,
    momentumRating: NEUTRAL_RATING,
    sampleSize: 0,

    goalsForAverage: 1.2,
    goalsAgainstAverage: 1.2,
    winRate: 0.33,
    drawRate: 0.34,
    lossRate: 0.33,

    attackingConsistency: NEUTRAL_RATING,
    defensiveConsistency: NEUTRAL_RATING,
    formStability: NEUTRAL_RATING,
  };

  if (!team) {
    return neutral;
  }

  const recent =
    fixtures
      .filter(completed)
      .filter(
        (fixture) =>
          sameTeam(
            fixture.teams?.home,
            team
          ) ||
          sameTeam(
            fixture.teams?.away,
            team
          )
      )
      .sort(
        (first, second) =>
          timestamp(second) -
          timestamp(first)
      )
      .slice(
        0,
        MAX_RECENT_FIXTURES
      );

  if (recent.length === 0) {
    return neutral;
  }

  let weightedPoints = 0;
  let weightedGoalDifference = 0;
  let totalWeight = 0;

  let newestWeightedPoints = 0;
  let newestWeight = 0;
  let olderWeightedPoints = 0;
  let olderWeight = 0;

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const scoredValues: number[] = [];
  const concededValues: number[] = [];
  const pointsValues: number[] = [];

  recent.forEach(
    (fixture, index) => {
      const isHome =
        sameTeam(
          fixture.teams?.home,
          team
        );

      const scored =
        isHome
          ? fixture.goals?.home
          : fixture.goals?.away;

      const conceded =
        isHome
          ? fixture.goals?.away
          : fixture.goals?.home;

      if (
        typeof scored !== "number" ||
        typeof conceded !== "number"
      ) {
        return;
      }

      const points =
        scored > conceded
          ? 3
          : scored === conceded
          ? 1
          : 0;

      if (points === 3) {
        wins += 1;
      } else if (points === 1) {
        draws += 1;
      } else {
        losses += 1;
      }

      goalsFor += scored;
      goalsAgainst += conceded;

      scoredValues.push(scored);
      concededValues.push(conceded);
      pointsValues.push(points);

      const weight =
        clamp(
          1 - index * 0.065,
          0.48,
          1
        );

      weightedPoints +=
        points * weight;

      weightedGoalDifference +=
        clamp(
          scored - conceded,
          -3,
          3
        ) * weight;

      totalWeight += weight;

      if (index < 4) {
        newestWeightedPoints +=
          points * weight;

        newestWeight += weight;
      } else {
        olderWeightedPoints +=
          points * weight;

        olderWeight += weight;
      }
    }
  );

  if (totalWeight <= 0) {
    return neutral;
  }

  const sampleSize =
    pointsValues.length;

  if (sampleSize <= 0) {
    return neutral;
  }

  const weightedPointsPerGame =
    weightedPoints /
    totalWeight;

  const weightedGoalDifferencePerGame =
    weightedGoalDifference /
    totalWeight;

  const reliability =
    clamp(
      sampleSize / 7,
      0.35,
      1
    );

  const rawForm =
    14 +
    (
      weightedPointsPerGame / 3
    ) * 68 +
    weightedGoalDifferencePerGame * 9;

  const formRating =
    NEUTRAL_RATING +
    (
      rawForm -
      NEUTRAL_RATING
    ) * reliability;

  const newestPpg =
    safeDivide(
      newestWeightedPoints,
      newestWeight,
      weightedPointsPerGame
    );

  const olderPpg =
    safeDivide(
      olderWeightedPoints,
      olderWeight,
      newestPpg
    );

  const momentumDelta =
    newestPpg -
    olderPpg;

  const goalMomentum =
    clamp(
      weightedGoalDifferencePerGame,
      -1.5,
      1.5
    );

  const momentumRating =
    NEUTRAL_RATING +
    momentumDelta * 16 +
    goalMomentum * 4;

  const attackingConsistency =
    consistencyRating(
      scoredValues,
      1.8
    );

  const defensiveConsistency =
    consistencyRating(
      concededValues,
      1.8
    );

  const formStability =
    consistencyRating(
      pointsValues,
      1.5
    );

  return {
    formRating:
      round(
        clamp(
          formRating,
          10,
          90
        )
      ),

    momentumRating:
      round(
        clamp(
          momentumRating,
          18,
          82
        )
      ),

    sampleSize,

    goalsForAverage:
      round(
        goalsFor /
        sampleSize,
        2
      ),

    goalsAgainstAverage:
      round(
        goalsAgainst /
        sampleSize,
        2
      ),

    winRate:
      round(
        wins /
        sampleSize,
        3
      ),

    drawRate:
      round(
        draws /
        sampleSize,
        3
      ),

    lossRate:
      round(
        losses /
        sampleSize,
        3
      ),

    attackingConsistency,
    defensiveConsistency,
    formStability,
  };
}

function calculateSeasonRatings(
  statistics:
    | TeamSeasonStatisticsLike
    | null
    | undefined,
  side: "home" | "away"
): SeasonPerformance {
  const neutral: SeasonPerformance = {
    attackRating: NEUTRAL_RATING,
    defenseRating: NEUTRAL_RATING,
    venueRating: NEUTRAL_RATING,
    seasonMatches: 0,

    goalsForAverage: 1.2,
    goalsAgainstAverage: 1.2,
    pointsPerGame: 1.3,
    winRate: 0.33,
    drawRate: 0.34,
    lossRate: 0.33,
    cleanSheetRate: 0.25,
    failedToScoreRate: 0.25,
  };

  if (!statistics) {
    return neutral;
  }

  const played =
    splitNumber(
      statistics.fixtures?.played,
      side
    );

  if (played <= 0) {
    return neutral;
  }

  const wins =
    splitNumber(
      statistics.fixtures?.wins,
      side
    );

  const draws =
    splitNumber(
      statistics.fixtures?.draws,
      side
    );

  const losses =
    splitNumber(
      statistics.fixtures?.loses,
      side
    );

  const goalsFor =
    averageNumber(
      statistics.goals
        ?.for?.average,
      side
    ) ?? 1.2;

  const goalsAgainst =
    averageNumber(
      statistics.goals
        ?.against?.average,
      side
    ) ?? 1.2;

  const cleanSheets =
    splitNumber(
      statistics.clean_sheet,
      side
    );

  const failedToScore =
    splitNumber(
      statistics.failed_to_score,
      side
    );

  const pointsPerGame =
    safeDivide(
      wins * 3 + draws,
      played,
      1.3
    );

  const cleanSheetRate =
    clamp(
      safeDivide(
        cleanSheets,
        played
      ),
      0,
      1
    );

  const failedToScoreRate =
    clamp(
      safeDivide(
        failedToScore,
        played
      ),
      0,
      1
    );

  const winRate =
    clamp(
      safeDivide(
        wins,
        played
      ),
      0,
      1
    );

  const drawRate =
    clamp(
      safeDivide(
        draws,
        played
      ),
      0,
      1
    );

  const lossRate =
    clamp(
      safeDivide(
        losses,
        played
      ),
      0,
      1
    );

  const scoringScore =
    clamp(
      goalsFor / 2.4,
      0,
      1
    );

  const scoringFrequencyScore =
    1 -
    failedToScoreRate;

  const resultSupport =
    clamp(
      pointsPerGame / 3,
      0,
      1
    );

  const attackRaw =
    13 +
    scoringScore * 53 +
    scoringFrequencyScore * 24 +
    resultSupport * 10;

  const concedingControl =
    1 -
    clamp(
      goalsAgainst / 2.4,
      0,
      1
    );

  const defeatAvoidance =
    1 -
    lossRate;

  const defenseRaw =
    13 +
    concedingControl * 48 +
    cleanSheetRate * 25 +
    defeatAvoidance * 14;

  const goalDifferenceSignal =
    clamp(
      (
        goalsFor -
        goalsAgainst +
        2
      ) / 4,
      0,
      1
    );

  const venueRaw =
    12 +
    resultSupport * 61 +
    goalDifferenceSignal * 17 +
    winRate * 10;

  const reliability =
    clamp(
      played / 10,
      0.3,
      1
    );

  return {
    attackRating:
      round(
        clamp(
          NEUTRAL_RATING +
          (
            attackRaw -
            NEUTRAL_RATING
          ) * reliability,
          10,
          90
        )
      ),

    defenseRating:
      round(
        clamp(
          NEUTRAL_RATING +
          (
            defenseRaw -
            NEUTRAL_RATING
          ) * reliability,
          10,
          90
        )
      ),

    venueRating:
      round(
        clamp(
          NEUTRAL_RATING +
          (
            venueRaw -
            NEUTRAL_RATING
          ) * reliability,
          10,
          90
        )
      ),

    seasonMatches:
      played,

    goalsForAverage:
      round(
        goalsFor,
        2
      ),

    goalsAgainstAverage:
      round(
        goalsAgainst,
        2
      ),

    pointsPerGame:
      round(
        pointsPerGame,
        2
      ),

    winRate:
      round(
        winRate,
        3
      ),

    drawRate:
      round(
        drawRate,
        3
      ),

    lossRate:
      round(
        lossRate,
        3
      ),

    cleanSheetRate:
      round(
        cleanSheetRate,
        3
      ),

    failedToScoreRate:
      round(
        failedToScoreRate,
        3
      ),
  };
}

function calculateDataReliability(
  seasonMatches: number,
  recentMatches: number
): number {
  const seasonReliability =
    clamp(
      seasonMatches / 12,
      0,
      1
    );

  const recentReliability =
    clamp(
      recentMatches / 8,
      0,
      1
    );

  return round(
    seasonReliability * 0.58 +
    recentReliability * 0.42,
    3
  );
}

function buildTeamIntelligence(
  statistics:
    | TeamSeasonStatisticsLike
    | null
    | undefined,
  fixtures: RecentFixtureLike[],
  team: TeamLike | undefined,
  side: "home" | "away"
): TeamIntelligence {
  const season =
    calculateSeasonRatings(
      statistics,
      side
    );

  const recent =
    calculateRecentForm(
      fixtures,
      team
    );

  const dataReliability =
    calculateDataReliability(
      season.seasonMatches,
      recent.sampleSize
    );

  const recentGoalBalance =
    recent.goalsForAverage -
    recent.goalsAgainstAverage;

  const seasonGoalBalance =
    season.goalsForAverage -
    season.goalsAgainstAverage;

  const balanceSupport =
    clamp(
      (
        recentGoalBalance * 0.55 +
        seasonGoalBalance * 0.45
      ) * 2.5,
      -8,
      8
    );

  const consistencySupport =
    (
      recent.attackingConsistency +
      recent.defensiveConsistency +
      recent.formStability
    ) / 3;

  const consistencyAdjustment =
    clamp(
      (
        consistencySupport -
        NEUTRAL_RATING
      ) * 0.05,
      -3,
      3
    );

  const overallRaw =
    season.attackRating * 0.23 +
    season.defenseRating * 0.24 +
    season.venueRating * 0.18 +
    recent.formRating * 0.21 +
    recent.momentumRating * 0.09 +
    consistencySupport * 0.05 +
    balanceSupport +
    consistencyAdjustment;

  const overallRating =
    NEUTRAL_RATING +
    (
      overallRaw -
      NEUTRAL_RATING
    ) *
    (
      0.72 +
      dataReliability * 0.28
    );

  return {
    attackRating:
      season.attackRating,

    defenseRating:
      season.defenseRating,

    formRating:
      recent.formRating,

    momentumRating:
      recent.momentumRating,

    venueRating:
      season.venueRating,

    overallRating:
      round(
        clamp(
          overallRating,
          10,
          90
        )
      ),

    sampleSize:
      Math.min(
        season.seasonMatches,
        recent.sampleSize
      ),

    goalsForAverage:
      season.goalsForAverage,

    goalsAgainstAverage:
      season.goalsAgainstAverage,

    pointsPerGame:
      season.pointsPerGame,

    winRate:
      season.winRate,

    drawRate:
      season.drawRate,

    lossRate:
      season.lossRate,

    cleanSheetRate:
      season.cleanSheetRate,

    failedToScoreRate:
      season.failedToScoreRate,

    recentGoalsForAverage:
      recent.goalsForAverage,

    recentGoalsAgainstAverage:
      recent.goalsAgainstAverage,

    recentWinRate:
      recent.winRate,

    recentDrawRate:
      recent.drawRate,

    recentLossRate:
      recent.lossRate,

    attackingConsistency:
      recent.attackingConsistency,

    defensiveConsistency:
      recent.defensiveConsistency,

    formStability:
      recent.formStability,

    dataReliability,
  };
}

function calculateDrawPressure(
  home: TeamIntelligence,
  away: TeamIntelligence,
  ratingDifference: number
): number {
  const balanceSignal =
    1 -
    clamp(
      Math.abs(
        ratingDifference
      ) / 16,
      0,
      1
    );

  const historicalDrawSignal =
    clamp(
      (
        home.drawRate +
        away.drawRate +
        home.recentDrawRate +
        away.recentDrawRate
      ) / 4,
      0,
      0.65
    ) / 0.65;

  const lowScoringSignal =
    1 -
    clamp(
      (
        home.goalsForAverage +
        away.goalsForAverage +
        home.recentGoalsForAverage +
        away.recentGoalsForAverage
      ) / 8,
      0,
      1
    );

  const defensiveSignal =
    clamp(
      (
        home.defenseRating +
        away.defenseRating -
        90
      ) / 70,
      0,
      1
    );

  return round(
    clamp(
      (
        balanceSignal * 0.42 +
        historicalDrawSignal * 0.31 +
        lowScoringSignal * 0.15 +
        defensiveSignal * 0.12
      ) * 100,
      0,
      100
    )
  );
}

function calculateGoalEnvironment(
  home: TeamIntelligence,
  away: TeamIntelligence
): number {
  const expectedGoalBase =
    (
      home.goalsForAverage +
      away.goalsForAverage +
      home.recentGoalsForAverage +
      away.recentGoalsForAverage +
      home.goalsAgainstAverage +
      away.goalsAgainstAverage +
      home.recentGoalsAgainstAverage +
      away.recentGoalsAgainstAverage
    ) / 8;

  const scoringFrequency =
    (
      (
        1 -
        home.failedToScoreRate
      ) +
      (
        1 -
        away.failedToScoreRate
      )
    ) / 2;

  const attackStrength =
    (
      home.attackRating +
      away.attackRating
    ) / 200;

  return round(
    clamp(
      (
        clamp(
          expectedGoalBase / 2.1,
          0,
          1
        ) * 0.52 +
        scoringFrequency * 0.28 +
        attackStrength * 0.2
      ) * 100,
      0,
      100
    )
  );
}

function calculateMatchupBalance(
  home: TeamIntelligence,
  away: TeamIntelligence
): number {
  const ratingGap =
    Math.abs(
      home.overallRating -
      away.overallRating
    );

  const formGap =
    Math.abs(
      home.formRating -
      away.formRating
    );

  const attackDefenseGap =
    Math.abs(
      (
        home.attackRating -
        away.defenseRating
      ) -
      (
        away.attackRating -
        home.defenseRating
      )
    );

  return round(
    clamp(
      100 -
      ratingGap * 4.1 -
      formGap * 1.35 -
      attackDefenseGap * 0.8,
      0,
      100
    )
  );
}

function calculateHomeEdge(
  home: TeamIntelligence,
  away: TeamIntelligence
): number {
  const venueDifference =
    home.venueRating -
    away.venueRating;

  const resultDifference =
    (
      home.winRate -
      away.winRate
    ) * 100;

  const goalDifference =
    (
      (
        home.goalsForAverage -
        home.goalsAgainstAverage
      ) -
      (
        away.goalsForAverage -
        away.goalsAgainstAverage
      )
    ) * 10;

  return round(
    clamp(
      50 +
      venueDifference * 0.9 +
      resultDifference * 0.23 +
      goalDifference * 0.3,
      0,
      100
    )
  );
}

export function calculateMatchIntelligence(
  match: MatchLike
): MatchIntelligenceResult {
  const homeTeam =
    match.fixture?.teams?.home;

  const awayTeam =
    match.fixture?.teams?.away;

  const homeFixtures =
    Array.isArray(
      match.recentFixtures?.home
    )
      ? match.recentFixtures.home
      : [];

  const awayFixtures =
    Array.isArray(
      match.recentFixtures?.away
    )
      ? match.recentFixtures.away
      : [];

  const home =
    buildTeamIntelligence(
      match.teamSeasonStatistics?.home,
      homeFixtures,
      homeTeam,
      "home"
    );

  const away =
    buildTeamIntelligence(
      match.teamSeasonStatistics?.away,
      awayFixtures,
      awayTeam,
      "away"
    );

  const ratingDifference =
    round(
      home.overallRating -
      away.overallRating
    );

  const evidenceReliability =
    round(
      Math.min(
        home.dataReliability,
        away.dataReliability
      ),
      2
    );

  return {
    home,
    away,

    ratingDifference,
    evidenceReliability,

    drawPressure:
      calculateDrawPressure(
        home,
        away,
        ratingDifference
      ),

    goalEnvironment:
      calculateGoalEnvironment(
        home,
        away
      ),

    matchupBalance:
      calculateMatchupBalance(
        home,
        away
      ),

    homeEdge:
      calculateHomeEdge(
        home,
        away
      ),
  };
}