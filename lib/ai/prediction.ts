import { calculateAIScore } from "./score";

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
  return calculateAIScore(match);
}