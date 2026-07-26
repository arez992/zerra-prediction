import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/serverAdminAuth";
import { runAICEOAutopilotCycle } from "@/lib/ai-ceo/autopilot/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    await requireServerAdmin();

    const result = await runAICEOAutopilotCycle("manual");

    return NextResponse.json({
      success: true,
      result,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run AI CEO Autopilot.";
    return NextResponse.json({ success: false, error: message }, { status: message === "Unauthorized admin access" ? 401 : 500 });
  }
}