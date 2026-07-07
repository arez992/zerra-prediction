export type RiskResult = {
  risk: "Low" | "Medium" | "High";
  riskScore: number;
};

export function calculateRisk(homeWin: number, draw: number, awayWin: number): RiskResult {
  const gap = Math.abs(homeWin - awayWin);

  if (gap >= 25 && draw < 28) {
    return { risk: "Low", riskScore: 25 };
  }

  if (gap >= 12) {
    return { risk: "Medium", riskScore: 55 };
  }

  return { risk: "High", riskScore: 82 };
}