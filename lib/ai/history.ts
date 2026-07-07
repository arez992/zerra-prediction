import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function savePredictionHistory({
  fixtureId,
  match,
  prediction,
  analysis,
  cacheKey,
}: {
  fixtureId: string;
  match: any;
  prediction: any;
  analysis: any;
  cacheKey: string;
}) {
  const ref = doc(db, "predictionHistory", fixtureId);

  await setDoc(
    ref,
    {
      fixtureId,
      match,
      prediction,
      analysis,
      cacheKey,
      resultChecked: false,
      correct: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}