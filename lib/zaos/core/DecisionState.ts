export const ZAOS_DECISION_STATE_VERSION = "1.0.0";

export const DECISION_STATES = [
  "draft",
  "generated",
  "policy_review",
  "approved",
  "rejected",
  "queued",
  "executing",
  "completed",
  "failed",
  "verified",
  "learned",
  "archived",
] as const;

export type DecisionState =
  (typeof DECISION_STATES)[number];

export type DecisionTransition = {
  from: DecisionState;
  to: DecisionState;
};

const ALLOWED_TRANSITIONS: Readonly<
  Record<DecisionState, readonly DecisionState[]>
> = {
  draft: ["generated", "archived"],

  generated: [
    "policy_review",
    "rejected",
    "archived",
  ],

  policy_review: [
    "approved",
    "rejected",
    "archived",
  ],

  approved: [
    "queued",
    "rejected",
    "archived",
  ],

  rejected: ["archived"],

  queued: [
    "executing",
    "failed",
    "archived",
  ],

  executing: [
    "completed",
    "failed",
  ],

  completed: [
    "verified",
    "failed",
  ],

  failed: [
    "queued",
    "archived",
  ],

  verified: [
    "learned",
    "archived",
  ],

  learned: ["archived"],

  archived: [],
};

const FINAL_STATES: ReadonlySet<DecisionState> =
  new Set([
    "rejected",
    "learned",
    "archived",
  ]);

const SUCCESS_STATES: ReadonlySet<DecisionState> =
  new Set([
    "completed",
    "verified",
    "learned",
  ]);

const FAILURE_STATES: ReadonlySet<DecisionState> =
  new Set([
    "rejected",
    "failed",
  ]);

const PENDING_STATES: ReadonlySet<DecisionState> =
  new Set([
    "draft",
    "generated",
    "policy_review",
    "approved",
    "queued",
    "executing",
  ]);

export function isDecisionState(
  value: unknown
): value is DecisionState {
  return (
    typeof value === "string" &&
    DECISION_STATES.includes(
      value as DecisionState
    )
  );
}

export function canTransition(
  from: DecisionState,
  to: DecisionState
): boolean {
  return ALLOWED_TRANSITIONS[
    from
  ].includes(to);
}

export function getNextStates(
  state: DecisionState
): readonly DecisionState[] {
  return ALLOWED_TRANSITIONS[
    state
  ];
}

export function isFinalState(
  state: DecisionState
): boolean {
  return FINAL_STATES.has(state);
}

export function isSuccessfulState(
  state: DecisionState
): boolean {
  return SUCCESS_STATES.has(state);
}

export function isFailureState(
  state: DecisionState
): boolean {
  return FAILURE_STATES.has(state);
}

export function isPendingState(
  state: DecisionState
): boolean {
  return PENDING_STATES.has(state);
}

export function assertValidTransition(
  from: DecisionState,
  to: DecisionState
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid ZAOS decision transition: ${from} -> ${to}`
    );
  }
}

export function createTransition(
  from: DecisionState,
  to: DecisionState
): DecisionTransition {
  assertValidTransition(from, to);

  return {
    from,
    to,
  };
}

export function getTransitionPath(
  from: DecisionState,
  to: DecisionState
): DecisionState[] | null {
  if (from === to) {
    return [from];
  }

  const queue: Array<{
    state: DecisionState;
    path: DecisionState[];
  }> = [
    {
      state: from,
      path: [from],
    },
  ];

  const visited =
    new Set<DecisionState>([from]);

  while (queue.length > 0) {
    const current =
      queue.shift();

    if (!current) {
      break;
    }

    for (const next of getNextStates(
      current.state
    )) {
      if (visited.has(next)) {
        continue;
      }

      const path = [
        ...current.path,
        next,
      ];

      if (next === to) {
        return path;
      }

      visited.add(next);

      queue.push({
        state: next,
        path,
      });
    }
  }

  return null;
}

export function canEventuallyReach(
  from: DecisionState,
  to: DecisionState
): boolean {
  return (
    getTransitionPath(from, to) !==
    null
  );
}

export function getDecisionStateLabel(
  state: DecisionState
): string {
  const labels: Record<
    DecisionState,
    string
  > = {
    draft: "Draft",
    generated: "Generated",
    policy_review: "Policy Review",
    approved: "Approved",
    rejected: "Rejected",
    queued: "Queued",
    executing: "Executing",
    completed: "Completed",
    failed: "Failed",
    verified: "Verified",
    learned: "Learned",
    archived: "Archived",
  };

  return labels[state];
}

export function getDecisionProgress(
  state: DecisionState
): number {
  const progress: Record<
    DecisionState,
    number
  > = {
    draft: 0,
    generated: 10,
    policy_review: 20,
    approved: 35,
    rejected: 100,
    queued: 50,
    executing: 65,
    completed: 80,
    failed: 100,
    verified: 90,
    learned: 100,
    archived: 100,
  };

  return progress[state];
}
