import "server-only";

import { unstable_cache } from "next/cache";
import { apiFootballEndpoints } from "./endpoints";
import { apiFootballGet } from "./client";
import { mapCompleteFixtureData } from "./mapper";

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

type FixtureDetailsCacheEntry = {
  expiresAt: number;
  data: CompleteFixtureData;
};

const FIXTURE_DETAILS_CACHE_TTL_MS = 5 * 60 * 1000;
const fixtureDetailsCache = new Map<string, FixtureDetailsCacheEntry>();

function normalizeFixtureId(value: string | number): string {
  const fixtureId = String(value).trim();

  if (!/^\d+$/.test(fixtureId)) {
    throw new Error("A valid numeric fixture ID is required.");
  }

  return fixtureId;
}

function normalizeDate(value: string): string {
  const date = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Fixture date must use YYYY-MM-DD format.");
  }

  return date;
}

async function optionalFetch<T>(path: string): Promise<T[]> {
  try {
    const result = await apiFootballGet<T>(path, { retries: 0 });

    return Array.isArray(result.data.response)
      ? result.data.response
      : [];
  } catch {
    return [];
  }
}

async function fetchFixturesByDate(
  date: string
): Promise<APIFootballFixture[]> {
  const normalizedDate = normalizeDate(date);

  const result = await apiFootballGet<APIFootballFixture>(
    apiFootballEndpoints.fixturesByDate(normalizedDate),
    { retries: 1 }
  );

  return Array.isArray(result.data.response)
    ? result.data.response
    : [];
}

const getCachedFixturesByDate = unstable_cache(
  async (date: string) => fetchFixturesByDate(date),
  ["api-football", "fixtures-by-date", "v1"],
  {
    revalidate: 15 * 60,
    tags: ["api-football-fixtures"],
  }
);

export async function getFixturesByDate(
  date: string,
  options?: { bypassCache?: boolean }
): Promise<APIFootballFixture[]> {
  const normalizedDate = normalizeDate(date);

  if (options?.bypassCache === true) {
    return fetchFixturesByDate(normalizedDate);
  }

  return getCachedFixturesByDate(normalizedDate);
}

export async function getCompleteFixtureData(
  fixtureIdInput: string | number,
  options?: CompleteFixtureOptions
): Promise<CompleteFixtureData> {
  const fixtureId = normalizeFixtureId(fixtureIdInput);

  const normalizedOptions = {
    includeHeadToHead: options?.includeHeadToHead === true,
    includeInjuries: options?.includeInjuries === true,
    includeOdds: options?.includeOdds === true,
    headToHeadLimit: Math.min(
      10,
      Math.max(1, options?.headToHeadLimit ?? 5)
    ),
  };

  const cacheKey = JSON.stringify({
    fixtureId,
    options: normalizedOptions,
  });

  const cached = fixtureDetailsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const fixtureResult = await apiFootballGet<APIFootballFixture>(
    apiFootballEndpoints.fixtureById(fixtureId),
    { retries: 1 }
  );

  const fixture = fixtureResult.data.response?.[0] || null;

  if (!fixture) {
    throw new Error(`Fixture ${fixtureId} was not found.`);
  }

  const [statistics, events, lineups] = await Promise.all([
    optionalFetch<APIFootballTeamStatistics>(
      apiFootballEndpoints.statistics(fixtureId)
    ),
    optionalFetch<APIFootballEvent>(
      apiFootballEndpoints.events(fixtureId)
    ),
    optionalFetch<APIFootballLineup>(
      apiFootballEndpoints.lineups(fixtureId)
    ),
  ]);

  const homeTeamId = fixture.teams?.home?.id;
  const awayTeamId = fixture.teams?.away?.id;

  const headToHead =
    !normalizedOptions.includeHeadToHead || !homeTeamId || !awayTeamId
      ? []
      : await optionalFetch<APIFootballFixture>(
          apiFootballEndpoints.headToHead(
            homeTeamId,
            awayTeamId,
            normalizedOptions.headToHeadLimit
          )
        );

  const injuries = !normalizedOptions.includeInjuries
    ? []
    : await optionalFetch<APIFootballInjury>(
        apiFootballEndpoints.injuriesByFixture(fixtureId)
      );

  const odds = !normalizedOptions.includeOdds
    ? []
    : await optionalFetch<APIFootballOdds>(
        apiFootballEndpoints.oddsByFixture(fixtureId)
      );

  const complete = mapCompleteFixtureData({
    fixtureId,
    fixture,
    statistics,
    events,
    lineups,
    headToHead,
    injuries,
    odds,
  });

  fixtureDetailsCache.set(cacheKey, {
    data: complete,
    expiresAt: Date.now() + FIXTURE_DETAILS_CACHE_TTL_MS,
  });

  return complete;
}