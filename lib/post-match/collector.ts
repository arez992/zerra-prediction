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

function sanitizeEventsAgainstFinalScore(events: unknown[], fixture: any, homeScore: number, awayScore: number): unknown[] {
  const homeTeamId = Number(fixture?.teams?.home?.id);
  const awayTeamId = Number(fixture?.teams?.away?.id);
  const goalEvents = events.filter((event: any) => String(event?.type ?? "").trim().toLowerCase() === "goal");

  if (goalEvents.length === 0) return events;

  let homeGoalEvents = 0;
  let awayGoalEvents = 0;
  let unknownGoalEvents = 0;

  for (const event of goalEvents as any[]) {
    const teamId = Number(event?.team?.id);
    if (Number.isFinite(homeTeamId) && teamId === homeTeamId) homeGoalEvents += 1;
    else if (Number.isFinite(awayTeamId) && teamId === awayTeamId) awayGoalEvents += 1;
    else unknownGoalEvents += 1;
  }

  const goalEventsMatchFinalScore =
    unknownGoalEvents === 0 &&
    homeGoalEvents === homeScore &&
    awayGoalEvents === awayScore;

  if (goalEventsMatchFinalScore) return events;

  console.warn("[POST_MATCH_EVENT_CONTRADICTION]", {
    fixtureId: fixture?.fixture?.id ?? null,
    finalScore: `${homeScore}-${awayScore}`,
    goalEvents: `${homeGoalEvents}-${awayGoalEvents}`,
    unknownGoalEvents,
  });

  return events.filter((event: any) => String(event?.type ?? "").trim().toLowerCase() !== "goal");
}

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
  const rawEvents = Array.isArray(data.events) ? data.events : [];
  const events = sanitizeEventsAgainstFinalScore(rawEvents, fixture, homeScore, awayScore);

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