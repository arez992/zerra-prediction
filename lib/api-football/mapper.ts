import type {
  APIFootballFixture,
  APIFootballRecentFixtures,
  APIFootballSeasonStatisticsPair,
  APIFootballTeamSeasonStatistics,
  APIFootballTeamStatistics,
  CompleteFixtureData,
} from "./types";

function ensureArray<T>(
  value: T[] | undefined | null
): T[] {
  return Array.isArray(value)
    ? value
    : [];
}

function ensureSeasonStatistics(
  value:
    | APIFootballTeamSeasonStatistics
    | undefined
    | null
): APIFootballTeamSeasonStatistics | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value;
}

function hasHomeAwaySplits(
  statistics:
    APIFootballTeamSeasonStatistics | null
): boolean {
  if (!statistics) {
    return false;
  }

  const played =
    statistics.fixtures?.played;

  const goalsFor =
    statistics.goals?.for?.average;

  const goalsAgainst =
    statistics.goals?.against?.average;

  const hasPlayedSplits =
    typeof played?.home === "number" &&
    typeof played?.away === "number";

  const hasGoalsForSplits =
    goalsFor?.home !== undefined &&
    goalsFor?.home !== null &&
    goalsFor?.away !== undefined &&
    goalsFor?.away !== null;

  const hasGoalsAgainstSplits =
    goalsAgainst?.home !== undefined &&
    goalsAgainst?.home !== null &&
    goalsAgainst?.away !== undefined &&
    goalsAgainst?.away !== null;

  return (
    hasPlayedSplits &&
    hasGoalsForSplits &&
    hasGoalsAgainstSplits
  );
}

export function mapCompleteFixtureData(
  input: {
    fixtureId: string;

    fixture:
      | APIFootballFixture
      | null;

    statistics?:
      | APIFootballTeamStatistics[]
      | null;

    events?:
      | Record<string, unknown>[]
      | null;

    lineups?:
      | Record<string, unknown>[]
      | null;

    headToHead?:
      | APIFootballFixture[]
      | null;

    injuries?:
      | Record<string, unknown>[]
      | null;

    odds?:
      | Record<string, unknown>[]
      | null;

    recentFixtures?: {
      home?:
        | APIFootballFixture[]
        | null;

      away?:
        | APIFootballFixture[]
        | null;
    } | null;

    teamSeasonStatistics?: {
      home?:
        | APIFootballTeamSeasonStatistics
        | null;

      away?:
        | APIFootballTeamSeasonStatistics
        | null;
    } | null;
  }
): CompleteFixtureData {
  if (!input.fixture) {
    throw new Error(
      "Fixture data was not found."
    );
  }

  const statistics =
    ensureArray(
      input.statistics
    );

  const events =
    ensureArray(
      input.events
    );

  const lineups =
    ensureArray(
      input.lineups
    );

  const headToHead =
    ensureArray(
      input.headToHead
    );

  const injuries =
    ensureArray(
      input.injuries
    );

  const odds =
    ensureArray(
      input.odds
    );

  const recentFixtures:
    APIFootballRecentFixtures = {
      home:
        ensureArray(
          input.recentFixtures?.home
        ),

      away:
        ensureArray(
          input.recentFixtures?.away
        ),
    };

  const teamSeasonStatistics:
    APIFootballSeasonStatisticsPair = {
      home:
        ensureSeasonStatistics(
          input.teamSeasonStatistics?.home
        ),

      away:
        ensureSeasonStatistics(
          input.teamSeasonStatistics?.away
        ),
    };

  const homeAwaySplits =
    hasHomeAwaySplits(
      teamSeasonStatistics.home
    ) &&
    hasHomeAwaySplits(
      teamSeasonStatistics.away
    );

  return {
    fixtureId:
      input.fixtureId,

    fixture:
      input.fixture,

    statistics,
    events,
    lineups,
    headToHead,
    injuries,
    odds,

    recentFixtures,

    teamSeasonStatistics,

    availability: {
      fixture: true,

      statistics:
        statistics.length > 0,

      events:
        events.length > 0,

      lineups:
        lineups.length > 0,

      headToHead:
        headToHead.length > 0,

      injuries:
        injuries.length > 0,

      odds:
        odds.length > 0,

      recentFixturesHome:
        recentFixtures.home.length > 0,

      recentFixturesAway:
        recentFixtures.away.length > 0,

      teamSeasonStatisticsHome:
        teamSeasonStatistics.home !== null,

      teamSeasonStatisticsAway:
        teamSeasonStatistics.away !== null,

      homeAwaySplits,
    },

    fetchedAt:
      new Date().toISOString(),

    source:
      "api-football",
  };
}

export function toPredictionPipelineInput(
  data: CompleteFixtureData
) {
  return {
    fixtureId:
      data.fixtureId,

    fixture:
      data.fixture,

    statistics:
      data.statistics,

    events:
      data.events,

    lineups:
      data.lineups,

    headToHead:
      data.headToHead,

    injuries:
      data.injuries,

    odds:
      data.odds,

    recentFixtures:
      data.recentFixtures ?? {
        home: [],
        away: [],
      },

    teamSeasonStatistics:
      data.teamSeasonStatistics ?? {
        home: null,
        away: null,
      },

    availability:
      data.availability,

    fetchedAt:
      data.fetchedAt,

    source:
      data.source,
  };
}