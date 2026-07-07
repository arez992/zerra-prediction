import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type CachedAIAnalysis = {
  summary: string;
  verdict: string;
  reasons: string[];
  bestPick: string;
  riskNote: string;
};

export async function getCachedAIAnalysis(cacheKey: string) {
  const ref = doc(db, "aiAnalysisCache", cacheKey);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();

  return data.analysis as CachedAIAnalysis;
}

export async function saveAIAnalysisCache(
  cacheKey: string,
  analysis: CachedAIAnalysis,
  context: any
) {
  const ref = doc(db, "aiAnalysisCache", cacheKey);

  await setDoc(
    ref,
    {
      analysis,
      context,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function createAIAnalysisCacheKey(match: any) {
  const fixtureId =
    match?.fixture?.fixture?.id ||
    match?.fixture?.id ||
    match?.id ||
    "unknown";

  return `fixture-${fixtureId}`;
}