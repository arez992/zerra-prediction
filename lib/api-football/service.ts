import "server-only";

import {
  unstable_cache,
} from "next/cache";

import {
  apiFootballEndpoints,
} from "./endpoints";

import {
  apiFootballGet,
} from "./client";

import {
  mapCompleteFixtureData,
} from "./mapper";

import type {
  APIFootballEvent,
  APIFootballFixture,
  APIFootballInjury,
  APIFootballLineup,
  APIFootballOdds,
  APIFootballTeamSeasonStatistics,
  APIFootballTeamStatistics,
  CompleteFixtureData,
} from "./types";

type CompleteFixtureOptions = {
  includeHeadToHead?: boolean;
  includeInjuries?: boolean;
  includeOdds?: boolean;
  includeTeamEnrichment?: boolean;

  recentFixtureLimit?: number;
  headToHeadLimit?: number;
};

type FixtureDetailsCacheEntry = {
  expiresAt: number;
  data: CompleteFixtureData;
};

type SplitAccumulator = {
  played: number;
  wins: number;
  draws: number;
  loses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  failedToScore: number;
};

const FIXTURE_DETAILS_CACHE_TTL_MS =
  5 * 60 * 1000;

const TEAM_ENRICHMENT_CACHE_TTL_MS =
  30 * 60 * 1000;

const COMPLETED_STATUSES =
  new Set([
    "FT",
    "AET",
    "PEN",
  ]);

const fixtureDetailsCache =
  new Map<
    string,
    FixtureDetailsCacheEntry
  >();

const teamEnrichmentCache =
  new Map<
    string,
    FixtureDetailsCacheEntry
  >();

function normalizeFixtureId(
  value: string | number
): string {
  const fixtureId =
    String(value).trim();

  if (
    !/^\d+$/.test(
      fixtureId
    )
  ) {
    throw new Error(
      "A valid numeric fixture ID is required."
    );
  }

  return fixtureId;
}

function normalizeDate(
  value: string
): string {
  const date =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      "Fixture date must use YYYY-MM-DD format."
    );
  }

  return date;
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  maximum: number
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      1,
      Math.floor(parsed)
    )
  );
}

function fixtureDateOnly(
  fixture: APIFootballFixture
): string | undefined {
  const value =
    fixture.fixture?.date;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const date =
    value.slice(
      0,
      10
    );

  return /^\d{4}-\d{2}-\d{2}$/.test(
    date
  )
    ? date
    : undefined;
}

function fixtureTimestamp(
  fixture: APIFootballFixture
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
    ? Math.floor(
        parsed / 1000
      )
    : 0;
}

function isCompletedFixture(
  fixture: APIFootballFixture
): boolean {
  const status =
    String(
      fixture.fixture?.status
        ?.short ?? ""
    )
      .trim()
      .toUpperCase();

  return (
    COMPLETED_STATUSES.has(
      status
    ) &&
    typeof fixture.goals?.home ===
      "number" &&
    typeof fixture.goals?.away ===
      "number"
  );
}

function belongsToTeam(
  fixture: APIFootballFixture,
  teamId: number
): boolean {
  return (
    fixture.teams?.home?.id ===
      teamId ||
    fixture.teams?.away?.id ===
      teamId
  );
}

function filterRecentFixtures(
  fixtures: APIFootballFixture[],
  teamId: number,
  beforeTimestamp: number,
  limit: number
): APIFootballFixture[] {
  return fixtures
    .filter(
      isCompletedFixture
    )
    .filter(
      (fixture) =>
        belongsToTeam(
          fixture,
          teamId
        )
    )
    .filter((fixture) => {
      const timestamp =
        fixtureTimestamp(
          fixture
        );

      return (
        timestamp > 0 &&
        (
          beforeTimestamp <= 0 ||
          timestamp <
            beforeTimestamp
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
      limit
    );
}

function emptySplitAccumulator():
  SplitAccumulator {
  return {
    played: 0,
    wins: 0,
    draws: 0,
    loses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
    failedToScore: 0,
  };
}

function average(
  total: number,
  matches: number
): string | null {
  if (matches <= 0) {
    return null;
  }

  return (
    Math.round(
      (
        total / matches
      ) * 100
    ) / 100
  ).toFixed(2);
}

function hasUsableHomeAwaySplits(
  statistics:
    | APIFootballTeamSeasonStatistics
    | null
): boolean {
  if (!statistics) {
    return false;
  }

  const played =
    statistics.fixtures?.played;

  const goalsFor =
    statistics.goals
      ?.for?.average;

  const goalsAgainst =
    statistics.goals
      ?.against?.average;

  return Boolean(
    typeof played?.home === "number" &&
    played.home > 0 &&
    typeof played?.away === "number" &&
    played.away > 0 &&

    goalsFor?.home !== undefined &&
    goalsFor?.home !== null &&
    goalsFor?.away !== undefined &&
    goalsFor?.away !== null &&

    goalsAgainst?.home !== undefined &&
    goalsAgainst?.home !== null &&
    goalsAgainst?.away !== undefined &&
    goalsAgainst?.away !== null
  );
}

function buildStatisticsFromRecentFixtures(
  fixtures: APIFootballFixture[],
  teamId: number
): APIFootballTeamSeasonStatistics | null {
  if (
    fixtures.length === 0
  ) {
    return null;
  }

  const home =
    emptySplitAccumulator();

  const away =
    emptySplitAccumulator();

  const form: string[] = [];

  const ordered =
    [...fixtures].sort(
      (first, second) =>
        fixtureTimestamp(first) -
        fixtureTimestamp(second)
    );

  for (
    const fixture of ordered
  ) {
    const teamIsHome =
      fixture.teams?.home?.id ===
      teamId;

    const teamIsAway =
      fixture.teams?.away?.id ===
      teamId;

    if (
      !teamIsHome &&
      !teamIsAway
    ) {
      continue;
    }

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
      continue;
    }

    const split =
      teamIsHome
        ? home
        : away;

    split.played += 1;
    split.goalsFor += scored;
    split.goalsAgainst +=
      conceded;

    if (scored > conceded) {
      split.wins += 1;
      form.push("W");
    } else if (
      scored === conceded
    ) {
      split.draws += 1;
      form.push("D");
    } else {
      split.loses += 1;
      form.push("L");
    }

    if (conceded === 0) {
      split.cleanSheets += 1;
    }

    if (scored === 0) {
      split.failedToScore +=
        1;
    }
  }

  const totalPlayed =
    home.played +
    away.played;

  if (
    totalPlayed === 0
  ) {
    return null;
  }

  const totalWins =
    home.wins +
    away.wins;

  const totalDraws =
    home.draws +
    away.draws;

  const totalLoses =
    home.loses +
    away.loses;

  const totalGoalsFor =
    home.goalsFor +
    away.goalsFor;

  const totalGoalsAgainst =
    home.goalsAgainst +
    away.goalsAgainst;

  const totalCleanSheets =
    home.cleanSheets +
    away.cleanSheets;

  const totalFailedToScore =
    home.failedToScore +
    away.failedToScore;

  const sampleFixture =
    fixtures[0];

  const team =
    sampleFixture.teams?.home?.id ===
      teamId
      ? sampleFixture.teams.home
      : sampleFixture.teams?.away;

  return {
    team: {
      id:
        teamId,

      name:
        team?.name,

      logo:
        team?.logo,
    },

    league: {
      id:
        sampleFixture.league?.id,

      name:
        sampleFixture.league?.name,

      country:
        sampleFixture.league
          ?.country,

      logo:
        sampleFixture.league?.logo,

      flag:
        sampleFixture.league?.flag,

      season:
        sampleFixture.league
          ?.season,
    },

    form:
      form.join(""),

    fixtures: {
      played: {
        home:
          home.played,

        away:
          away.played,

        total:
          totalPlayed,
      },

      wins: {
        home:
          home.wins,

        away:
          away.wins,

        total:
          totalWins,
      },

      draws: {
        home:
          home.draws,

        away:
          away.draws,

        total:
          totalDraws,
      },

      loses: {
        home:
          home.loses,

        away:
          away.loses,

        total:
          totalLoses,
      },
    },

    goals: {
      for: {
        total: {
          home:
            home.goalsFor,

          away:
            away.goalsFor,

          total:
            totalGoalsFor,
        },

        average: {
          home:
            average(
              home.goalsFor,
              home.played
            ),

          away:
            average(
              away.goalsFor,
              away.played
            ),

          total:
            average(
              totalGoalsFor,
              totalPlayed
            ),
        },
      },

      against: {
        total: {
          home:
            home.goalsAgainst,

          away:
            away.goalsAgainst,

          total:
            totalGoalsAgainst,
        },

        average: {
          home:
            average(
              home.goalsAgainst,
              home.played
            ),

          away:
            average(
              away.goalsAgainst,
              away.played
            ),

          total:
            average(
              totalGoalsAgainst,
              totalPlayed
            ),
        },
      },
    },

    clean_sheet: {
      home:
        home.cleanSheets,

      away:
        away.cleanSheets,

      total:
        totalCleanSheets,
    },

    failed_to_score: {
      home:
        home.failedToScore,

      away:
        away.failedToScore,

      total:
        totalFailedToScore,
    },
  };
}

async function optionalFetchArray<T>(
  path: string
): Promise<T[]> {
  try {
    const result =
      await apiFootballGet<T>(
        path,
        {
          retries: 0,
        }
      );

    const response =
      result.data
        .response;

    return Array.isArray(
      response
    )
      ? response
      : [];
  } catch (error) {
    console.error(
      "[API-Football array request failed]",
      {
        path,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      }
    );

    return [];
  }
}

async function optionalFetchObject<T>(
  path: string
): Promise<T | null> {
  try {
    const result =
      await apiFootballGet<T>(
        path,
        {
          retries: 0,
        }
      );

    const response =
      result.data
        .response as unknown;

    if (
      Array.isArray(response)
    ) {
      const first =
        response[0];

      return first &&
        typeof first === "object"
        ? first as T
        : null;
    }

    return response &&
      typeof response === "object"
      ? response as T
      : null;
  } catch (error) {
    console.error(
      "[API-Football object request failed]",
      {
        path,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      }
    );

    return null;
  }
}

async function fetchSeasonStatistics(
  teamId: number,
  leagueId: number,
  season: number,
  date?: string
): Promise<
  APIFootballTeamSeasonStatistics | null
> {
  const dated =
    date
      ? await optionalFetchObject<
          APIFootballTeamSeasonStatistics
        >(
          apiFootballEndpoints
            .teamSeasonStatistics(
              teamId,
              leagueId,
              season,
              date
            )
        )
      : null;

  if (
    dated &&
    hasUsableHomeAwaySplits(
      dated
    )
  ) {
    return dated;
  }

  const undated =
    await optionalFetchObject<
      APIFootballTeamSeasonStatistics
    >(
      apiFootballEndpoints
        .teamSeasonStatistics(
          teamId,
          leagueId,
          season
        )
    );

  return undated || dated;
}

async function fetchFixturesByDate(
  date: string
): Promise<
  APIFootballFixture[]
> {
  const normalizedDate =
    normalizeDate(date);

  const result =
    await apiFootballGet<
      APIFootballFixture
    >(
      apiFootballEndpoints
        .fixturesByDate(
          normalizedDate
        ),
      {
        retries: 1,
      }
    );

  return Array.isArray(
    result.data.response
  )
    ? result.data.response
    : [];
}

const getCachedFixturesByDate =
  unstable_cache(
    async (
      date: string
    ) =>
      fetchFixturesByDate(
        date
      ),

    [
      "api-football",
      "fixtures-by-date",
      "v1",
    ],

    {
      revalidate:
        15 * 60,

      tags: [
        "api-football-fixtures",
      ],
    }
  );

export async function getFixturesByDate(
  date: string,
  options?: {
    bypassCache?: boolean;
  }
): Promise<
  APIFootballFixture[]
> {
  const normalizedDate =
    normalizeDate(date);

  if (
    options?.bypassCache ===
    true
  ) {
    return fetchFixturesByDate(
      normalizedDate
    );
  }

  return getCachedFixturesByDate(
    normalizedDate
  );
}

async function fetchTeamEnrichment(
  input: {
    fixture: APIFootballFixture;
    recentFixtureLimit: number;
  }
) {
  const fixture =
    input.fixture;

  const homeTeamId =
    fixture.teams?.home?.id;

  const awayTeamId =
    fixture.teams?.away?.id;

  const leagueId =
    fixture.league?.id;

  const season =
    fixture.league?.season;

  const toDate =
    fixtureDateOnly(
      fixture
    );

  const beforeTimestamp =
    fixtureTimestamp(
      fixture
    );

  if (
    !homeTeamId ||
    !awayTeamId
  ) {
    return {
      recentFixtures: {
        home: [],
        away: [],
      },

      teamSeasonStatistics: {
        home: null,
        away: null,
      },
    };
  }

  /*
   * Do not restrict recent form to the
   * target fixture's league or season.
   * Newly-started leagues and cup ties
   * otherwise return no history.
   */
  const requestLimit =
    Math.min(
      20,
      Math.max(
        input.recentFixtureLimit,
        12
      )
    );

  const [
    rawRecentHome,
    rawRecentAway,
  ] = await Promise.all([
    optionalFetchArray<
      APIFootballFixture
    >(
      apiFootballEndpoints
        .recentTeamFixtures(
          homeTeamId,
          {
            last:
              requestLimit,
          }
        )
    ),

    optionalFetchArray<
      APIFootballFixture
    >(
      apiFootballEndpoints
        .recentTeamFixtures(
          awayTeamId,
          {
            last:
              requestLimit,
          }
        )
    ),
  ]);

  const recentHome =
    filterRecentFixtures(
      rawRecentHome,
      homeTeamId,
      beforeTimestamp,
      input.recentFixtureLimit
    );

  const recentAway =
    filterRecentFixtures(
      rawRecentAway,
      awayTeamId,
      beforeTimestamp,
      input.recentFixtureLimit
    );

  const canFetchSeasonStatistics =
    Boolean(
      leagueId &&
      season
    );

  const [
    apiSeasonHome,
    apiSeasonAway,
  ] = canFetchSeasonStatistics
    ? await Promise.all([
        fetchSeasonStatistics(
          homeTeamId,
          leagueId!,
          season!,
          toDate
        ),

        fetchSeasonStatistics(
          awayTeamId,
          leagueId!,
          season!,
          toDate
        ),
      ])
    : [
        null,
        null,
      ];

  /*
   * When the competition-season endpoint
   * has no usable splits, construct a
   * transparent statistical profile from
   * the team's completed recent fixtures.
   */
  const recentProfileHome =
    buildStatisticsFromRecentFixtures(
      recentHome,
      homeTeamId
    );

  const recentProfileAway =
    buildStatisticsFromRecentFixtures(
      recentAway,
      awayTeamId
    );

  const seasonHome =
    hasUsableHomeAwaySplits(
      apiSeasonHome
    )
      ? apiSeasonHome
      : recentProfileHome;

  const seasonAway =
    hasUsableHomeAwaySplits(
      apiSeasonAway
    )
      ? apiSeasonAway
      : recentProfileAway;

  return {
    recentFixtures: {
      home:
        recentHome,

      away:
        recentAway,
    },

    teamSeasonStatistics: {
      home:
        seasonHome,

      away:
        seasonAway,
    },
  };
}

export async function getCompleteFixtureData(
  fixtureIdInput:
    | string
    | number,

  options?:
    CompleteFixtureOptions
): Promise<
  CompleteFixtureData
> {
  const fixtureId =
    normalizeFixtureId(
      fixtureIdInput
    );

  const normalizedOptions = {
    includeHeadToHead:
      options
        ?.includeHeadToHead ===
      true,

    includeInjuries:
      options
        ?.includeInjuries ===
      true,

    includeOdds:
      options
        ?.includeOdds ===
      true,

    includeTeamEnrichment:
      options
        ?.includeTeamEnrichment ===
      true,

    recentFixtureLimit:
      normalizePositiveInteger(
        options
          ?.recentFixtureLimit,
        8,
        20
      ),

    headToHeadLimit:
      normalizePositiveInteger(
        options
          ?.headToHeadLimit,
        5,
        10
      ),
  };

  const cacheKey =
    JSON.stringify({
      fixtureId,
      options:
        normalizedOptions,
    });

  const activeCache =
    normalizedOptions
      .includeTeamEnrichment
      ? teamEnrichmentCache
      : fixtureDetailsCache;

  const cacheTtl =
    normalizedOptions
      .includeTeamEnrichment
      ? TEAM_ENRICHMENT_CACHE_TTL_MS
      : FIXTURE_DETAILS_CACHE_TTL_MS;

  const cached =
    activeCache.get(
      cacheKey
    );

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.data;
  }

  const fixtureResult =
    await apiFootballGet<
      APIFootballFixture
    >(
      apiFootballEndpoints
        .fixtureById(
          fixtureId
        ),
      {
        retries: 1,
      }
    );

  const fixture =
    fixtureResult.data
      .response?.[0] ||
    null;

  if (!fixture) {
    throw new Error(
      `Fixture ${fixtureId} was not found.`
    );
  }

  const [
    statistics,
    events,
    lineups,
  ] = await Promise.all([
    optionalFetchArray<
      APIFootballTeamStatistics
    >(
      apiFootballEndpoints
        .statistics(
          fixtureId
        )
    ),

    optionalFetchArray<
      APIFootballEvent
    >(
      apiFootballEndpoints
        .events(
          fixtureId
        )
    ),

    optionalFetchArray<
      APIFootballLineup
    >(
      apiFootballEndpoints
        .lineups(
          fixtureId
        )
    ),
  ]);

  const homeTeamId =
    fixture.teams?.home?.id;

  const awayTeamId =
    fixture.teams?.away?.id;

  const headToHead =
    !normalizedOptions
      .includeHeadToHead ||
    !homeTeamId ||
    !awayTeamId
      ? []
      : await optionalFetchArray<
          APIFootballFixture
        >(
          apiFootballEndpoints
            .headToHead(
              homeTeamId,
              awayTeamId,
              normalizedOptions
                .headToHeadLimit
            )
        );

  const injuries =
    !normalizedOptions
      .includeInjuries
      ? []
      : await optionalFetchArray<
          APIFootballInjury
        >(
          apiFootballEndpoints
            .injuriesByFixture(
              fixtureId
            )
        );

  const odds =
    !normalizedOptions
      .includeOdds
      ? []
      : await optionalFetchArray<
          APIFootballOdds
        >(
          apiFootballEndpoints
            .oddsByFixture(
              fixtureId
            )
        );

  const enrichment =
    normalizedOptions
      .includeTeamEnrichment
      ? await fetchTeamEnrichment({
          fixture,

          recentFixtureLimit:
            normalizedOptions
              .recentFixtureLimit,
        })
      : {
          recentFixtures: {
            home: [],
            away: [],
          },

          teamSeasonStatistics: {
            home: null,
            away: null,
          },
        };

  const complete =
    mapCompleteFixtureData({
      fixtureId,
      fixture,

      statistics,
      events,
      lineups,
      headToHead,
      injuries,
      odds,

      recentFixtures:
        enrichment
          .recentFixtures,

      teamSeasonStatistics:
        enrichment
          .teamSeasonStatistics,
    });

  activeCache.set(
    cacheKey,
    {
      data:
        complete,

      expiresAt:
        Date.now() +
        cacheTtl,
    }
  );

  return complete;
}