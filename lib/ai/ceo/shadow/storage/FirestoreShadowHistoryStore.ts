import "server-only";

import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  filterShadowHistory,
} from "./ShadowHistory";
import {
  isShadowHistoryRecord,
  type ShadowHistoryQuery,
  type ShadowHistoryRecord,
  type ShadowHistoryStore,
} from "./ShadowTypes";

export const FIRESTORE_SHADOW_HISTORY_STORE_VERSION =
  "1.0.0";

const DEFAULT_COLLECTION =
  "aiCeoShadowHistory";

function isPersistenceEnabled(): boolean {
  return (
    process.env.AI_CEO_SHADOW_PERSIST ===
    "true"
  );
}

function getCollectionName(): string {
  const configured =
    process.env
      .AI_CEO_SHADOW_COLLECTION?.trim();

  return configured || DEFAULT_COLLECTION;
}

function normalizeLimit(
  value: number | undefined
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 100;
  }

  return Math.min(
    500,
    Math.max(1, Math.floor(value))
  );
}

function serializeRecord(
  record: ShadowHistoryRecord
): Record<string, unknown> {
  return {
    ...record,
    storageVersion:
      FIRESTORE_SHADOW_HISTORY_STORE_VERSION,
  };
}

function deserializeRecord(
  id: string,
  value: unknown
): ShadowHistoryRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = {
    id,
    ...(value as Record<string, unknown>),
  };

  return isShadowHistoryRecord(candidate)
    ? candidate
    : null;
}

export class FirestoreShadowHistoryStore
  implements ShadowHistoryStore {
  public readonly collectionName: string;

  public constructor(
    collectionName = getCollectionName()
  ) {
    this.collectionName =
      collectionName;
  }

  public async save(
    record: ShadowHistoryRecord
  ): Promise<void> {
    if (!isPersistenceEnabled()) {
      return;
    }

    await adminDb
      .collection(this.collectionName)
      .doc(record.id)
      .set(
        serializeRecord(record),
        {
          merge: false,
        }
      );
  }

  public async list(
    query: ShadowHistoryQuery = {}
  ): Promise<ShadowHistoryRecord[]> {
    if (!isPersistenceEnabled()) {
      return [];
    }

    const snapshot = await adminDb
      .collection(this.collectionName)
      .orderBy("runAt", "desc")
      .limit(
        Math.max(
          normalizeLimit(query.limit),
          100
        )
      )
      .get();

    const records = snapshot.docs
      .map((document) =>
        deserializeRecord(
          document.id,
          document.data()
        )
      )
      .filter(
        (
          record
        ): record is ShadowHistoryRecord =>
          record !== null
      );

    return filterShadowHistory(
      records,
      {
        ...query,
        limit: normalizeLimit(
          query.limit
        ),
      }
    );
  }

  public async findById(
    id: string
  ): Promise<ShadowHistoryRecord | null> {
    if (!isPersistenceEnabled()) {
      return null;
    }

    const normalizedId = id.trim();

    if (!normalizedId) {
      return null;
    }

    const snapshot = await adminDb
      .collection(this.collectionName)
      .doc(normalizedId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return deserializeRecord(
      snapshot.id,
      snapshot.data()
    );
  }

  public async count(): Promise<number> {
    if (!isPersistenceEnabled()) {
      return 0;
    }

    const snapshot = await adminDb
      .collection(this.collectionName)
      .count()
      .get();

    return snapshot.data().count;
  }
}

export function createFirestoreShadowHistoryStore(
  collectionName?: string
): FirestoreShadowHistoryStore {
  return new FirestoreShadowHistoryStore(
    collectionName
  );
}

export function isFirestoreShadowPersistenceEnabled(): boolean {
  return isPersistenceEnabled();
}