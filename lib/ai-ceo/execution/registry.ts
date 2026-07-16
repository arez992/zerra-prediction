import "server-only";

import {
  executionPlanExecutor,
} from "./executors/executionPlanExecutor";

import {
  paymentAuditExecutor,
} from "./executors/paymentAuditExecutor";

import type {
  ExecutionContext,
  ExecutionHandlerRegistration,
  ExecutionRegistry,
  ExecutionResult,
} from "./types";

const registrations:
  ExecutionHandlerRegistration[] = [
  {
    executionType:
      "payment-audit",

    handler:
      paymentAuditExecutor,

    department:
      "payments",

    description:
      "Audit payment records and calculate payment success and failure rates.",

    requiresApproval:
      true,

    producesFinalAction:
      true,
  },

  {
    executionType:
      "vip-conversion-review",

    handler:
      executionPlanExecutor,

    department:
      "growth",

    description:
      "Create a controlled review plan for VIP conversion performance.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "registration-funnel-review",

    handler:
      executionPlanExecutor,

    department:
      "growth",

    description:
      "Create a review plan for the registration funnel.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "seo-metadata-optimization",

    handler:
      executionPlanExecutor,

    department:
      "seo",

    description:
      "Create a safe SEO metadata optimization plan.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "create-country-landing-page",

    handler:
      executionPlanExecutor,

    department:
      "seo",

    description:
      "Create a reviewed execution plan for a country landing page.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "create-seo-content-cluster",

    handler:
      executionPlanExecutor,

    department:
      "seo",

    description:
      "Create a reviewed SEO content cluster plan.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "growth-foundation-plan",

    handler:
      executionPlanExecutor,

    department:
      "growth",

    description:
      "Create a controlled growth foundation plan.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "controlled-user-acquisition",

    handler:
      executionPlanExecutor,

    department:
      "growth",

    description:
      "Create a controlled user acquisition execution plan.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "prediction-model-review",

    handler:
      executionPlanExecutor,

    department:
      "prediction",

    description:
      "Create a safe prediction model review plan without changing production models.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "prediction-review",

    handler:
      executionPlanExecutor,

    department:
      "prediction",

    description:
      "Create a reviewed plan for prediction publishing and quality checks.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },

  {
    executionType:
      "marketing-review",

    handler:
      executionPlanExecutor,

    department:
      "marketing",

    description:
      "Create a safe marketing review plan without automatically pausing campaigns.",

    requiresApproval:
      true,

    producesFinalAction:
      false,
  },
];

function buildRegistry(
  items:
    ExecutionHandlerRegistration[]
): ExecutionRegistry {
  const registry:
    ExecutionRegistry =
    new Map();

  for (const item of items) {
    const executionType =
      item.executionType
        .trim()
        .toLowerCase();

    if (!executionType) {
      throw new Error(
        "Execution type is required for registry registration."
      );
    }

    if (
      registry.has(
        executionType
      )
    ) {
      throw new Error(
        `Duplicate execution handler registration: ${executionType}`
      );
    }

    registry.set(
      executionType,
      {
        ...item,
        executionType,
      }
    );
  }

  return registry;
}

const executionRegistry =
  buildRegistry(
    registrations
  );

export function getExecutionRegistration(
  executionType:
    | string
    | null
    | undefined
):
  | ExecutionHandlerRegistration
  | null {
  if (!executionType) {
    return null;
  }

  const normalized =
    executionType
      .trim()
      .toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    executionRegistry.get(
      normalized
    ) || null
  );
}

export function hasExecutionHandler(
  executionType:
    | string
    | null
    | undefined
): boolean {
  return (
    getExecutionRegistration(
      executionType
    ) !== null
  );
}

export function listExecutionHandlers():
  ExecutionHandlerRegistration[] {
  return Array.from(
    executionRegistry.values()
  );
}

export async function executeRegisteredHandler(
  context: ExecutionContext
): Promise<ExecutionResult> {
  const registration =
    getExecutionRegistration(
      context.executionType
    );

  if (!registration) {
    return {
      success: false,
      completed: false,

      message:
        "No execution handler has been registered for this recommendation yet.",

      data: {
        recommendationId:
          context.recommendationId,

        executionType:
          context.executionType,

        payload:
          context.payload,

        handlerRegistered:
          false,
      },
    };
  }

  try {
    const result =
      await registration.handler(
        context
      );

    return {
      ...result,

      data: {
        ...(result.data ||
          {}),

        handlerRegistered:
          true,

        handlerDepartment:
          registration.department,

        producesFinalAction:
          registration
            .producesFinalAction,

        requiresApproval:
          registration
            .requiresApproval,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Execution handler failed.";

    return {
      success: false,
      completed: false,

      message,

      data: {
        recommendationId:
          context.recommendationId,

        executionType:
          context.executionType,

        handlerRegistered:
          true,

        handlerDepartment:
          registration.department,

        handlerError:
          message,
      },
    };
  }
}