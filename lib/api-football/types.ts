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
  parameters: APIFootballParameters;
  errors:
    | string[]
    | Record<string, string>
    | null;
  results: number;
  paging: APIFootballPaging;
  response: T[];
};

export type APIFootballRateLimit = {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
};

export type APIFootballRequestResult<T> = {
  data: APIFootballResponse<T>;
  status: number;
  ok: boolean;
  rateLimit: APIFootballRateLimit;
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
  value?: string | number | null;
};

export type APIFootballTeamStatistics = {
  team?: APIFootballTeam;
  statistics?: APIFootballStatistic[];
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

export type CompleteFixtureData = {
  fixtureId: string;
  fixture: APIFootballFixture;
  statistics: APIFootballTeamStatistics[];
  events: APIFootballEvent[];
  lineups: APIFootballLineup[];
  headToHead: APIFootballFixture[];
  injuries: APIFootballInjury[];
  odds: APIFootballOdds[];
  availability: {
    fixture: boolean;
    statistics: boolean;
    events: boolean;
    lineups: boolean;
    headToHead: boolean;
    injuries: boolean;
    odds: boolean;
  };
  fetchedAt: string;
  source: "api-football";
};