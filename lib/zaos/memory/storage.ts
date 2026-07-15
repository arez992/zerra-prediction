import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  ZAOS_SHARED_MEMORY_VERSION,
  type CreateZAOSSharedMemoryInput,
  type ZAOSMemoryAgent,
  type ZAOSMemoryCategory,
  type ZAOSMemoryImportance,
  type ZAOSMemoryQuery,
  type ZAOSMemoryVisibility,
  type ZAOSSharedMemoryRecord,
} from "./types";

const COLLECTION =
  "zaosSharedMemory";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function normalizeLimit(
  value?: number
): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(value!)
    )
  );
}

function normalizeText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeNullableText(
  value: unknown
): string | null {
  const normalized =
    normalizeText(value);

  return normalized || null;
}

function normalizeNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeConfidence(
  value: unknown
): number | null {
  const confidence =
    normalizeNumber(value);

  if (confidence === null) {
    return null;
  }

  return Math.min(
    100,
    Math.max(0, confidence)
  );
}

function normalizeTags(
  values?: string[]
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) =>
          normalizeText(value)
            .toLowerCase()
        )
        .filter(Boolean)
    )
  ).slice(0, 50);
}

function normalizeSharedWith(
  values?: ZAOSMemoryAgent[]
): ZAOSMemoryAgent[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(values)
  );
}

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function isExpired(
  expiresAt: string | null
): boolean {
  if (!expiresAt) {
    return false;
  }

  const timestamp =
    Date.parse(expiresAt);

  return Number.isFinite(timestamp)
    ? timestamp < Date.now()
    : false;
}

function mapDocument(
  id: string,
  data: Record<
    string,
    unknown
  >
): ZAOSSharedMemoryRecord {
  return {
    id,

    version:
      normalizeText(data.version) ||
      ZAOS_SHARED_MEMORY_VERSION,

    agent:
      data.agent as ZAOSMemoryAgent,

    sharedWith:
      Array.isArray(data.sharedWith)
        ? (
            data.sharedWith as ZAOSMemoryAgent[]
          )
        : [],

    visibility:
      (
        data.visibility ||
        "private"
      ) as ZAOSMemoryVisibility,

    category:
      (
        data.category ||
        "learning"
      ) as ZAOSMemoryCategory,

    importance:
      (
        data.importance ||
        "medium"
      ) as ZAOSMemoryImportance,

    title:
      normalizeText(data.title),

    lesson:
      normalizeText(data.lesson),

    recommendationId:
      normalizeNullableText(
        data.recommendationId
      ),

    decisionId:
      normalizeNullableText(
        data.decisionId
      ),

    taskId:
      normalizeNullableText(
        data.taskId
      ),

    success:
      typeof data.success ===
      "boolean"
        ? data.success
        : null,

    confidence:
      normalizeConfidence(
        data.confidence
      ),

    roi:
      normalizeNumber(data.roi),

    before:
      (
        data.before &&
        typeof data.before === "object"
      )
        ? (
            data.before as Record<
              string,
              unknown
            >
          )
        : {},

    after:
      (
        data.after &&
        typeof data.after === "object"
      )
        ? (
            data.after as Record<
              string,
              unknown
            >
          )
        : {},

    evidence:
      (
        data.evidence &&
        typeof data.evidence === "object"
      )
        ? (
            data.evidence as Record<
              string,
              unknown
            >
          )
        : {},

    source:
      normalizeText(data.source) ||
      "unknown",

    tags:
      Array.isArray(data.tags)
        ? (
            data.tags as string[]
          )
        : [],

    requiresHumanReview:
      data.requiresHumanReview ===
      true,

    approvedForSharing:
      data.approvedForSharing ===
      true,

    createdBy:
      normalizeText(
        data.createdBy
      ) || "system",

    createdAt:
      serializeTimestamp(
        data.createdAt
      ) ||
      new Date(0).toISOString(),

    updatedAt:
      serializeTimestamp(
        data.updatedAt
      ) ||
      new Date(0).toISOString(),

    expiresAt:
      serializeTimestamp(
        data.expiresAt
      ) ||
      normalizeNullableText(
        data.expiresAt
      ),
  };
}

function canAgentSeeMemory(
  record: ZAOSSharedMemoryRecord,
  agent: ZAOSMemoryAgent
): boolean {
  if (record.agent === agent) {
    return true;
  }

  if (
    record.visibility ===
    "global"
  ) {
    return (
      record.approvedForSharing ===
      true
    );
  }

  if (
    record.visibility ===
    "shared"
  ) {
    return (
      record.approvedForSharing ===
        true &&
      record.sharedWith.includes(agent)
    );
  }

  return false;
}

export async function saveZAOSSharedMemory(
  input: CreateZAOSSharedMemoryInput
): Promise<ZAOSSharedMemoryRecord> {
  const title =
    normalizeText(input.title);

  const lesson =
    normalizeText(input.lesson);

  const createdBy =
    normalizeText(input.createdBy);

  if (!title) {
    throw new Error(
      "Shared memory title is required"
    );
  }

  if (!lesson) {
    throw new Error(
      "Shared memory lesson is required"
    );
  }

  if (!createdBy) {
    throw new Error(
      "Shared memory creator is required"
    );
  }

  const visibility =
    input.visibility ||
    "private";

  const sharedWith =
    visibility === "shared"
      ? normalizeSharedWith(
          input.sharedWith
        )
      : [];

  const approvedForSharing =
    visibility === "private"
      ? false
      : input.approvedForSharing ===
        true;

  const payload = {
    version:
      ZAOS_SHARED_MEMORY_VERSION,

    agent:
      input.agent,

    sharedWith,

    visibility,

    category:
      input.category,

    importance:
      input.importance ||
      "medium",

    title,
    lesson,

    recommendationId:
      normalizeNullableText(
        input.recommendationId
      ),

    decisionId:
      normalizeNullableText(
        input.decisionId
      ),

    taskId:
      normalizeNullableText(
        input.taskId
      ),

    success:
      typeof input.success ===
      "boolean"
        ? input.success
        : null,

    confidence:
      normalizeConfidence(
        input.confidence
      ),

    roi:
      normalizeNumber(
        input.roi
      ),

    before:
      input.before || {},

    after:
      input.after || {},

    evidence:
      input.evidence || {},

    source:
      normalizeText(
        input.source
      ) || "zaos",

    tags:
      normalizeTags(
        input.tags
      ),

    requiresHumanReview:
      input.requiresHumanReview ===
      true,

    approvedForSharing,

    createdBy,

    createdAt:
      FieldValue.serverTimestamp(),

    updatedAt:
      FieldValue.serverTimestamp(),

    expiresAt:
      normalizeNullableText(
        input.expiresAt
      ),
  };

  const document =
    await adminDb
      .collection(COLLECTION)
      .add(payload);

  const now =
    new Date().toISOString();

  return {
    id: document.id,
    ...payload,
    createdAt: now,
    updatedAt: now,
  } as ZAOSSharedMemoryRecord;
}

export async function getZAOSSharedMemoryById(
  id: string
): Promise<
  ZAOSSharedMemoryRecord | null
> {
  const memoryId =
    normalizeText(id);

  if (!memoryId) {
    return null;
  }

  const document =
    await adminDb
      .collection(COLLECTION)
      .doc(memoryId)
      .get();

  if (!document.exists) {
    return null;
  }

  const record =
    mapDocument(
      document.id,
      document.data() || {}
    );

  return isExpired(
    record.expiresAt
  )
    ? null
    : record;
}

export async function getRecentZAOSSharedMemory(
  limit = DEFAULT_LIMIT
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  const snapshot =
    await adminDb
      .collection(COLLECTION)
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(
        normalizeLimit(limit)
      )
      .get();

  return snapshot.docs
    .map((document) =>
      mapDocument(
        document.id,
        document.data()
      )
    )
    .filter(
      (record) =>
        !isExpired(
          record.expiresAt
        )
    );
}

export async function queryZAOSSharedMemory(
  query: ZAOSMemoryQuery = {}
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  /*
   * Read a bounded recent window, then apply filters in memory.
   * This avoids requiring many Firestore composite indexes while
   * the shared-memory model is still evolving.
   */
  const recent =
    await getRecentZAOSSharedMemory(
      MAX_LIMIT
    );

  const filtered =
    recent.filter((record) => {
      if (
        query.agent &&
        record.agent !==
          query.agent
      ) {
        return false;
      }

      if (
        query.visibleTo &&
        !canAgentSeeMemory(
          record,
          query.visibleTo
        )
      ) {
        return false;
      }

      if (
        query.visibility &&
        record.visibility !==
          query.visibility
      ) {
        return false;
      }

      if (
        query.category &&
        record.category !==
          query.category
      ) {
        return false;
      }

      if (
        query.importance &&
        record.importance !==
          query.importance
      ) {
        return false;
      }

      if (
        query.recommendationId &&
        record.recommendationId !==
          query.recommendationId
      ) {
        return false;
      }

      if (
        query.decisionId &&
        record.decisionId !==
          query.decisionId
      ) {
        return false;
      }

      if (
        query.taskId &&
        record.taskId !==
          query.taskId
      ) {
        return false;
      }

      if (
        query.tag &&
        !record.tags.includes(
          query.tag
            .trim()
            .toLowerCase()
        )
      ) {
        return false;
      }

      return true;
    });

  return filtered.slice(
    0,
    normalizeLimit(
      query.limit
    )
  );
}

export async function getMemoryVisibleToAgent(
  agent: ZAOSMemoryAgent,
  limit = DEFAULT_LIMIT
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  return queryZAOSSharedMemory({
    visibleTo: agent,
    limit,
  });
}

export async function getAgentOwnMemory(
  agent: ZAOSMemoryAgent,
  limit = DEFAULT_LIMIT
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  return queryZAOSSharedMemory({
    agent,
    limit,
  });
}

export async function approveZAOSMemorySharing(
  memoryId: string,
  approvedBy: string
): Promise<void> {
  const id =
    normalizeText(memoryId);

  const approver =
    normalizeText(approvedBy);

  if (!id) {
    throw new Error(
      "Shared memory ID is required"
    );
  }

  if (!approver) {
    throw new Error(
      "Sharing approver is required"
    );
  }

  await adminDb
    .collection(COLLECTION)
    .doc(id)
    .update({
      approvedForSharing: true,
      sharingApprovedBy:
        approver,
      sharingApprovedAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),
    });
}

export async function revokeZAOSMemorySharing(
  memoryId: string,
  revokedBy: string
): Promise<void> {
  const id =
    normalizeText(memoryId);

  const revoker =
    normalizeText(revokedBy);

  if (!id) {
    throw new Error(
      "Shared memory ID is required"
    );
  }

  if (!revoker) {
    throw new Error(
      "Sharing revoker is required"
    );
  }

  await adminDb
    .collection(COLLECTION)
    .doc(id)
    .update({
      approvedForSharing: false,
      sharingRevokedBy:
        revoker,
      sharingRevokedAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),
    });
}