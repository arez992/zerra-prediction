import { NextRequest, NextResponse } from "next/server";

import { runAICEOAutopilotCycle } from "@/lib/ai-ceo/autopilot/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") || "";
  return Boolean(secret) && authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAICEOAutopilotCycle("cron");
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autopilot cron failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}