export type GoalsResult = {
  over25: number;
  under25: number;
  btts: number;
  expectedGoals: number;
};

export function calculateGoals(match: any): GoalsResult {
  const homeGoals = match?.fixture?.goals?.home ?? 1;
  const awayGoals = match?.fixture?.goals?.away ?? 1;

  const totalGoals = homeGoals + awayGoals;

  let expectedGoals = 2.4;
  let over25 = 58;
  let under25 = 42;
  let btts = 55;

  if (totalGoals >= 3) {
    expectedGoals = 3.1;
    over25 = 72;
    under25 = 28;
    btts = 66;
  }

  if (homeGoals > 0 && awayGoals > 0) {
    btts += 10;
  }

  return {
    over25,
    under25,
    btts,
    expectedGoals,
  };
}