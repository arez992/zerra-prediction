export type APIFootballPaging = {
  current: number;
  total: number;
};

export type APIFootballParameters = Record<
  string,
  string
>;

export type APIFootballResponse<T> = {
  get: string;

  parameters:
    APIFootballParameters;

  errors:
    | string[]
    | Record<string, string>
    | null;

  results: number;

  paging:
    APIFootballPaging;

  response: T[];
};

export type APIFootballRateLimit = {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
};

export type APIFootballRequestResult<T> = {
  data:
    APIFootballResponse<T>;

  status: number;
  ok: boolean;

  rateLimit:
    APIFootballRateLimit;
};

export type APIFootballTeam = {
  id?: number;
  name?: string;
  logo?: string;
  winner?: boolean | null;
};

export type APIFootballFixture = {
  fixture?: {
    id?: number;

    referee?: string | null;
    timezone?: string;
    date?: string;
    timestamp?: number;

    periods?: {
      first?: number | null;
      second?: number | null;
    };

    venue?: {
      id?: number | null;
      name?: string | null;
      city?: string | null;
    };

    status?: {
      long?: string;
      short?: string;
      elapsed?: number | null;
      extra?: number | null;
    };
  };

  league?: {
    id?: number;
    name?: string;
    country?: string;
    logo?: string;
    flag?: string | null;
    season?: number;
    round?: string;
    standings?: boolean;
  };

  teams?: {
    home?: APIFootballTeam;
    away?: APIFootballTeam;
  };

  goals?: {
    home?: number | null;
    away?: number | null;
  };

  score?: {
    halftime?: {
      home?: number | null;
      away?: number | null;
    };

    fulltime?: {
      home?: number | null;
      away?: number | null;
    };

    extratime?: {
      home?: number | null;
      away?: number | null;
    };

    penalty?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

export type APIFootballStatistic = {
  type?: string;

  value?:
    | string
    | number
    | null;
};

/*
 * Statistics belonging to one
 * specific fixture.
 */
export type APIFootballTeamStatistics = {
  team?:
    APIFootballTeam;

  statistics?:
    APIFootballStatistic[];
};

export type APIFootballSeasonFixtureSplit = {
  home?: number;
  away?: number;
  total?: number;
};

export type APIFootballSeasonResults = {
  wins?:
    APIFootballSeasonFixtureSplit;

  draws?:
    APIFootballSeasonFixtureSplit;

  loses?:
    APIFootballSeasonFixtureSplit;
};

export type APIFootballGoalAverageSplit = {
  home?: string | number | null;
  away?: string | number | null;
  total?: string | number | null;
};

export type APIFootballGoalMinuteRange = {
  total?: number | null;
  percentage?: string | null;
};

export type APIFootballGoalMinuteDistribution = Record<
  string,
  APIFootballGoalMinuteRange | undefined
>;

export type APIFootballGoalProfile = {
  total?:
    APIFootballSeasonFixtureSplit;

  average?:
    APIFootballGoalAverageSplit;

  minute?:
    APIFootballGoalMinuteDistribution;
};

export type APIFootballBiggestResult = {
  home?: string | null;
  away?: string | null;
};

export type APIFootballBiggestGoals = {
  for?: {
    home?: number | null;
    away?: number | null;
  };

  against?: {
    home?: number | null;
    away?: number | null;
  };
};

export type APIFootballTeamSeasonStatistics = {
  league?: {
    id?: number;
    name?: string;
    country?: string;
    logo?: string;
    flag?: string | null;
    season?: number;
  };

  team?:
    APIFootballTeam;

  /*
   * API-Football normally returns a
   * recent-form sequence such as:
   * "WWDLW".
   */
  form?: string | null;

  fixtures?: {
    played?:
      APIFootballSeasonFixtureSplit;

    wins?:
      APIFootballSeasonFixtureSplit;

    draws?:
      APIFootballSeasonFixtureSplit;

    loses?:
      APIFootballSeasonFixtureSplit;
  };

  goals?: {
    for?:
      APIFootballGoalProfile;

    against?:
      APIFootballGoalProfile;
  };

  biggest?: {
    streak?: {
      wins?: number;
      draws?: number;
      loses?: number;
    };

    wins?:
      APIFootballBiggestResult;

    loses?:
      APIFootballBiggestResult;

    goals?:
      APIFootballBiggestGoals;
  };

  clean_sheet?:
    APIFootballSeasonFixtureSplit;

  failed_to_score?:
    APIFootballSeasonFixtureSplit;

  penalty?: {
    scored?: {
      total?: number;
      percentage?: string | null;
    };

    missed?: {
      total?: number;
      percentage?: string | null;
    };

    total?: number;
  };

  lineups?: Array<{
    formation?: string;
    played?: number;
  }>;

  cards?: {
    yellow?: Record<
      string,
      APIFootballGoalMinuteRange | undefined
    >;

    red?: Record<
      string,
      APIFootballGoalMinuteRange | undefined
    >;
  };
};

export type APIFootballRecentFixtures = {
  home:
    APIFootballFixture[];

  away:
    APIFootballFixture[];
};

export type APIFootballSeasonStatisticsPair = {
  home:
    | APIFootballTeamSeasonStatistics
    | null;

  away:
    | APIFootballTeamSeasonStatistics
    | null;
};

export type APIFootballEvent = Record<
  string,
  unknown
>;

export type APIFootballLineup = Record<
  string,
  unknown
>;

export type APIFootballInjury = Record<
  string,
  unknown
>;

export type APIFootballOdds = Record<
  string,
  unknown
>;

export type CompleteFixtureAvailability = {
  fixture: boolean;
  statistics: boolean;
  events: boolean;
  lineups: boolean;
  headToHead: boolean;
  injuries: boolean;
  odds: boolean;

  /*
   * Prediction Engine v3 enrichment.
   *
   * Optional until mapper/service
   * integration is completed.
   */
  recentFixturesHome?: boolean;
  recentFixturesAway?: boolean;

  teamSeasonStatisticsHome?: boolean;
  teamSeasonStatisticsAway?: boolean;

  homeAwaySplits?: boolean;
};

export type CompleteFixtureData = {
  fixtureId: string;

  fixture:
    APIFootballFixture;

  /*
   * Current fixture information.
   */
  statistics:
    APIFootballTeamStatistics[];

  events:
    APIFootballEvent[];

  lineups:
    APIFootballLineup[];

  headToHead:
    APIFootballFixture[];

  injuries:
    APIFootballInjury[];

  odds:
    APIFootballOdds[];

  /*
   * Prediction Engine v3 enrichment.
   *
   * Kept optional temporarily for
   * backward compatibility with the
   * existing mapper and cached data.
   */
  recentFixtures?:
    APIFootballRecentFixtures;

  teamSeasonStatistics?:
    APIFootballSeasonStatisticsPair;

  availability:
    CompleteFixtureAvailability;

  fetchedAt: string;

  source:
    "api-football";
};