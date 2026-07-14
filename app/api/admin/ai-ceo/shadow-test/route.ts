import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  collectCEOMetrics,
} from "@/lib/ai/ceo/metrics";
import {
  runCEOShadowMode,
} from "@/lib/ai/ceo/shadow/ShadowRunner";
import {
  getCEOShadowConfig,
} from "@/lib/ai/ceo/shadow/ShadowConfig";
import {
  mapShadowRunToHistoryRecord,
} from "@/lib/ai/ceo/shadow/storage/ShadowHistory";
import {
  createFirestoreShadowHistoryStore,
  isFirestoreShadowPersistenceEnabled,
} from "@/lib/ai/ceo/shadow/storage/FirestoreShadowHistoryStore";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("unauthorized") ||
    normalized.includes(
      "authentication required"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes("forbidden") ||
    normalized.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  return 500;
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    let instruction:
      | string
      | undefined;

    try {
      const body =
        (await request.json()) as {
          instruction?: unknown;
        };

      instruction =
        typeof body.instruction ===
          "string" &&
        body.instruction.trim()
          ? body.instruction.trim()
          : undefined;
    } catch {
      instruction = undefined;
    }

    const metrics =
      await collectCEOMetrics();

    const baseConfig =
      getCEOShadowConfig();

    const persistenceEnabled =
      isFirestoreShadowPersistenceEnabled();

    const config = {
      ...baseConfig,
      mode: "enabled" as const,
      enabled: true,
      forceRuleBasedZAOS: true,
      persistComparisons:
        persistenceEnabled,
      sampleRatePercent: 100,
    };

    const result =
      await runCEOShadowMode(
        {
          metrics,
          instruction:
            instruction ||
            "Run an admin-only AI CEO shadow comparison without changing production data.",
        },
        config
      );

    let persisted = false;
    let persistenceError:
      | string
      | null = null;
    let historyRecordId:
      | string
      | null = null;

    if (persistenceEnabled) {
      try {
        const actor =
          admin.email ||
          admin.uid;

        const historyRecord =
          mapShadowRunToHistoryRecord(
            result,
            {
              requestedBy: actor,
              source:
                "admin-shadow-test",
              safety: {
                userVisibleResultChanged:
                  false,
                autoExecutionEnabled:
                  false,
                zaosForcedRuleBased:
                  true,
              },
            }
          );

        const store =
          createFirestoreShadowHistoryStore();

        await store.save(
          historyRecord
        );

        persisted = true;
        historyRecordId =
          historyRecord.id;
      } catch (error) {
        persistenceError =
          error instanceof Error
            ? error.message
            : "Unable to persist AI CEO shadow history.";

        console.error(
          "[AI_CEO_SHADOW_PERSIST_ERROR]",
          error
        );
      }
    }

    return NextResponse.json(
      {
        ...result,
        requestedBy:
          admin.email ||
          admin.uid,
        persistence: {
          enabled:
            persistenceEnabled,
          persisted,
          historyRecordId,
          error:
            persistenceError,
        },
        safety: {
          userVisibleResultChanged:
            false,
          autoExecutionEnabled:
            false,
          persistenceEnabled,
          zaosForcedRuleBased:
            true,
          productionWritesExpected:
            persistenceEnabled,
        },
      },
      {
        status:
          result.success
            ? 200
            : 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to execute AI CEO shadow test.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(message),
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}