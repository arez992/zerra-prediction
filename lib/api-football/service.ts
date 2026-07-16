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

  /*
   * Prediction Engine v3 enrichment.
   *
   * Disabled by default so existing
   * callers do not unexpectedly spend
   * extra API requests.
   */
  includeTeamEnrichment?: boolean;

  recentFixtureLimit?: number;
  headToHeadLimit?: number;
};

type FixtureDetailsCacheEntry = {
  expiresAt: number;
  data: CompleteFixtureData;
};

const FIXTURE_DETAILS_CACHE_TTL_MS =
  5 * 60 * 1000;

const TEAM_ENRICHMENT_CACHE_TTL_MS =
  30 * 60 * 1000;

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
  } catch {
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

    /*
     * Most API-Football endpoints
     * return an array, while
     * teams/statistics returns one
     * response object.
     */
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
  } catch {
    return null;
  }
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

  const canFetchSeasonStatistics =
    Boolean(
      leagueId &&
      season
    );

  const [
    recentHome,
    recentAway,
    seasonHome,
    seasonAway,
  ] = await Promise.all([
    optionalFetchArray<
      APIFootballFixture
    >(
      apiFootballEndpoints
        .recentTeamFixtures(
          homeTeamId,
          {
            last:
              input
                .recentFixtureLimit,

            leagueId,
            season,
            toDate,
            status: "FT",
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
              input
                .recentFixtureLimit,

            leagueId,
            season,
            toDate,
            status: "FT",
          }
        )
    ),

    canFetchSeasonStatistics
      ? optionalFetchObject<
          APIFootballTeamSeasonStatistics
        >(
          apiFootballEndpoints
            .teamSeasonStatistics(
              homeTeamId,
              leagueId!,
              season!,
              toDate
            )
        )
      : Promise.resolve(
          null
        ),

    canFetchSeasonStatistics
      ? optionalFetchObject<
          APIFootballTeamSeasonStatistics
        >(
          apiFootballEndpoints
            .teamSeasonStatistics(
              awayTeamId,
              leagueId!,
              season!,
              toDate
            )
        )
      : Promise.resolve(
          null
        ),
  ]);

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