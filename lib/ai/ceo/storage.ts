import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";
import type {
  CEODecision,
  CEOMetrics,
} from "./types";

const COLLECTION_NAME =
  "ceoDecisions";

type SaveDecisionInput = {
  decision: CEODecision;
  metrics: CEOMetrics;
  source: "openai" | "rules";
  createdBy: string;
  rawResponse?: string;
};

type TimestampLike = {
  toDate: () => Date;
};

function serializeDate(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike)
      .toDate === "function"
  ) {
    return (
      value as TimestampLike
    )
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string"
    ? value
    : null;
}

export async function saveCEODecision(
  input: SaveDecisionInput
) {
  const reference =
    adminDb
      .collection(
        COLLECTION_NAME
      )
      .doc();

  await reference.set({
    ...input.decision,
    metrics: input.metrics,
    source: input.source,
    createdBy:
      input.createdBy,
    rawResponse:
      input.rawResponse ||
      null,
    status: "pending",
    approvedAt: null,
    approvedBy: null,
    executedAt: null,
    executedBy: null,
    executionResult: null,
    createdAt:
      FieldValue.serverTimestamp(),
    updatedAt:
      FieldValue.serverTimestamp(),
  });

  return reference.id;
}

export async function getLatestCEODecision() {
  const snapshot =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(1)
      .get();

  if (snapshot.empty) {
    return null;
  }

  const document =
    snapshot.docs[0];

  const data =
    document.data();

  return {
    id: document.id,
    ...data,
    createdAt:
      serializeDate(
        data.createdAt
      ),
    updatedAt:
      serializeDate(
        data.updatedAt
      ),
    approvedAt:
      serializeDate(
        data.approvedAt
      ),
    executedAt:
      serializeDate(
        data.executedAt
      ),
  };
}

export async function listCEODecisions(
  limit = 20
) {
  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Math.floor(limit)
      )
    );

  const snapshot =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(
        safeLimit
      )
      .get();

  return snapshot.docs.map(
    (document) => {
      const data =
        document.data();

      return {
        id: document.id,
        ...data,
        createdAt:
          serializeDate(
            data.createdAt
          ),
        updatedAt:
          serializeDate(
            data.updatedAt
          ),
        approvedAt:
          serializeDate(
            data.approvedAt
          ),
        executedAt:
          serializeDate(
            data.executedAt
          ),
      };
    }
  );
}