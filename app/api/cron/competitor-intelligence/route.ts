import { NextRequest, NextResponse } from "next/server";
import { runCompetitorScanner } from "@/lib/ai-ceo/competitor/scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") || "";
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized cron request." }, { status: 401 });
  }
  try {
    const result = await runCompetitorScanner("cron");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[COMPETITOR_SCANNER_CRON_ERROR]", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Competitor scanner failed." }, { status: 500 });
  }
}