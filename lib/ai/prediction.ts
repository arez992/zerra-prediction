export type PredictionResult = {
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

export function calculatePrediction(match: any): PredictionResult {
  // Temporary baseline until real AI inputs are connected
  return {
    confidence: 92,
    homeWin: 54,
    draw: 24,
    awayWin: 22,
    over25: 72,
    under25: 28,
    btts: 66,
    risk: "Low",
    valueBet: "Over 2.5 Goals",
  };
}