import { NextRequest, NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/serverAdminAuth";
import { evaluateAutopilotCostGuard } from "@/lib/ai-ceo/autopilot/costGuard";
import {
  activateKillSwitch,
  getAutopilotConfig,
  getTodayAutopilotUsage,
  setAutopilotStatus,
} from "@/lib/ai-ceo/autopilot/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function actorName(admin: { uid: string; email?: string | null }) {
  return admin.email || admin.uid;
}

export async function GET() {
  try {
    await requireServerAdmin();

    const [config, usage, guard] = await Promise.all([
      getAutopilotConfig(),
      getTodayAutopilotUsage(),
      evaluateAutopilotCostGuard(),
    ]);

    return NextResponse.json({
      success: true,
      config,
      usage,
      guard,
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load autopilot.";
    return NextResponse.json({ success: false, error: message }, { status: message === "Unauthorized admin access" ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireServerAdmin();
    const body = await request.json() as { action?: unknown };
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const actor = actorName(admin);

    let config;

    if (action === "start") {
      config = await setAutopilotStatus("running", actor);
    } else if (action === "pause") {
      config = await setAutopilotStatus("paused", actor);
    } else if (action === "stop") {
      config = await setAutopilotStatus("stopped", actor);
    } else if (action === "kill") {
      config = await activateKillSwitch(actor);
    } else {
      return NextResponse.json({ success: false, error: "Invalid autopilot action." }, { status: 400 });
    }

    const usage = await getTodayAutopilotUsage();

    return NextResponse.json({
      success: true,
      action,
      config,
      usage,
      message: `AI CEO Autopilot ${action} completed.`,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update autopilot.";
    return NextResponse.json({ success: false, error: message }, { status: message === "Unauthorized admin access" ? 401 : 500 });
  }
}