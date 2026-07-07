export type FormResult = {
  homeFormScore: number;
  awayFormScore: number;
  formAdvantage: "home" | "away" | "balanced";
};

export function calculateForm(match: any): FormResult {
  // Temporary smart baseline until recent fixtures API is connected
  const homeGoals = match?.fixture?.goals?.home ?? 0;
  const awayGoals = match?.fixture?.goals?.away ?? 0;

  let homeFormScore = 55;
  let awayFormScore = 45;

  if (homeGoals > awayGoals) {
    homeFormScore += 10;
    awayFormScore -= 5;
  }

  if (awayGoals > homeGoals) {
    awayFormScore += 10;
    homeFormScore -= 5;
  }

  const formAdvantage =
    homeFormScore > awayFormScore + 8
      ? "home"
      : awayFormScore > homeFormScore + 8
      ? "away"
      : "balanced";

  return {
    homeFormScore,
    awayFormScore,
    formAdvantage,
  };
}