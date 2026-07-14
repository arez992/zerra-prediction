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

    const config = {
      ...getCEOShadowConfig(),
      mode: "enabled" as const,
      enabled: true,
      forceRuleBasedZAOS: true,
      persistComparisons: false,
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

    return NextResponse.json(
      {
        ...result,
        requestedBy:
          admin.email ||
          admin.uid,
        safety: {
          userVisibleResultChanged: false,
          autoExecutionEnabled: false,
          persistenceEnabled: false,
          zaosForcedRuleBased: true,
          productionWritesExpected: false,
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