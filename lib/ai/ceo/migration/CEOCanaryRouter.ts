import "server-only";

export const AI_CEO_CANARY_ROUTER_VERSION = "1.0.0";

export type CEOCanarySource =
  | "legacy"
  | "zaos"
  | "legacy_fallback";

export type CEOCanaryConfig = {
  enabled: boolean;
  canaryPercent: number;
};

export type CEOCanaryRoutingDecision = {
  version: string;
  requestId: string;
  enabled: boolean;
  canaryPercent: number;
  bucket: number;
  selectedSource: "legacy" | "zaos";
  reason: string;
};

export type CEOCanaryExecutionResult<T> = {
  version: string;
  requestId: string;
  source: CEOCanarySource;
  selectedSource: "legacy" | "zaos";
  fallbackUsed: boolean;
  autoExecutionEnabled: false;
  routing: CEOCanaryRoutingDecision;
  result: T;
  zaosError: string | null;
};

export type CEOCanaryExecutionOptions<T> = {
  requestId: string;
  runLegacy: () => Promise<T>;
  runZAOS: () => Promise<T>;
  validateZAOSResult?: (
    result: T
  ) => boolean | Promise<boolean>;
  configOverride?: Partial<CEOCanaryConfig>;
  metadata?: Record<string, unknown>;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value)
  );
}

export function getCEOCanaryConfig(): CEOCanaryConfig {
  return {
    enabled:
      process.env
        .AI_CEO_ZAOS_PRODUCTION_ENABLED ===
      "true",
    canaryPercent:
      clampPercent(
        Number(
          process.env
            .AI_CEO_ZAOS_CANARY_PERCENT ??
            0
        )
      ),
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(index);

    hash = Math.imul(
      hash,
      16777619
    );
  }

  return hash >>> 0;
}

export function getCEOCanaryBucket(
  requestId: string
): number {
  return (
    stableHash(
      requestId.trim() ||
        "missing-request-id"
    ) % 100
  );
}

export function decideCEOCanaryRoute(
  requestId: string,
  configOverride?: Partial<CEOCanaryConfig>
): CEOCanaryRoutingDecision {
  const base =
    getCEOCanaryConfig();

  const enabled =
    configOverride?.enabled ??
    base.enabled;

  const canaryPercent =
    clampPercent(
      configOverride?.canaryPercent ??
        base.canaryPercent
    );

  const normalizedRequestId =
    requestId.trim() ||
    "missing-request-id";

  const bucket =
    getCEOCanaryBucket(
      normalizedRequestId
    );

  const selectedSource =
    enabled &&
    canaryPercent > 0 &&
    bucket < canaryPercent
      ? "zaos"
      : "legacy";

  return {
    version:
      AI_CEO_CANARY_ROUTER_VERSION,
    requestId:
      normalizedRequestId,
    enabled,
    canaryPercent,
    bucket,
    selectedSource,
    reason:
      !enabled
        ? "ZAOS production canary is disabled."
        : canaryPercent <= 0
          ? "ZAOS production canary percentage is zero."
          : selectedSource === "zaos"
            ? "Stable canary bucket selected ZAOS."
            : "Stable canary bucket retained legacy.",
  };
}

export async function runCEOCanary<T>(
  options: CEOCanaryExecutionOptions<T>
): Promise<CEOCanaryExecutionResult<T>> {
  const routing =
    decideCEOCanaryRoute(
      options.requestId,
      options.configOverride
    );

  if (
    routing.selectedSource ===
    "legacy"
  ) {
    return {
      version:
        AI_CEO_CANARY_ROUTER_VERSION,
      requestId:
        routing.requestId,
      source: "legacy",
      selectedSource: "legacy",
      fallbackUsed: false,
      autoExecutionEnabled: false,
      routing,
      result:
        await options.runLegacy(),
      zaosError: null,
    };
  }

  try {
    const result =
      await options.runZAOS();

    if (
      options.validateZAOSResult &&
      !await options.validateZAOSResult(
        result
      )
    ) {
      throw new Error(
        "ZAOS result failed production validation."
      );
    }

    return {
      version:
        AI_CEO_CANARY_ROUTER_VERSION,
      requestId:
        routing.requestId,
      source: "zaos",
      selectedSource: "zaos",
      fallbackUsed: false,
      autoExecutionEnabled: false,
      routing,
      result,
      zaosError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ZAOS production execution failed.";

    console.error(
      "[AI_CEO_ZAOS_CANARY_FALLBACK]",
      {
        requestId:
          routing.requestId,
        bucket:
          routing.bucket,
        canaryPercent:
          routing.canaryPercent,
        error: message,
        metadata:
          options.metadata ?? {},
      }
    );

    return {
      version:
        AI_CEO_CANARY_ROUTER_VERSION,
      requestId:
        routing.requestId,
      source:
        "legacy_fallback",
      selectedSource: "zaos",
      fallbackUsed: true,
      autoExecutionEnabled: false,
      routing,
      result:
        await options.runLegacy(),
      zaosError:
        message,
    };
  }
}