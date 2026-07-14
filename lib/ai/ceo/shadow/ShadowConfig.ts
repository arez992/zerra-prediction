import "server-only";

export const AI_CEO_SHADOW_CONFIG_VERSION = "1.0.0";

export type CEOShadowMode =
  | "disabled"
  | "manual"
  | "enabled";

export type CEOShadowConfig = {
  version: string;

  mode: CEOShadowMode;
  enabled: boolean;

  forceRuleBasedZAOS: boolean;
  persistComparisons: boolean;

  minimumAcceptableScore: number;
  sampleRatePercent: number;

  timeoutMs: number;
};

function parseBoolean(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value
    .trim()
    .toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no" ||
    normalized === "off"
  ) {
    return false;
  }

  return fallback;
}

function parseNumber(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(minimum, parsed)
  );
}

function parseMode(
  value: string | undefined
): CEOShadowMode {
  if (value === "enabled") {
    return "enabled";
  }

  if (value === "manual") {
    return "manual";
  }

  return "disabled";
}

export function getCEOShadowConfig(): CEOShadowConfig {
  const mode = parseMode(
    process.env.AI_CEO_SHADOW_MODE
  );

  return {
    version:
      AI_CEO_SHADOW_CONFIG_VERSION,

    mode,
    enabled: mode === "enabled",

    forceRuleBasedZAOS:
      parseBoolean(
        process.env
          .AI_CEO_SHADOW_FORCE_RULES,
        true
      ),

    persistComparisons:
      parseBoolean(
        process.env
          .AI_CEO_SHADOW_PERSIST,
        false
      ),

    minimumAcceptableScore:
      parseNumber(
        process.env
          .AI_CEO_SHADOW_MIN_SCORE,
        80,
        0,
        100
      ),

    sampleRatePercent:
      parseNumber(
        process.env
          .AI_CEO_SHADOW_SAMPLE_RATE,
        100,
        0,
        100
      ),

    timeoutMs:
      parseNumber(
        process.env
          .AI_CEO_SHADOW_TIMEOUT_MS,
        15000,
        1000,
        60000
      ),
  };
}

export function shouldRunCEOShadow(
  config: CEOShadowConfig =
    getCEOShadowConfig()
): boolean {
  if (!config.enabled) {
    return false;
  }

  if (config.sampleRatePercent <= 0) {
    return false;
  }

  if (config.sampleRatePercent >= 100) {
    return true;
  }

  return (
    Math.random() * 100 <
    config.sampleRatePercent
  );
}

export function isShadowScoreAcceptable(
  score: number,
  config: CEOShadowConfig =
    getCEOShadowConfig()
): boolean {
  return (
    Number.isFinite(score) &&
    score >=
      config.minimumAcceptableScore
  );
}

export async function withCEOShadowTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutHandle:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeoutPromise =
    new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(
            `AI CEO shadow execution timed out after ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);
    });

  try {
    return await Promise.race([
      operation,
      timeoutPromise,
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}