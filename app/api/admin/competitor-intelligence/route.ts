import { NextResponse } from "next/server";

import { getServerAdminUser } from "@/lib/serverAdminAuth";
import { getCompetitorIntelligenceDashboard } from "@/lib/ai-ceo/competitor/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const admin = await getServerAdminUser();

  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized admin access" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const dashboard = await getCompetitorIntelligenceDashboard();

    return NextResponse.json(
      { success: true, dashboard },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[COMPETITOR_INTELLIGENCE_API_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load competitor intelligence.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}