import {
  ZAOSTask,
  TaskStatus,
  TaskExecutionResult,
} from "./TaskTypes";

export const ZAOS_TASK_ENGINE_VERSION = "1.0.0";

const VALID_TRANSITIONS: Record<
  TaskStatus,
  TaskStatus[]
> = {
  created: ["queued", "cancelled"],

  queued: [
    "assigned",
    "cancelled",
  ],

  assigned: [
    "in_progress",
    "blocked",
    "cancelled",
  ],

  in_progress: [
    "completed",
    "failed",
    "blocked",
  ],

  blocked: [
    "assigned",
    "cancelled",
  ],

  completed: [],

  failed: [
    "queued",
    "cancelled",
  ],

  cancelled: [],
};

export function canTransitionTask(
  from: TaskStatus,
  to: TaskStatus
): boolean {
  return VALID_TRANSITIONS[from].includes(
    to
  );
}

export function transitionTask(
  task: ZAOSTask,
  next: TaskStatus
): ZAOSTask {
  if (
    !canTransitionTask(
      task.status,
      next
    )
  ) {
    throw new Error(
      `Invalid task transition: ${task.status} -> ${next}`
    );
  }

  return {
    ...task,
    status: next,
    updatedAt: new Date().toISOString(),
  };
}

export function queueTask(
  task: ZAOSTask
): ZAOSTask {
  return transitionTask(
    task,
    "queued"
  );
}

export function assignTask(
  task: ZAOSTask
): ZAOSTask {
  return transitionTask(
    task,
    "assigned"
  );
}

export function startTask(
  task: ZAOSTask
): ZAOSTask {
  return transitionTask(
    task,
    "in_progress"
  );
}

export function blockTask(
  task: ZAOSTask
): ZAOSTask {
  return transitionTask(
    task,
    "blocked"
  );
}

export function cancelTask(
  task: ZAOSTask
): ZAOSTask {
  return transitionTask(
    task,
    "cancelled"
  );
}

export function completeTask(
  task: ZAOSTask,
  result: TaskExecutionResult
): ZAOSTask {
  const updated = transitionTask(
    task,
    "completed"
  );

  return {
    ...updated,
    result,
  };
}

export function failTask(
  task: ZAOSTask,
  summary: string
): ZAOSTask {
  const updated = transitionTask(
    task,
    "failed"
  );

  return {
    ...updated,

    retryCount:
      task.retryCount + 1,

    result: {
      success: false,
      summary,
      finishedAt:
        new Date().toISOString(),
    },
  };
}

export function retryTask(
  task: ZAOSTask
): ZAOSTask {
  if (
    task.retryCount >=
    task.maxRetries
  ) {
    throw new Error(
      "Maximum retries exceeded."
    );
  }

  return transitionTask(
    task,
    "queued"
  );
}

export function isTaskExecutable(
  task: ZAOSTask
): boolean {
  return (
    task.status ===
    "assigned"
  );
}

export function isTaskFinished(
  task: ZAOSTask
): boolean {
  return (
    task.status ===
      "completed" ||
    task.status ===
      "failed" ||
    task.status ===
      "cancelled"
  );
}