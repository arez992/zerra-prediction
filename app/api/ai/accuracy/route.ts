import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "predictionHistory"));

    const predictions = snapshot.docs.map((doc) => doc.data());

    const total = predictions.length;

    if (total === 0) {
      return NextResponse.json({
        success: true,
        totalPredictions: 0,
        overallAccuracy: 0,
        homeWinAccuracy: 0,
        over25Accuracy: 0,
        bttsAccuracy: 0,
        correct: 0,
        incorrect: 0,
      });
    }

    const correct = predictions.filter((p) => p.correct === true).length;
    const incorrect = predictions.filter((p) => p.correct === false).length;

    const overallAccuracy =
      correct + incorrect === 0
        ? 0
        : Number(((correct / (correct + incorrect)) * 100).toFixed(1));

    const homeWin = predictions.filter(
      (p) =>
        p.correct === true &&
        p.prediction?.valueBet?.toLowerCase().includes("home")
    ).length;

    const over25 = predictions.filter(
      (p) =>
        p.correct === true &&
        p.prediction?.valueBet?.toLowerCase().includes("over")
    ).length;

    const btts = predictions.filter(
      (p) =>
        p.correct === true &&
        p.prediction?.valueBet?.toLowerCase().includes("btts")
    ).length;

    return NextResponse.json({
      success: true,
      totalPredictions: total,
      correct,
      incorrect,
      overallAccuracy,
      homeWinAccuracy: total
        ? Number(((homeWin / total) * 100).toFixed(1))
        : 0,
      over25Accuracy: total
        ? Number(((over25 / total) * 100).toFixed(1))
        : 0,
      bttsAccuracy: total
        ? Number(((btts / total) * 100).toFixed(1))
        : 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}