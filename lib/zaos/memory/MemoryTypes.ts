export const ZAOS_MEMORY_TYPES_VERSION = "1.0.0";

export type MemoryScope =
  | "global"
  | "role"
  | "decision"
  | "task";

export type MemoryImportance =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type MemoryOutcome =
  | "success"
  | "failure"
  | "partial"
  | "unknown";

export interface MemoryEvidence {
  id: string;
  type: string;
  source: string;
  summary: string;
}

export interface StrategyChange {
  title: string;
  description: string;
}

export interface ZAOSMemory {
  id: string;

  roleId: string;

  scope: MemoryScope;

  importance: MemoryImportance;

  outcome: MemoryOutcome;

  title: string;

  lesson: string;

  strategyChange?: StrategyChange;

  confidence: number;

  evidence: MemoryEvidence[];

  relatedDecisionId?: string | null;

  relatedTaskId?: string | null;

  metadata: Record<string, unknown>;

  createdAt: string;

  updatedAt: string;
}

export function createMemory(
  input: Omit<
    ZAOSMemory,
    "createdAt" | "updatedAt"
  >
): ZAOSMemory {

  const now = new Date().toISOString();

  return {

    ...input,

    confidence: Math.max(
      0,
      Math.min(100, input.confidence)
    ),

    createdAt: now,

    updatedAt: now,
  };
}

export function isSuccessfulMemory(
  memory: ZAOSMemory
): boolean {

  return memory.outcome === "success";
}

export function isFailureMemory(
  memory: ZAOSMemory
): boolean {

  return memory.outcome === "failure";
}

export function isCriticalMemory(
  memory: ZAOSMemory
): boolean {

  return memory.importance === "critical";
}

export function hasStrategyChange(
  memory: ZAOSMemory
): boolean {

  return !!memory.strategyChange;
}

export function normalizeMemoryConfidence(
  value: unknown
): number {

  const confidence = Number(value);

  if (!Number.isFinite(confidence)) {

    return 0;
  }

  return Math.max(
    0,
    Math.min(100, confidence)
  );
}