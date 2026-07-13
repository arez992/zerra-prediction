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
  APIFootballTeamStatistics,
  CompleteFixtureData,
} from "./types";

type CompleteFixtureOptions = {
  includeHeadToHead?: boolean;
  includeInjuries?: boolean;
  includeOdds?: boolean;
  headToHeadLimit?: number;
};

type CacheEntry = {
  expiresAt: number;
  data: CompleteFixtureData;
};

const CACHE_TTL_MS = 2 * 60 * 1000;

const fixtureCache =
  new Map<string, CacheEntry>();

function normalizeFixtureId(
  value: string | number
): string {
  const fixtureId =
    String(value).trim();

  if (!/^\d+$/.test(fixtureId)) {
    throw new Error(
      "A valid numeric fixture ID is required."
    );
  }

  return fixtureId;
}

async function optionalFetch<T>(
  path: string
): Promise<T[]> {
  try {
    const result =
      await apiFootballGet<T>(path);

    return Array.isArray(
      result.data.response
    )
      ? result.data.response
      : [];
  } catch {
    return [];
  }
}

export async function getFixturesByDate(
  date: string
): Promise<APIFootballFixture[]> {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    throw new Error(
      "Fixture date must use YYYY-MM-DD format."
    );
  }

  const result =
    await apiFootballGet<APIFootballFixture>(
      apiFootballEndpoints.fixturesByDate(
        date
      )
    );

  return result.data.response || [];
}

export async function getCompleteFixtureData(
  fixtureIdInput: string | number,
  options?: CompleteFixtureOptions
): Promise<CompleteFixtureData> {
  const fixtureId =
    normalizeFixtureId(
      fixtureIdInput
    );

  const cacheKey = JSON.stringify({
    fixtureId,
    options: {
      includeHeadToHead:
        options?.includeHeadToHead !==
        false,
      includeInjuries:
        options?.includeInjuries !==
        false,
      includeOdds:
        options?.includeOdds === true,
      headToHeadLimit:
        options?.headToHeadLimit ?? 10,
    },
  });

  const cached =
    fixtureCache.get(cacheKey);

  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {
    return cached.data;
  }

  const fixtureResult =
    await apiFootballGet<APIFootballFixture>(
      apiFootballEndpoints.fixtureById(
        fixtureId
      )
    );

  const fixture =
    fixtureResult.data.response?.[0] ||
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
    optionalFetch<APIFootballTeamStatistics>(
      apiFootballEndpoints.statistics(
        fixtureId
      )
    ),
    optionalFetch<APIFootballEvent>(
      apiFootballEndpoints.events(
        fixtureId
      )
    ),
    optionalFetch<APIFootballLineup>(
      apiFootballEndpoints.lineups(
        fixtureId
      )
    ),
  ]);

  const homeTeamId =
    fixture.teams?.home?.id;

  const awayTeamId =
    fixture.teams?.away?.id;

  const headToHead =
    options?.includeHeadToHead ===
      false ||
    !homeTeamId ||
    !awayTeamId
      ? []
      : await optionalFetch<APIFootballFixture>(
          apiFootballEndpoints.headToHead(
            homeTeamId,
            awayTeamId,
            options?.headToHeadLimit ??
              10
          )
        );

  const injuries =
    options?.includeInjuries ===
      false
      ? []
      : await optionalFetch<APIFootballInjury>(
          apiFootballEndpoints.injuriesByFixture(
            fixtureId
          )
        );

  const odds =
    options?.includeOdds === true
      ? await optionalFetch<APIFootballOdds>(
          apiFootballEndpoints.oddsByFixture(
            fixtureId
          )
        )
      : [];

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
    });

  fixtureCache.set(cacheKey, {
    data: complete,
    expiresAt:
      Date.now() + CACHE_TTL_MS,
  });

  return complete;
}