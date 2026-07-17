function encode(
  value: string | number
): string {
  return encodeURIComponent(
    String(value)
  );
}

function positiveInteger(
  value: number,
  fallback: number,
  maximum: number
): number {
  if (
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

function addQueryParameter(
  parameters: string[],
  key: string,
  value:
    | string
    | number
    | undefined
    | null
): void {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return;
  }

  parameters.push(
    `${encode(key)}=${encode(value)}`
  );
}

export const apiFootballEndpoints = {
  fixturesByDate(
    date: string
  ) {
    return `fixtures?date=${encode(
      date
    )}`;
  },

  fixtureById(
    fixtureId: string | number
  ) {
    return `fixtures?id=${encode(
      fixtureId
    )}`;
  },

  recentTeamFixtures(
    teamId: string | number,
    options?: {
      last?: number;
      leagueId?: string | number;
      season?: string | number;
      toDate?: string;
      status?: string;
    }
  ) {
    const parameters: string[] = [];

    addQueryParameter(
      parameters,
      "team",
      teamId
    );

    addQueryParameter(
      parameters,
      "last",
      positiveInteger(
        options?.last ?? 8,
        8,
        40
      )
    );

    addQueryParameter(
      parameters,
      "league",
      options?.leagueId
    );

    addQueryParameter(
      parameters,
      "season",
      options?.season
    );

    addQueryParameter(
      parameters,
      "to",
      options?.toDate
    );

    /*
     * Do not force FT by default.
     *
     * The service layer validates and
     * keeps FT, AET and PEN fixtures.
     * Omitting status here prevents
     * valid completed fixtures from
     * being excluded by the API query.
     */
    addQueryParameter(
      parameters,
      "status",
      options?.status
    );

    return `fixtures?${parameters.join(
      "&"
    )}`;
  },

  teamSeasonStatistics(
    teamId: string | number,
    leagueId: string | number,
    season: string | number,
    date?: string
  ) {
    const parameters: string[] = [];

    addQueryParameter(
      parameters,
      "team",
      teamId
    );

    addQueryParameter(
      parameters,
      "league",
      leagueId
    );

    addQueryParameter(
      parameters,
      "season",
      season
    );

    addQueryParameter(
      parameters,
      "date",
      date
    );

    return `teams/statistics?${parameters.join(
      "&"
    )}`;
  },

  statistics(
    fixtureId: string | number
  ) {
    return `fixtures/statistics?fixture=${encode(
      fixtureId
    )}`;
  },

  events(
    fixtureId: string | number
  ) {
    return `fixtures/events?fixture=${encode(
      fixtureId
    )}`;
  },

  lineups(
    fixtureId: string | number
  ) {
    return `fixtures/lineups?fixture=${encode(
      fixtureId
    )}`;
  },

  headToHead(
    homeTeamId: string | number,
    awayTeamId: string | number,
    last = 10
  ) {
    return `fixtures/headtohead?h2h=${encode(
      homeTeamId
    )}-${encode(
      awayTeamId
    )}&last=${encode(
      positiveInteger(
        last,
        5,
        20
      )
    )}`;
  },

  injuriesByFixture(
    fixtureId: string | number
  ) {
    return `injuries?fixture=${encode(
      fixtureId
    )}`;
  },

  oddsByFixture(
    fixtureId: string | number
  ) {
    return `odds?fixture=${encode(
      fixtureId
    )}`;
  },
};