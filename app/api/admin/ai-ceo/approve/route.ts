import { NextRequest, NextResponse } from "next/server";
import { requireServerAdmin } from "@/lib/serverAdminAuth";
import { approveCEORecommendation } from "@/lib/ai-ceo/executionEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const admin = await requireServerAdmin();
    const body = await request.json();

    const recommendationId = String(
      body?.id || body?.recommendationId || ""
    ).trim();

    if (!recommendationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Recommendation ID is required.",
        },
        { status: 400 }
      );
    }

    const result = await approveCEORecommendation(
      recommendationId,
      admin
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const message =
      error?.message || "Unable to approve recommendation.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message === "Unauthorized admin access" ? 401 : 500,
      }
    );
  }
}