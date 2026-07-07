export type StrengthResult = {
  homeStrength: number;
  awayStrength: number;
  homeAdvantage: number;
};

export function calculateStrength(match: any): StrengthResult {
  // Temporary baseline until team statistics API is connected

  const isHome = true;

  let homeStrength = 60;
  let awayStrength = 50;

  // Home advantage
  const homeAdvantage = isHome ? 8 : 0;

  homeStrength += homeAdvantage;

  // Keep values within range
  homeStrength = Math.min(homeStrength, 100);
  awayStrength = Math.min(awayStrength, 100);

  return {
    homeStrength,
    awayStrength,
    homeAdvantage,
  };
}