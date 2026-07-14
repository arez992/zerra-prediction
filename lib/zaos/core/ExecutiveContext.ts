export const ZAOS_EXECUTIVE_CONTEXT_VERSION = "1.0.0";

export type ExecutiveEnvironment =
  | "development"
  | "preview"
  | "production"
  | "test";

export type ExecutiveRequestSource =
  | "owner"
  | "admin"
  | "scheduler"
  | "event"
  | "api"
  | "system";

export type ExecutivePermission =
  | "read_metrics"
  | "generate_recommendations"
  | "generate_decisions"
  | "approve_low_risk"
  | "delegate_tasks"
  | "execute_internal_tasks"
  | "verify_results"
  | "write_memory"
  | "generate_reports";

export type ExecutiveObjective = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  targetKpis: string[];
  deadline: string | null;
};

export type ExecutiveActor = {
  id: string;
  name: string;
  type:
    | "owner"
    | "admin"
    | "ceo"
    | "director"
    | "worker"
    | "system";
};

export type ExecutiveContext = {
  version: string;

  runId: string;
  traceId: string;
  parentRunId: string | null;

  roleId: string;
  roleName: string;
  roleLevel: "ceo" | "director" | "worker";

  requestedBy: ExecutiveActor;
  requestSource: ExecutiveRequestSource;

  environment: ExecutiveEnvironment;

  instruction: string | null;
  objective: ExecutiveObjective | null;

  permissions: ExecutivePermission[];

  startedAt: string;
  expiresAt: string | null;

  metadata: Record<string, unknown>;
};

export type CreateExecutiveContextInput = {
  roleId: string;
  roleName: string;
  roleLevel: "ceo" | "director" | "worker";

  requestedBy: ExecutiveActor;
  requestSource: ExecutiveRequestSource;

  environment?: ExecutiveEnvironment;

  instruction?: string | null;
  objective?: ExecutiveObjective | null;

  permissions?: ExecutivePermission[];

  parentRunId?: string | null;
  expiresAt?: string | null;

  metadata?: Record<string, unknown>;
};

export function createExecutiveContext(
  input: CreateExecutiveContextInput
): ExecutiveContext {
  const now = new Date().toISOString();

  return {
    version: ZAOS_EXECUTIVE_CONTEXT_VERSION,

    runId: crypto.randomUUID(),
    traceId: crypto.randomUUID(),
    parentRunId: input.parentRunId ?? null,

    roleId: input.roleId,
    roleName: input.roleName,
    roleLevel: input.roleLevel,

    requestedBy: input.requestedBy,
    requestSource: input.requestSource,

    environment: input.environment ?? "production",

    instruction: input.instruction ?? null,
    objective: input.objective ?? null,

    permissions: input.permissions ?? [],

    startedAt: now,
    expiresAt: input.expiresAt ?? null,

    metadata: input.metadata ?? {},
  };
}

export function createChildExecutiveContext(
  parent: ExecutiveContext,
  input: Omit<
    CreateExecutiveContextInput,
    | "requestedBy"
    | "requestSource"
    | "environment"
    | "parentRunId"
  > & {
    requestedBy?: ExecutiveActor;
    requestSource?: ExecutiveRequestSource;
    environment?: ExecutiveEnvironment;
  }
): ExecutiveContext {
  return {
    ...createExecutiveContext({
      ...input,
      requestedBy:
        input.requestedBy ?? {
          id: parent.roleId,
          name: parent.roleName,
          type: parent.roleLevel,
        },
      requestSource:
        input.requestSource ?? "system",
      environment:
        input.environment ?? parent.environment,
      parentRunId: parent.runId,
    }),
    traceId: parent.traceId,
  };
}

export function hasExecutivePermission(
  context: ExecutiveContext,
  permission: ExecutivePermission
): boolean {
  return context.permissions.includes(permission);
}

export function assertExecutivePermission(
  context: ExecutiveContext,
  permission: ExecutivePermission
): void {
  if (!hasExecutivePermission(context, permission)) {
    throw new Error(
      `ZAOS permission denied: ${context.roleId} cannot ${permission}`
    );
  }
}

export function isExecutiveContextExpired(
  context: ExecutiveContext
): boolean {
  if (!context.expiresAt) {
    return false;
  }

  const expiry = new Date(context.expiresAt).getTime();

  return Number.isFinite(expiry) && expiry <= Date.now();
}

export function assertActiveExecutiveContext(
  context: ExecutiveContext
): void {
  if (isExecutiveContextExpired(context)) {
    throw new Error(
      `ZAOS executive context expired: ${context.runId}`
    );
  }
}

export function withExecutiveMetadata(
  context: ExecutiveContext,
  metadata: Record<string, unknown>
): ExecutiveContext {
  return {
    ...context,
    metadata: {
      ...context.metadata,
      ...metadata,
    },
  };
}

export function withExecutiveInstruction(
  context: ExecutiveContext,
  instruction: string | null
): ExecutiveContext {
  return {
    ...context,
    instruction,
  };
}

export function withExecutiveObjective(
  context: ExecutiveContext,
  objective: ExecutiveObjective | null
): ExecutiveContext {
  return {
    ...context,
    objective,
  };
}

export function isExecutiveContext(
  value: unknown
): value is ExecutiveContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ExecutiveContext>;

  return (
    typeof candidate.version === "string" &&
    typeof candidate.runId === "string" &&
    typeof candidate.traceId === "string" &&
    typeof candidate.roleId === "string" &&
    typeof candidate.roleName === "string" &&
    (
      candidate.roleLevel === "ceo" ||
      candidate.roleLevel === "director" ||
      candidate.roleLevel === "worker"
    ) &&
    typeof candidate.startedAt === "string" &&
    Array.isArray(candidate.permissions) &&
    !!candidate.requestedBy &&
    typeof candidate.requestedBy === "object"
  );
}
