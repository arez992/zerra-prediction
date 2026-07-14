import {
  DecisionState,
  canTransition,
  assertValidTransition,
} from "./DecisionState";

export const ZAOS_DECISION_LIFECYCLE_VERSION = "1.0.0";

export type DecisionActorType =
  | "owner"
  | "ceo"
  | "director"
  | "worker"
  | "system"
  | "policy";

export interface DecisionActor {
  id: string;
  name: string;
  type: DecisionActorType;
}

export interface DecisionTransitionRecord {
  id: string;
  decisionId: string;

  from: DecisionState;
  to: DecisionState;

  actor: DecisionActor;

  reason?: string;

  metadata?: Record<string, unknown>;

  createdAt: string;
}

export interface DecisionLifecycle {
  decisionId: string;

  currentState: DecisionState;

  createdAt: string;

  updatedAt: string;

  history: DecisionTransitionRecord[];
}

export function createDecisionLifecycle(
  decisionId: string
): DecisionLifecycle {
  const now = new Date().toISOString();

  return {
    decisionId,
    currentState: "draft",
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}

export function addTransition(
  lifecycle: DecisionLifecycle,
  input: {
    to: DecisionState;
    actor: DecisionActor;
    reason?: string;
    metadata?: Record<string, unknown>;
  }
): DecisionLifecycle {
  assertValidTransition(
    lifecycle.currentState,
    input.to
  );

  const now = new Date().toISOString();

  const transition: DecisionTransitionRecord = {
    id: crypto.randomUUID(),
    decisionId: lifecycle.decisionId,

    from: lifecycle.currentState,
    to: input.to,

    actor: input.actor,

    reason: input.reason,

    metadata: input.metadata,

    createdAt: now,
  };

  return {
    ...lifecycle,

    currentState: input.to,

    updatedAt: now,

    history: [
      ...lifecycle.history,
      transition,
    ],
  };
}

export function getCurrentState(
  lifecycle: DecisionLifecycle
): DecisionState {
  return lifecycle.currentState;
}

export function getHistory(
  lifecycle: DecisionLifecycle
): DecisionTransitionRecord[] {
  return lifecycle.history;
}

export function canMoveTo(
  lifecycle: DecisionLifecycle,
  next: DecisionState
): boolean {
  return canTransition(
    lifecycle.currentState,
    next
  );
}

export function getLastTransition(
  lifecycle: DecisionLifecycle
): DecisionTransitionRecord | null {
  if (lifecycle.history.length === 0) {
    return null;
  }

  return lifecycle.history[
    lifecycle.history.length - 1
  ];
}

export function hasVisitedState(
  lifecycle: DecisionLifecycle,
  state: DecisionState
): boolean {
  if (lifecycle.currentState === state) {
    return true;
  }

  return lifecycle.history.some(
    (transition) => transition.to === state
  );
}

export function getTransitionCount(
  lifecycle: DecisionLifecycle
): number {
  return lifecycle.history.length;
}

export function resetLifecycle(
  decisionId: string
): DecisionLifecycle {
  return createDecisionLifecycle(
    decisionId
  );
}