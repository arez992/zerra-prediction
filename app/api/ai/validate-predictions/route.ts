import { NextResponse } from "next/server";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { validatePrediction } from "@/lib/ai/validator";

export async function POST() {
  try {
    const snapshot = await getDocs(collection(db, "predictionHistory"));

    let checked = 0;
    let updated = 0;

    for (const item of snapshot.docs) {
      const data = item.data();

      if (data.resultChecked === true) continue;

      const fixture = data.match?.fixture;
      const prediction = data.prediction;

      const validation = validatePrediction(prediction, fixture);

      if (!validation.checked) continue;

      checked++;

      await updateDoc(doc(db, "predictionHistory", item.id), {
        correct: validation.correct,
        finalResult: validation.result,
        resultChecked: true,
        checkedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      updated++;
    }

    return NextResponse.json({
      success: true,
      checked,
      updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}