import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runCEOBrain,
} from "@/lib/ai/ceo/brain";
import {
  collectCEOMetrics,
} from "@/lib/ai/ceo/metrics";
import {
  getLatestCEODecision,
  listCEODecisions,
  saveCEODecision,
} from "@/lib/ai/ceo/storage";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic =
  "force-dynamic";
export const revalidate = 0;

function getSafeLimit(
  value: string | null
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return 20;
  }

  return Math.min(
    100,
    Math.max(
      1,
      Math.floor(parsed)
    )
  );
}

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "unauthorized"
    ) ||
    normalized.includes(
      "authentication required"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes(
      "admin access required"
    ) ||
    normalized.includes(
      "forbidden"
    )
  ) {
    return 403;
  }

  if (
    normalized.includes(
      "invalid"
    ) ||
    normalized.includes(
      "required"
    )
  ) {
    return 400;
  }

  return 500;
}

export async function GET(
  request: NextRequest
) {
  try {
    await requireServerAdmin();

    const mode =
      request.nextUrl.searchParams.get(
        "mode"
      );

    if (mode === "latest") {
      const decision =
        await getLatestCEODecision();

      return NextResponse.json(
        {
          success: true,
          decision,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const decisions =
      await listCEODecisions(
        getSafeLimit(
          request.nextUrl.searchParams.get(
            "limit"
          )
        )
      );

    return NextResponse.json(
      {
        success: true,
        count:
          decisions.length,
        decisions,
      },
      {
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
        : "Unable to load AI CEO decisions.";

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
      instruction =
        undefined;
    }

    const metrics =
      await collectCEOMetrics();

    const result =
      await runCEOBrain({
        metrics,
        instruction,
      });

    if (!result.success) {
      throw new Error(
        result.error
      );
    }

    const createdBy =
      admin.email ||
      admin.uid ||
      "unknown-admin";

    const decisionId =
      await saveCEODecision({
        decision:
          result.decision,
        metrics,
        source:
          result.source,
        createdBy,
        rawResponse:
          result.rawResponse,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "AI CEO decision generated and saved.",
        decisionId,
        source:
          result.source,
        metrics,
        decision:
          result.decision,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[AI_CEO_DECISION_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate AI CEO decision.";

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