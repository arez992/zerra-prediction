import { calculateForm } from "./form";
import { calculateStrength } from "./strength";
import { calculateGoals } from "./goals";
import { calculateRisk } from "./risk";

export type AIScoreResult = {
  confidence: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  under25: number;
  btts: number;
  risk: "Low" | "Medium" | "High";
  valueBet: string;
};

export function calculateAIScore(match: any): AIScoreResult {
  const form = calculateForm(match);
  const strength = calculateStrength(match);
  const goals = calculateGoals(match);

  let homeWin = Math.round(
    (form.homeFormScore * 0.45) +
    (strength.homeStrength * 0.55)
  );

  let awayWin = Math.round(
    (form.awayFormScore * 0.45) +
    (strength.awayStrength * 0.55)
  );

  homeWin = Math.min(homeWin, 80);
  awayWin = Math.min(awayWin, 80);

  let draw = 100 - homeWin - awayWin;

  if (draw < 10) draw = 10;

  const total = homeWin + awayWin + draw;

  homeWin = Math.round((homeWin / total) * 100);
  awayWin = Math.round((awayWin / total) * 100);
  draw = 100 - homeWin - awayWin;

  const confidence = Math.max(homeWin, awayWin);

  const risk = calculateRisk(homeWin, draw, awayWin);

  let valueBet = "No Value";

  if (goals.over25 >= 70) {
    valueBet = "Over 2.5 Goals";
  } else if (homeWin >= 60) {
    valueBet = "Home Win";
  } else if (awayWin >= 60) {
    valueBet = "Away Win";
  } else if (goals.btts >= 70) {
    valueBet = "BTTS Yes";
  }

  return {
    confidence,
    homeWin,
    draw,
    awayWin,
    over25: goals.over25,
    under25: goals.under25,
    btts: goals.btts,
    risk: risk.risk,
    valueBet,
  };
}