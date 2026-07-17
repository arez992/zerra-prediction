export type FormResult = {
  homeFormScore: number;
  awayFormScore: number;

  formAdvantage:
    | "home"
    | "away"
    | "balanced";
};

type TeamLike = {
  id?: number;
  name?: string;
};

type RecentFixtureLike = {
  fixture?: {
    id?: number | string;
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
};

type TeamFormMetrics = {
  score: number;
  matches: number;
  pointsPerGame: number;
  goalDifferencePerGame: number;
};

const NEUTRAL_FORM_SCORE = 50;

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

function normalizeTeamName(
  value: unknown
): string {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
}

function isSameTeam(
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
    normalizeTeamName(
      candidate.name
    );

  const targetName =
    normalizeTeamName(
      target.name
    );

  return Boolean(
    candidateName &&
    targetName &&
    candidateName === targetName
  );
}

function fixtureTimestamp(
  fixture: RecentFixtureLike
): number {
  const directTimestamp =
    fixture.fixture?.timestamp;

  if (
    typeof directTimestamp === "number" &&
    Number.isFinite(
      directTimestamp
    )
  ) {
    return directTimestamp;
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
    ? Math.floor(
        parsed / 1000
      )
    : 0;
}

function isCompletedFixture(
  fixture: RecentFixtureLike
): boolean {
  const status =
    String(
      fixture.fixture?.status
        ?.short ?? ""
    )
      .trim()
      .toUpperCase();

  const homeGoals =
    fixture.goals?.home;

  const awayGoals =
    fixture.goals?.away;

  const hasScore =
    typeof homeGoals === "number" &&
    typeof awayGoals === "number";

  if (!hasScore) {
    return false;
  }

  /*
   * API-Football completed statuses.
   */
  return (
    status === "FT" ||
    status === "AET" ||
    status === "PEN" ||
    status === ""
  );
}

function calculateTeamForm(
  fixtures: RecentFixtureLike[],
  team: TeamLike | undefined
): TeamFormMetrics {
  if (
    !team ||
    !Array.isArray(fixtures)
  ) {
    return {
      score:
        NEUTRAL_FORM_SCORE,

      matches: 0,
      pointsPerGame: 0,
      goalDifferencePerGame: 0,
    };
  }

  const completedFixtures =
    fixtures
      .filter(
        isCompletedFixture
      )
      .filter((fixture) => {
        return (
          isSameTeam(
            fixture.teams?.home,
            team
          ) ||
          isSameTeam(
            fixture.teams?.away,
            team
          )
        );
      })
      .sort(
        (first, second) =>
          fixtureTimestamp(second) -
          fixtureTimestamp(first)
      )
      .slice(
        0,
        8
      );

  if (
    completedFixtures.length === 0
  ) {
    return {
      score:
        NEUTRAL_FORM_SCORE,

      matches: 0,
      pointsPerGame: 0,
      goalDifferencePerGame: 0,
    };
  }

  let weightedPoints = 0;
  let weightedGoalDifference = 0;
  let totalWeight = 0;

  completedFixtures.forEach(
    (
      fixture,
      index
    ) => {
      const teamIsHome =
        isSameTeam(
          fixture.teams?.home,
          team
        );

      const scored =
        teamIsHome
          ? fixture.goals?.home
          : fixture.goals?.away;

      const conceded =
        teamIsHome
          ? fixture.goals?.away
          : fixture.goals?.home;

      if (
        typeof scored !== "number" ||
        typeof conceded !== "number"
      ) {
        return;
      }

      /*
       * Newer matches receive a
       * slightly higher weight.
       */
      const weight =
        Math.max(
          0.65,
          1 - index * 0.05
        );

      const points =
        scored > conceded
          ? 3
          : scored === conceded
          ? 1
          : 0;

      weightedPoints +=
        points * weight;

      weightedGoalDifference +=
        clamp(
          scored - conceded,
          -3,
          3
        ) * weight;

      totalWeight +=
        weight;
    }
  );

  if (
    totalWeight <= 0
  ) {
    return {
      score:
        NEUTRAL_FORM_SCORE,

      matches: 0,
      pointsPerGame: 0,
      goalDifferencePerGame: 0,
    };
  }

  const pointsPerGame =
    weightedPoints /
    totalWeight;

  const goalDifferencePerGame =
    weightedGoalDifference /
    totalWeight;

  /*
   * PPG contributes up to 75 points.
   * Goal difference contributes up
   * to approximately ±15 points.
   * A small sample-size adjustment
   * prevents extreme confidence from
   * only one or two matches.
   */
  const pointsScore =
    (
      pointsPerGame / 3
    ) * 75;

  const goalDifferenceScore =
    goalDifferencePerGame * 10;

  const sampleReliability =
    clamp(
      completedFixtures.length / 5,
      0.35,
      1
    );

  const rawScore =
    15 +
    pointsScore +
    goalDifferenceScore;

  const adjustedScore =
    NEUTRAL_FORM_SCORE +
    (
      rawScore -
      NEUTRAL_FORM_SCORE
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

    matches:
      completedFixtures.length,

    pointsPerGame:
      round(
        pointsPerGame
      ),

    goalDifferencePerGame:
      round(
        goalDifferencePerGame
      ),
  };
}

export function calculateForm(
  match: MatchLike
): FormResult {
  const homeTeam =
    match?.fixture
      ?.teams?.home;

  const awayTeam =
    match?.fixture
      ?.teams?.away;

  const homeFixtures =
    Array.isArray(
      match?.recentFixtures
        ?.home
    )
      ? match.recentFixtures.home
      : [];

  const awayFixtures =
    Array.isArray(
      match?.recentFixtures
        ?.away
    )
      ? match.recentFixtures.away
      : [];

  const homeForm =
    calculateTeamForm(
      homeFixtures,
      homeTeam
    );

  const awayForm =
    calculateTeamForm(
      awayFixtures,
      awayTeam
    );

  const homeFormScore =
    homeForm.score;

  const awayFormScore =
    awayForm.score;

  const difference =
    homeFormScore -
    awayFormScore;

  const formAdvantage =
    difference >= 7
      ? "home"
      : difference <= -7
      ? "away"
      : "balanced";

  return {
    homeFormScore,
    awayFormScore,
    formAdvantage,
  };
}