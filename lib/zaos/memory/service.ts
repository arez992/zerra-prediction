import "server-only";

import {
  approveZAOSMemorySharing,
  getAgentOwnMemory,
  getMemoryVisibleToAgent,
  getRecentZAOSSharedMemory,
  getZAOSSharedMemoryById,
  queryZAOSSharedMemory,
  revokeZAOSMemorySharing,
  saveZAOSSharedMemory,
} from "./storage";

import type {
  CreateZAOSSharedMemoryInput,
  ZAOSMemoryAgent,
  ZAOSMemoryQuery,
  ZAOSSharedMemoryRecord,
} from "./types";

export type SharedMemoryWriteResult = {
  success: boolean;
  record: ZAOSSharedMemoryRecord | null;
  error: string | null;
};

export type SharedMemoryActionResult = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unable to complete ZAOS shared memory operation.";
}

function normalizeLimit(
  value: number | undefined,
  fallback = 25
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    100,
    Math.max(
      1,
      Math.floor(value!)
    )
  );
}

function validateSharedMemoryInput(
  input: CreateZAOSSharedMemoryInput
): void {
  if (!input.agent) {
    throw new Error(
      "Shared memory agent is required"
    );
  }

  if (!input.category) {
    throw new Error(
      "Shared memory category is required"
    );
  }

  if (!input.title?.trim()) {
    throw new Error(
      "Shared memory title is required"
    );
  }

  if (!input.lesson?.trim()) {
    throw new Error(
      "Shared memory lesson is required"
    );
  }

  if (!input.createdBy?.trim()) {
    throw new Error(
      "Shared memory creator is required"
    );
  }

  if (
    input.visibility === "shared" &&
    (!input.sharedWith ||
      input.sharedWith.length === 0)
  ) {
    throw new Error(
      "Shared memory requires at least one target agent"
    );
  }

  if (
    input.visibility === "private" &&
    input.approvedForSharing === true
  ) {
    throw new Error(
      "Private memory cannot be approved for sharing"
    );
  }
}

async function record(
  input: CreateZAOSSharedMemoryInput
): Promise<SharedMemoryWriteResult> {
  try {
    validateSharedMemoryInput(
      input
    );

    const record =
      await saveZAOSSharedMemory(
        input
      );

    return {
      success: true,
      record,
      error: null,
    };
  } catch (error) {
    const message =
      getErrorMessage(error);

    console.error(
      "[ZAOS_SHARED_MEMORY_RECORD_ERROR]",
      {
        agent:
          input.agent,
        category:
          input.category,
        recommendationId:
          input.recommendationId ??
          null,
        error: message,
      }
    );

    return {
      success: false,
      record: null,
      error: message,
    };
  }
}

async function getById(
  memoryId: string
): Promise<
  ZAOSSharedMemoryRecord | null
> {
  return getZAOSSharedMemoryById(
    memoryId
  );
}

async function recent(
  limit = 25
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  return getRecentZAOSSharedMemory(
    normalizeLimit(limit)
  );
}

async function query(
  options: ZAOSMemoryQuery = {}
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  return queryZAOSSharedMemory({
    ...options,
    limit:
      normalizeLimit(
        options.limit
      ),
  });
}

async function own(
  agent: ZAOSMemoryAgent,
  limit = 25
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  return getAgentOwnMemory(
    agent,
    normalizeLimit(limit)
  );
}

async function visibleTo(
  agent: ZAOSMemoryAgent,
  limit = 25
): Promise<
  ZAOSSharedMemoryRecord[]
> {
  return getMemoryVisibleToAgent(
    agent,
    normalizeLimit(limit)
  );
}

async function approveSharing(
  memoryId: string,
  approvedBy: string
): Promise<SharedMemoryActionResult> {
  try {
    await approveZAOSMemorySharing(
      memoryId,
      approvedBy
    );

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    const message =
      getErrorMessage(error);

    console.error(
      "[ZAOS_SHARED_MEMORY_APPROVAL_ERROR]",
      {
        memoryId,
        approvedBy,
        error: message,
      }
    );

    return {
      success: false,
      error: message,
    };
  }
}

async function revokeSharing(
  memoryId: string,
  revokedBy: string
): Promise<SharedMemoryActionResult> {
  try {
    await revokeZAOSMemorySharing(
      memoryId,
      revokedBy
    );

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    const message =
      getErrorMessage(error);

    console.error(
      "[ZAOS_SHARED_MEMORY_REVOKE_ERROR]",
      {
        memoryId,
        revokedBy,
        error: message,
      }
    );

    return {
      success: false,
      error: message,
    };
  }
}

export const sharedMemoryService = {
  record,
  getById,
  recent,
  query,
  own,
  visibleTo,
  approveSharing,
  revokeSharing,
} as const;

export type SharedMemoryService =
  typeof sharedMemoryService;