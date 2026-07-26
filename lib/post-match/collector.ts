import "server-only";

import { getCompleteFixtureData } from "@/lib/api-football/service";
import { createPostMatchFingerprint } from "@/lib/post-match/fingerprint";

const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

export type VerifiedPostMatchSnapshot = {
  fixtureId: string;
  status: string;
  homeScore: number;
  awayScore: number;
  facts: Record<string, unknown>;
  statistics: unknown[];
  events: unknown[];
  sourceFingerprint: string;
};

export async function collectVerifiedPostMatchSnapshot(fixtureId: string): Promise<VerifiedPostMatchSnapshot> {
  const data = await getCompleteFixtureData(fixtureId, {
    includeHeadToHead: true,
    includeInjuries: false,
    includeOdds: false,
    includeTeamEnrichment: true,
    recentFixtureLimit: 8,
    headToHeadLimit: 5,
  });

  const fixture = data.fixture as any;
  const status = String(fixture?.fixture?.status?.short ?? "").trim().toUpperCase();
  const homeScore = fixture?.goals?.home;
  const awayScore = fixture?.goals?.away;

  if (!FINAL_STATUSES.has(status)) {
    throw new Error(`Fixture ${fixtureId} is not finished.`);
  }

  if (typeof homeScore !== "number" || typeof awayScore !== "number") {
    throw new Error(`Fixture ${fixtureId} has no verified final score.`);
  }

  const facts = {
    fixture: data.fixture,
    headToHead: data.headToHead,
    recentFixtures: data.recentFixtures,
    teamSeasonStatistics: data.teamSeasonStatistics,
    lineups: data.lineups,
  };

  const statistics = Array.isArray(data.statistics) ? data.statistics : [];
  const events = Array.isArray(data.events) ? data.events : [];

  const sourceFingerprint = createPostMatchFingerprint({
    fixtureId,
    status,
    homeScore,
    awayScore,
    facts,
    statistics,
    events,
  });

  return {
    fixtureId: String(fixtureId),
    status,
    homeScore,
    awayScore,
    facts,
    statistics,
    events,
    sourceFingerprint,
  };
}