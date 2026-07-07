import type { PredictionResult } from "./prediction";

export type AIContext = {
  matchInfo: {
    homeTeam: string;
    awayTeam: string;
    league: string;
    country: string;
    venue: string;
    status: string;
    score: string;
  };
  prediction: PredictionResult;
  statistics: {
    home: Record<string, string | number>;
    away: Record<string, string | number>;
  };
  lineupsAvailable: boolean;
  eventsAvailable: boolean;
  contextSummary: string;
};

function normalizeStats(statistics: any[] = []) {
  const homeStats: Record<string, string | number> = {};
  const awayStats: Record<string, string | number> = {};

  statistics.forEach((teamStats: any) => {
    const teamName = teamStats?.team?.name || "";
    const isHome = teamStats?.isHome || false;

    teamStats?.statistics?.forEach((stat: any) => {
      const key = stat.type;
      const value = stat.value ?? "N/A";

      if (isHome || teamName) {
        if (Object.keys(homeStats).length <= Object.keys(awayStats).length) {
          homeStats[key] = value;
        } else {
          awayStats[key] = value;
        }
      }
    });
  });

  return { homeStats, awayStats };
}

export function buildAIContext(match: any, prediction: PredictionResult): AIContext {
  const fixture = match?.fixture;

  const homeTeam = fixture?.teams?.home?.name || "Home team";
  const awayTeam = fixture?.teams?.away?.name || "Away team";
  const league = fixture?.league?.name || "Football";
  const country = fixture?.league?.country || "Unknown";
  const venue = fixture?.fixture?.venue?.name || "Unknown venue";
  const status = fixture?.fixture?.status?.long || "Unknown status";

  const homeGoals = fixture?.goals?.home ?? "-";
  const awayGoals = fixture?.goals?.away ?? "-";

  const { homeStats, awayStats } = normalizeStats(match?.statistics || []);

  return {
    matchInfo: {
      homeTeam,
      awayTeam,
      league,
      country,
      venue,
      status,
      score: `${homeGoals} - ${awayGoals}`,
    },
    prediction,
    statistics: {
      home: homeStats,
      away: awayStats,
    },
    lineupsAvailable: Array.isArray(match?.lineups) && match.lineups.length > 0,
    eventsAvailable: Array.isArray(match?.events) && match.events.length > 0,
    contextSummary: `${homeTeam} vs ${awayTeam} in ${league}. Current status: ${status}. AI confidence: ${prediction.confidence}%. Value bet: ${prediction.valueBet}. Risk: ${prediction.risk}.`,
  };
}