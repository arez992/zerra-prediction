import type {
  PredictionResult,
  PublicPrediction,
  VIPPrediction,
} from "./prediction";

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
  publicPrediction: PublicPrediction;
  vipPrediction: VIPPrediction;
  statistics: {
    home: Record<string, string | number>;
    away: Record<string, string | number>;
  };
  lineupsAvailable: boolean;
  eventsAvailable: boolean;
  publicContextSummary: string;
  vipContextSummary: string;
};

type TeamStatisticsBlock = {
  team?: {
    id?: number;
    name?: string;
  };
  statistics?: Array<{
    type?: string;
    value?: string | number | null;
  }>;
};

function normalizeStats(
  statistics: TeamStatisticsBlock[] = [],
  homeTeamId?: number,
  awayTeamId?: number
) {
  const homeStats: Record<
    string,
    string | number
  > = {};

  const awayStats: Record<
    string,
    string | number
  > = {};

  for (const teamStats of statistics) {
    const teamId = teamStats?.team?.id;

    const target =
      teamId === homeTeamId
        ? homeStats
        : teamId === awayTeamId
        ? awayStats
        : Object.keys(homeStats).length === 0
        ? homeStats
        : awayStats;

    for (const stat of teamStats.statistics || []) {
      const key = stat.type?.trim();

      if (!key) {
        continue;
      }

      target[key] =
        stat.value ?? "N/A";
    }
  }

  return {
    homeStats,
    awayStats,
  };
}

export function buildAIContext(
  match: unknown,
  prediction: PredictionResult
): AIContext {
  const source = match as {
    fixture?: {
      teams?: {
        home?: {
          id?: number;
          name?: string;
        };
        away?: {
          id?: number;
          name?: string;
        };
      };
      league?: {
        name?: string;
        country?: string;
      };
      fixture?: {
        venue?: {
          name?: string;
        };
        status?: {
          long?: string;
        };
      };
      goals?: {
        home?: number | null;
        away?: number | null;
      };
    };
    statistics?: TeamStatisticsBlock[];
    lineups?: unknown[];
    events?: unknown[];
  };

  const fixture = source.fixture;

  const homeTeam =
    fixture?.teams?.home?.name ||
    "Home team";

  const awayTeam =
    fixture?.teams?.away?.name ||
    "Away team";

  const league =
    fixture?.league?.name ||
    "Football";

  const country =
    fixture?.league?.country ||
    "Unknown";

  const venue =
    fixture?.fixture?.venue?.name ||
    "Unknown venue";

  const status =
    fixture?.fixture?.status?.long ||
    "Unknown status";

  const homeGoals =
    fixture?.goals?.home ?? "-";

  const awayGoals =
    fixture?.goals?.away ?? "-";

  const {
    homeStats,
    awayStats,
  } = normalizeStats(
    source.statistics || [],
    fixture?.teams?.home?.id,
    fixture?.teams?.away?.id
  );

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
    publicPrediction:
      prediction.publicPrediction,
    vipPrediction:
      prediction.vipPrediction,

    statistics: {
      home: homeStats,
      away: awayStats,
    },

    lineupsAvailable:
      Array.isArray(source.lineups) &&
      source.lineups.length > 0,

    eventsAvailable:
      Array.isArray(source.events) &&
      source.events.length > 0,

    publicContextSummary:
      `${homeTeam} vs ${awayTeam} in ${league}. ` +
      `Risk level: ${prediction.publicPrediction.risk}. ` +
      `${prediction.publicPrediction.teaser}`,

    vipContextSummary:
      `${homeTeam} vs ${awayTeam} in ${league}. ` +
      `Final prediction: ${prediction.vipPrediction.finalPrediction}. ` +
      `Confidence: ${prediction.vipPrediction.confidence}%. ` +
      `Value signal: ${prediction.vipPrediction.valueBet}. ` +
      `Risk: ${prediction.risk} (${prediction.riskScore}/100).`,
  };
}