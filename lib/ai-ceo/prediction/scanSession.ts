import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

const SESSION_COLLECTION =
  "predictionScanSessions";

const SESSION_DURATION_MS =
  4 * 60 * 60 * 1000;

export type PredictionScanSession = {
  active: boolean;
  startedAtMs: number;
  expiresAtMs: number;
  remainingMs: number;
};

export async function ensurePredictionScanSession(
  date: string
): Promise<PredictionScanSession> {
  const ref =
    adminDb
      .collection(SESSION_COLLECTION)
      .doc(date);

  return adminDb.runTransaction(
    async (transaction) => {
      const now = Date.now();
      const snapshot =
        await transaction.get(ref);

      if (snapshot.exists) {
        const data = snapshot.data() || {};
        const startedAtMs = Number(data.startedAtMs);
        const expiresAtMs = Number(data.expiresAtMs);

        if (
          Number.isFinite(startedAtMs) &&
          startedAtMs > 0 &&
          Number.isFinite(expiresAtMs) &&
          expiresAtMs > startedAtMs
        ) {
          return {
            active: now < expiresAtMs,
            startedAtMs,
            expiresAtMs,
            remainingMs: Math.max(0, expiresAtMs - now),
          };
        }
      }

      const startedAtMs = now;
      const expiresAtMs =
        startedAtMs + SESSION_DURATION_MS;

      transaction.set(
        ref,
        {
          date,
          startedAtMs,
          expiresAtMs,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        active: true,
        startedAtMs,
        expiresAtMs,
        remainingMs: SESSION_DURATION_MS,
      };
    }
  );
}
