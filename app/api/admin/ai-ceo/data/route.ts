import { NextResponse } from "next/server";
import { collectAICEOData } from "@/lib/ai-ceo/dataCollector";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await requireServerAdmin();

    const snapshot = await collectAICEOData();

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
    console.error("AI CEO data route failed:", error);

    const message =
      error?.message || "Unable to collect AI CEO data.";

    const status =
      message === "Unauthorized admin access" ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}