import "server-only";

import type {
  ExecutionHandler,
} from "../types";

export const executionPlanExecutor:
  ExecutionHandler =
  async ({
    executionType,
    payload,
    recommendationId,
  }) => {
    return {
      success: true,
      completed: true,
      message:
        `Execution plan created for ${executionType}. ` +
        "A specialized executor will perform the final publishing or external action.",

      data: {
        recommendationId,
        executionType,
        payload,

        planCreated: true,

        requiresSpecializedExecutor:
          true,

        finalExternalActionExecuted:
          false,
      },
    };
  };