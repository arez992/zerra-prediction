import {
  ZAOSMemory,
  MemoryImportance,
  createMemory,
  isCriticalMemory,
} from "./MemoryTypes";

export const ZAOS_MEMORY_ENGINE_VERSION = "1.0.0";

export function addMemory(
  memories: ZAOSMemory[],
  memory: ZAOSMemory
): ZAOSMemory[] {
  return [...memories, memory];
}

export function createAndStoreMemory(
  memories: ZAOSMemory[],
  input: Omit<
    ZAOSMemory,
    "createdAt" | "updatedAt"
  >
): ZAOSMemory[] {
  return addMemory(
    memories,
    createMemory(input)
  );
}

export function updateMemory(
  memories: ZAOSMemory[],
  memoryId: string,
  updater: (
    memory: ZAOSMemory
  ) => ZAOSMemory
): ZAOSMemory[] {
  return memories.map((memory) =>
    memory.id === memoryId
      ? {
          ...updater(memory),
          updatedAt:
            new Date().toISOString(),
        }
      : memory
  );
}

export function removeMemory(
  memories: ZAOSMemory[],
  memoryId: string
): ZAOSMemory[] {
  return memories.filter(
    (memory) => memory.id !== memoryId
  );
}

export function findMemoryById(
  memories: ZAOSMemory[],
  memoryId: string
): ZAOSMemory | undefined {
  return memories.find(
    (memory) => memory.id === memoryId
  );
}

export function searchMemories(
  memories: ZAOSMemory[],
  keyword: string
): ZAOSMemory[] {
  const search = keyword.toLowerCase();

  return memories.filter(
    (memory) =>
      memory.title
        .toLowerCase()
        .includes(search) ||
      memory.lesson
        .toLowerCase()
        .includes(search)
  );
}

export function getCriticalMemories(
  memories: ZAOSMemory[]
): ZAOSMemory[] {
  return memories.filter(
    isCriticalMemory
  );
}

export function getTopConfidenceMemories(
  memories: ZAOSMemory[],
  limit = 10
): ZAOSMemory[] {
  return [...memories]
    .sort(
      (a, b) =>
        b.confidence -
        a.confidence
    )
    .slice(0, limit);
}

export function getMemoriesByImportance(
  memories: ZAOSMemory[],
  importance: MemoryImportance
): ZAOSMemory[] {
  return memories.filter(
    (memory) =>
      memory.importance ===
      importance
  );
}

export function mergeDuplicateMemories(
  memories: ZAOSMemory[]
): ZAOSMemory[] {
  const seen = new Map<
    string,
    ZAOSMemory
  >();

  for (const memory of memories) {
    const key =
      memory.title.toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, memory);
      continue;
    }

    const existing =
      seen.get(key)!;

    if (
      memory.confidence >
      existing.confidence
    ) {
      seen.set(key, memory);
    }
  }

  return [...seen.values()];
}

export function archiveOldMemories(
  memories: ZAOSMemory[],
  beforeDate: string
): ZAOSMemory[] {
  const cutoff =
    new Date(beforeDate).getTime();

  return memories.filter(
    (memory) =>
      new Date(
        memory.createdAt
      ).getTime() >= cutoff
  );
}

export function summarizeMemoryHealth(
  memories: ZAOSMemory[]
) {
  return {
    total: memories.length,

    critical:
      getCriticalMemories(
        memories
      ).length,

    highConfidence:
      memories.filter(
        (m) =>
          m.confidence >= 80
      ).length,

    duplicateFree:
      mergeDuplicateMemories(
        memories
      ).length ===
      memories.length,
  };
}