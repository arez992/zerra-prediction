import "server-only";

import type {
  CEOEngineInput,
} from "../../types";
import {
  getCEOShadowConfig,
  type CEOShadowConfig,
} from "../ShadowConfig";
import {
  runCEOShadowMode,
  type CEOShadowRunResult,
} from "../ShadowRunner";
import {
  mapShadowRunToHistoryRecord,
} from "../storage/ShadowHistory";
import {
  createFirestoreShadowHistoryStore,
  isFirestoreShadowPersistenceEnabled,
} from "../storage/FirestoreShadowHistoryStore";

export const AI_CEO_AUTOMATIC_SHADOW_SERVICE_VERSION =
  "1.0.0";

export type AutomaticShadowMetadata = {
  source?: string;
  requestId?: string;
  actorId?: string;
  actorEmail?: string;
  route?: string;
  [key: string]: unknown;
};

export type AutomaticShadowServiceResult = {
  version: string;

  attempted: boolean;
  skipped: boolean;

  persisted: boolean;
  historyRecordId: string | null;

  shadow: CEOShadowRunResult | null;

  error: string | null;
  persistenceError: string | null;
};

function createSkippedResult(): AutomaticShadowServiceResult {
  return {
    version:
      AI_CEO_AUTOMATIC_SHADOW_SERVICE_VERSION,
    attempted: false,
    skipped: true,
    persisted: false,
    historyRecordId: null,
    shadow: null,
    error: null,
    persistenceError: null,
  };
}

export async function runAutomaticCEOShadow(
  input: CEOEngineInput,
  metadata: AutomaticShadowMetadata = {},
  configOverride?: Partial<CEOShadowConfig>
): Promise<AutomaticShadowServiceResult> {
  const baseConfig =
    getCEOShadowConfig();

  const config: CEOShadowConfig = {
    ...baseConfig,
    ...configOverride,
  };

  if (
    config.mode !== "enabled" ||
    !config.enabled
  ) {
    return createSkippedResult();
  }

  try {
    const shadow =
      await runCEOShadowMode(
        input,
        config
      );

    let persisted = false;
    let historyRecordId:
      | string
      | null = null;
    let persistenceError:
      | string
      | null = null;

    const persistenceEnabled =
      config.persistComparisons &&
      isFirestoreShadowPersistenceEnabled();

    if (
      persistenceEnabled &&
      !shadow.skipped
    ) {
      try {
        const record =
          mapShadowRunToHistoryRecord(
            shadow,
            {
              ...metadata,
              source:
                metadata.source ||
                "automatic-shadow-service",
              automatic: true,
              serviceVersion:
                AI_CEO_AUTOMATIC_SHADOW_SERVICE_VERSION,
            }
          );

        const store =
          createFirestoreShadowHistoryStore();

        await store.save(record);

        persisted = true;
        historyRecordId =
          record.id;
      } catch (error) {
        persistenceError =
          error instanceof Error
            ? error.message
            : "Unable to persist automatic AI CEO shadow history.";

        console.error(
          "[AI_CEO_AUTOMATIC_SHADOW_PERSIST_ERROR]",
          error
        );
      }
    }

    return {
      version:
        AI_CEO_AUTOMATIC_SHADOW_SERVICE_VERSION,
      attempted: !shadow.skipped,
      skipped: shadow.skipped,
      persisted,
      historyRecordId,
      shadow,
      error: shadow.error,
      persistenceError,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Automatic AI CEO shadow execution failed.";

    console.error(
      "[AI_CEO_AUTOMATIC_SHADOW_ERROR]",
      error
    );

    return {
      version:
        AI_CEO_AUTOMATIC_SHADOW_SERVICE_VERSION,
      attempted: true,
      skipped: false,
      persisted: false,
      historyRecordId: null,
      shadow: null,
      error: message,
      persistenceError: null,
    };
  }
}

export function runAutomaticCEOShadowInBackground(
  input: CEOEngineInput,
  metadata: AutomaticShadowMetadata = {},
  configOverride?: Partial<CEOShadowConfig>
): void {
  void runAutomaticCEOShadow(
    input,
    metadata,
    configOverride
  ).catch((error) => {
    console.error(
      "[AI_CEO_AUTOMATIC_SHADOW_BACKGROUND_ERROR]",
      error
    );
  });
}