import type { PredictionRisk } from "./prediction";

export type RiskResult = {
  risk: PredictionRisk;
  riskScore: number;
  probabilityGap: number;
  drawPressure: number;
};

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

export function calculateRisk(
  homeWin: number,
  draw: number,
  awayWin: number
): RiskResult {
  const probabilityGap = Math.abs(
    homeWin - awayWin
  );

  const drawPressure = clamp(
    Math.round(draw),
    0,
    100
  );

  let riskScore =
    100 -
    probabilityGap * 1.6 +
    drawPressure * 0.45;

  riskScore = clamp(
    Math.round(riskScore),
    10,
    95
  );

  let risk: PredictionRisk = "High";

  if (riskScore <= 35) {
    risk = "Low";
  } else if (riskScore <= 65) {
    risk = "Medium";
  }

  return {
    risk,
    riskScore,
    probabilityGap,
    drawPressure,
  };
}