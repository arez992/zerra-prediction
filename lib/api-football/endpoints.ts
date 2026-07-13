function encode(
  value: string | number
): string {
  return encodeURIComponent(String(value));
}

export const apiFootballEndpoints = {
  fixturesByDate(date: string) {
    return `fixtures?date=${encode(date)}`;
  },

  fixtureById(fixtureId: string | number) {
    return `fixtures?id=${encode(fixtureId)}`;
  },

  statistics(fixtureId: string | number) {
    return `fixtures/statistics?fixture=${encode(
      fixtureId
    )}`;
  },

  events(fixtureId: string | number) {
    return `fixtures/events?fixture=${encode(
      fixtureId
    )}`;
  },

  lineups(fixtureId: string | number) {
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
    )}-${encode(awayTeamId)}&last=${encode(last)}`;
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