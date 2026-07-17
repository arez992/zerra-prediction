export type TeamIntelligence = {
  attackRating: number;
  defenseRating: number;
  formRating: number;
  momentumRating: number;
  venueRating: number;
  overallRating: number;
  sampleSize: number;
};

export type MatchIntelligenceResult = {
  home: TeamIntelligence;
  away: TeamIntelligence;
  ratingDifference: number;
  evidenceReliability: number;
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

const NEUTRAL_RATING = 50;

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

function calculateRecentForm(
  fixtures: RecentFixtureLike[],
  team: TeamLike | undefined
): {
  formRating: number;
  momentumRating: number;
  sampleSize: number;
} {
  if (!team) {
    return {
      formRating: NEUTRAL_RATING,
      momentumRating: NEUTRAL_RATING,
      sampleSize: 0,
    };
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
      .slice(0, 8);

  if (recent.length === 0) {
    return {
      formRating: NEUTRAL_RATING,
      momentumRating: NEUTRAL_RATING,
      sampleSize: 0,
    };
  }

  let weightedPoints = 0;
  let weightedGoalDifference = 0;
  let totalWeight = 0;

  let newestPoints = 0;
  let olderPoints = 0;
  let newestCount = 0;
  let olderCount = 0;

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

      const weight =
        Math.max(
          0.55,
          1 - index * 0.07
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
        newestPoints += points;
        newestCount += 1;
      } else {
        olderPoints += points;
        olderCount += 1;
      }
    }
  );

  if (totalWeight <= 0) {
    return {
      formRating: NEUTRAL_RATING,
      momentumRating: NEUTRAL_RATING,
      sampleSize: 0,
    };
  }

  const pointsPerGame =
    weightedPoints /
    totalWeight;

  const goalDifferencePerGame =
    weightedGoalDifference /
    totalWeight;

  const reliability =
    clamp(
      recent.length / 6,
      0.4,
      1
    );

  const rawForm =
    15 +
    (
      pointsPerGame / 3
    ) * 70 +
    goalDifferencePerGame * 8;

  const formRating =
    NEUTRAL_RATING +
    (
      rawForm -
      NEUTRAL_RATING
    ) * reliability;

  const newestPpg =
    newestCount > 0
      ? newestPoints /
        newestCount
      : 1.5;

  const olderPpg =
    olderCount > 0
      ? olderPoints /
        olderCount
      : newestPpg;

  const momentumDelta =
    newestPpg -
    olderPpg;

  const momentumRating =
    NEUTRAL_RATING +
    momentumDelta * 18;

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
          20,
          80
        )
      ),

    sampleSize:
      recent.length,
  };
}

function calculateSeasonRatings(
  statistics:
    | TeamSeasonStatisticsLike
    | null
    | undefined,
  side: "home" | "away"
): {
  attackRating: number;
  defenseRating: number;
  venueRating: number;
  seasonMatches: number;
} {
  if (!statistics) {
    return {
      attackRating: NEUTRAL_RATING,
      defenseRating: NEUTRAL_RATING,
      venueRating: NEUTRAL_RATING,
      seasonMatches: 0,
    };
  }

  const played =
    splitNumber(
      statistics.fixtures?.played,
      side
    );

  if (played <= 0) {
    return {
      attackRating: NEUTRAL_RATING,
      defenseRating: NEUTRAL_RATING,
      venueRating: NEUTRAL_RATING,
      seasonMatches: 0,
    };
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
    (
      wins * 3 +
      draws
    ) / played;

  const cleanSheetRate =
    clamp(
      cleanSheets / played,
      0,
      1
    );

  const failedToScoreRate =
    clamp(
      failedToScore / played,
      0,
      1
    );

  const attackRaw =
    20 +
    clamp(
      goalsFor / 2.5,
      0,
      1
    ) * 55 +
    (
      1 -
      failedToScoreRate
    ) * 25;

  const defenseRaw =
    20 +
    (
      1 -
      clamp(
        goalsAgainst / 2.5,
        0,
        1
      )
    ) * 55 +
    cleanSheetRate * 25;

  const venueRaw =
    15 +
    clamp(
      pointsPerGame / 3,
      0,
      1
    ) * 70 +
    clamp(
      (
        goalsFor -
        goalsAgainst +
        2
      ) / 4,
      0,
      1
    ) * 15;

  const reliability =
    clamp(
      played / 8,
      0.35,
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
  };
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

  const overallRating =
    season.attackRating * 0.25 +
    season.defenseRating * 0.25 +
    season.venueRating * 0.2 +
    recent.formRating * 0.2 +
    recent.momentumRating * 0.1;

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
  };
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

  const evidenceMatches =
    Math.min(
      home.sampleSize,
      away.sampleSize
    );

  return {
    home,
    away,

    ratingDifference:
      round(
        home.overallRating -
        away.overallRating
      ),

    evidenceReliability:
      round(
        clamp(
          evidenceMatches / 8,
          0,
          1
        ),
        2
      ),
  };
}