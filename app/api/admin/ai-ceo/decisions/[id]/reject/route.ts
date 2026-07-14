import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  rejectCEODecision,
} from "@/lib/ai/ceo/decisionWorkflow";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getStatus(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized")) return 401;
  if (normalized.includes("not found")) return 404;
  if (normalized.includes("cannot be rejected")) return 409;

  return 500;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireServerAdmin();
    const { id } = await context.params;

    let reason = "Rejected by owner";

    try {
      const body = (await request.json()) as {
        reason?: unknown;
      };

      if (
        typeof body.reason === "string" &&
        body.reason.trim()
      ) {
        reason = body.reason.trim();
      }
    } catch {
      reason = "Rejected by owner";
    }

    const result = await rejectCEODecision(
      decodeURIComponent(id),
      admin,
      reason
    );

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to reject AI CEO decision.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: getStatus(message),
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}