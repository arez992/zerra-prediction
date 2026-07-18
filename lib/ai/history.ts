import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

type SavePredictionHistoryInput = {
  fixtureId: string;
  match: any;
  prediction: any;
  analysis: any;
  cacheKey: string;
};

function normalizeFixtureId(
  value: unknown
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .trim()
    .replace(
      /^fixture-/,
      ""
    );
}

export async function savePredictionHistory({
  fixtureId,
  match,
  prediction,
  analysis,
  cacheKey,
}: SavePredictionHistoryInput) {
  const normalizedFixtureId =
    normalizeFixtureId(
      fixtureId
    );

  if (!normalizedFixtureId) {
    throw new Error(
      "Fixture ID is required to save prediction history."
    );
  }

  /*
   * Use the same deterministic document ID
   * as the main prediction generator.
   *
   * This prevents:
   *
   * 123
   * fixture-123
   *
   * from becoming two separate documents.
   */
  const documentId =
    `fixture-${normalizedFixtureId}`;

  const ref =
    adminDb
      .collection(
        "predictionHistory"
      )
      .doc(
        documentId
      );

  /*
   * The transaction protects settlement state.
   *
   * resultChecked and correct are initialized
   * only when the document is first created.
   *
   * Existing settled predictions are never
   * reset when AI analysis is generated later.
   */
  await adminDb.runTransaction(
    async (
      transaction
    ) => {
      const snapshot =
        await transaction.get(
          ref
        );

      const historyData: Record<
        string,
        unknown
      > = {
        fixtureId:
          normalizedFixtureId,

        match,

        prediction,

        analysis,

        cacheKey,

        updatedAt:
          FieldValue
            .serverTimestamp(),
      };

      if (!snapshot.exists) {
        historyData.resultChecked =
          false;

        historyData.correct =
          null;

        historyData.createdAt =
          FieldValue
            .serverTimestamp();
      }

      transaction.set(
        ref,
        historyData,
        {
          merge: true,
        }
      );
    }
  );
}