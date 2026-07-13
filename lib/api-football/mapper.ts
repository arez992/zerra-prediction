import type {
  APIFootballFixture,
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

export function mapCompleteFixtureData(
  input: {
    fixtureId: string;
    fixture:
      | APIFootballFixture
      | null;
    statistics?:
      | APIFootballTeamStatistics[]
      | null;
    events?: Record<string, unknown>[] | null;
    lineups?: Record<string, unknown>[] | null;
    headToHead?:
      | APIFootballFixture[]
      | null;
    injuries?: Record<string, unknown>[] | null;
    odds?: Record<string, unknown>[] | null;
  }
): CompleteFixtureData {
  if (!input.fixture) {
    throw new Error(
      "Fixture data was not found."
    );
  }

  const statistics =
    ensureArray(input.statistics);

  const events =
    ensureArray(input.events);

  const lineups =
    ensureArray(input.lineups);

  const headToHead =
    ensureArray(input.headToHead);

  const injuries =
    ensureArray(input.injuries);

  const odds =
    ensureArray(input.odds);

  return {
    fixtureId: input.fixtureId,
    fixture: input.fixture,
    statistics,
    events,
    lineups,
    headToHead,
    injuries,
    odds,
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
    },
    fetchedAt:
      new Date().toISOString(),
    source: "api-football",
  };
}

export function toPredictionPipelineInput(
  data: CompleteFixtureData
) {
  return {
    fixture: data.fixture,
    statistics: data.statistics,
    lineups: data.lineups,
    events: data.events,
    source: "api-football",
  };
}