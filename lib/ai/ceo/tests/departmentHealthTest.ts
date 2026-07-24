import "server-only";

import {
  collectAICEOData,
} from "@/lib/ai-ceo/dataCollector";

import {
  executeRegisteredHandler,
  getExecutionRegistration,
} from "@/lib/ai-ceo/execution/registry";

type DepartmentName =
  | "prediction"
  | "seo"
  | "growth"
  | "marketing"
  | "payments";

type DepartmentHealthStatus =
  | "pass"
  | "fail"
  | "skipped";

export type DepartmentHealthItem = {
  department: DepartmentName;
  status: DepartmentHealthStatus;
  executionType: string;
  registered: boolean;
  executed: boolean;
  success: boolean;
  completed: boolean;
  durationMs: number;
  message: string;
  details?: Record<string, unknown>;
};

export type DepartmentHealthTestResult = {
  success: boolean;
  mode: "non-destructive";
  checkedAt: string;
  sharedSnapshotWarmed: boolean;
  departments: DepartmentHealthItem[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
};

function createBaseContext(
  department: DepartmentName,
  executionType: string
) {
  return {
    recommendationId:
      `department-health-${department}-${Date.now()}`,
    executionType,
    payload: {
      healthTest: true,
      nonDestructive: true,
    },
    metadata: {
      executedBy: "department-health-test",
      healthTest: true,
      nonDestructive: true,
    },
  };
}

async function runSafeDepartment(
  department: Exclude<DepartmentName, "prediction">,
  executionType: string
): Promise<DepartmentHealthItem> {
  const startedAt = Date.now();
  const registration =
    getExecutionRegistration(executionType);

  if (!registration) {
    return {
      department,
      status: "fail",
      executionType,
      registered: false,
      executed: false,
      success: false,
      completed: false,
      durationMs: Date.now() - startedAt,
      message:
        "No registered execution handler was found.",
    };
  }

  if (registration.department !== department) {
    return {
      department,
      status: "fail",
      executionType,
      registered: true,
      executed: false,
      success: false,
      completed: false,
      durationMs: Date.now() - startedAt,
      message:
        `Execution type is registered to ${registration.department}, not ${department}.`,
    };
  }

  try {
    const result =
      await executeRegisteredHandler(
        createBaseContext(
          department,
          executionType
        )
      );

    return {
      department,
      status:
        result.success && result.completed
          ? "pass"
          : "fail",
      executionType,
      registered: true,
      executed: true,
      success: result.success,
      completed: result.completed,
      durationMs: Date.now() - startedAt,
      message: result.message,
      details: {
        requiresApproval:
          registration.requiresApproval,
        producesFinalAction:
          registration.producesFinalAction,
        handlerDepartment:
          result.data?.handlerDepartment ??
          registration.department,
        handlerRegistered:
          result.data?.handlerRegistered ?? true,
        guardrails:
          result.data?.guardrails ?? null,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown department health test error.";

    return {
      department,
      status: "fail",
      executionType,
      registered: true,
      executed: true,
      success: false,
      completed: false,
      durationMs: Date.now() - startedAt,
      message,
    };
  }
}

function checkPredictionDepartment():
  DepartmentHealthItem {
  const startedAt = Date.now();
  const executionType = "generate-predictions";
  const registration =
    getExecutionRegistration(executionType);

  if (!registration) {
    return {
      department: "prediction",
      status: "fail",
      executionType,
      registered: false,
      executed: false,
      success: false,
      completed: false,
      durationMs: Date.now() - startedAt,
      message:
        "Prediction executor is not registered.",
    };
  }

  const wiringValid =
    registration.department === "prediction" &&
    registration.producesFinalAction === true;

  return {
    department: "prediction",
    status: wiringValid ? "pass" : "fail",
    executionType,
    registered: true,
    executed: false,
    success: wiringValid,
    completed: wiringValid,
    durationMs: Date.now() - startedAt,
    message:
      wiringValid
        ? "Prediction department wiring is healthy. Runtime generation was intentionally skipped because it writes production prediction data."
        : "Prediction department registration metadata is invalid.",
    details: {
      requiresApproval:
        registration.requiresApproval,
      producesFinalAction:
        registration.producesFinalAction,
      runtimeExecutionSkipped: true,
      reason: "Non-destructive health test.",
    },
  };
}

export async function runDepartmentHealthTest():
  Promise<DepartmentHealthTestResult> {
  let sharedSnapshotWarmed = false;

  try {
    // Warm the shared 10-minute snapshot once.
    await collectAICEOData();
    sharedSnapshotWarmed = true;
  } catch (error) {
    console.error(
      "[DEPARTMENT_HEALTH_SNAPSHOT_WARM_ERROR]",
      error
    );
  }

  const departments: DepartmentHealthItem[] = [];

  departments.push(
    checkPredictionDepartment()
  );

  // Sequential execution keeps shared reads low.
  departments.push(
    await runSafeDepartment(
      "seo",
      "seo-metadata-optimization"
    )
  );

  departments.push(
    await runSafeDepartment(
      "growth",
      "growth-foundation-plan"
    )
  );

  departments.push(
    await runSafeDepartment(
      "marketing",
      "marketing-review"
    )
  );

  departments.push(
    await runSafeDepartment(
      "payments",
      "payment-audit"
    )
  );

  const passed = departments.filter(
    (item) => item.status === "pass"
  ).length;

  const failed = departments.filter(
    (item) => item.status === "fail"
  ).length;

  const skipped = departments.filter(
    (item) => item.status === "skipped"
  ).length;

  return {
    success: failed === 0,
    mode: "non-destructive",
    checkedAt: new Date().toISOString(),
    sharedSnapshotWarmed,
    departments,
    summary: {
      total: departments.length,
      passed,
      failed,
      skipped,
    },
  };
}
