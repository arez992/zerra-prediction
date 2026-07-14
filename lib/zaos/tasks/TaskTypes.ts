export const ZAOS_TASK_TYPES_VERSION = "1.0.0";

export type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type TaskStatus =
  | "created"
  | "queued"
  | "assigned"
  | "in_progress"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskRoleLevel =
  | "ceo"
  | "director"
  | "worker";

export interface TaskActor {
  id: string;
  name: string;
  level: TaskRoleLevel;
}

export interface TaskAssignment {
  assignedBy: TaskActor;
  assignedTo: TaskActor;

  assignedAt: string;

  acceptedAt?: string;
}

export interface TaskExecutionResult {
  success: boolean;

  summary: string;

  output?: Record<string, unknown>;

  durationMs?: number;

  finishedAt?: string;
}

export interface ZAOSTask {

  id: string;

  parentTaskId?: string | null;

  decisionId?: string | null;

  title: string;

  description: string;

  priority: TaskPriority;

  status: TaskStatus;

  assignment: TaskAssignment;

  payload: Record<string, unknown>;

  result?: TaskExecutionResult;

  retryCount: number;

  maxRetries: number;

  deadline?: string | null;

  createdAt: string;

  updatedAt: string;
}

export function createTask(
  input: Omit<
    ZAOSTask,
    | "createdAt"
    | "updatedAt"
  >
): ZAOSTask {

  const now = new Date().toISOString();

  return {

    ...input,

    createdAt: now,

    updatedAt: now,
  };
}

export function isTaskFinished(
  task: ZAOSTask
): boolean {

  return (
    task.status === "completed" ||
    task.status === "failed" ||
    task.status === "cancelled"
  );
}

export function canRetryTask(
  task: ZAOSTask
): boolean {

  return (
    task.status === "failed" &&
    task.retryCount < task.maxRetries
  );
}

export function markTaskCompleted(
  task: ZAOSTask,
  result: TaskExecutionResult
): ZAOSTask {

  return {

    ...task,

    status: "completed",

    result,

    updatedAt: new Date().toISOString(),
  };
}

export function markTaskFailed(
  task: ZAOSTask,
  summary: string
): ZAOSTask {

  return {

    ...task,

    status: "failed",

    retryCount: task.retryCount + 1,

    result: {

      success: false,

      summary,

      finishedAt: new Date().toISOString(),
    },

    updatedAt: new Date().toISOString(),
  };
}