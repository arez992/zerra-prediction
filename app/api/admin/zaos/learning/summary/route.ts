import { NextResponse } from "next/server";

import { learningService } from "@/lib/zaos/learning";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      "authentication"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes(
      "forbidden"
    ) ||
    normalized.includes("admin")
  ) {
    return 403;
  }

  return 500;
}

export async function GET() {
  try {
    await requireServerAdmin();

    const summary =
      await learningService.summary();

    return NextResponse.json(
      {
        success: true,
        summary,
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
        : "Unable to load ZAOS learning summary.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(message),
      }
    );
  }
}