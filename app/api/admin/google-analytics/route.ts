import { NextResponse } from "next/server";
import { getUsersByCountry } from "@/lib/google/analytics";
import { getServerAdminUser } from "@/lib/serverAdminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const admin = await getServerAdminUser();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized admin access",
        },
        { status: 401 }
      );
    }

    const report = await getUsersByCountry();

    const countries =
      report.rows?.map((row) => ({
        country: row.dimensionValues?.[0]?.value || "Unknown",
        activeUsers: Number(row.metricValues?.[0]?.value || 0),
      })) || [];

    const totalActiveUsers = countries.reduce(
      (total, item) => total + item.activeUsers,
      0
    );

    return NextResponse.json({
      success: true,
      connected: true,
      analytics: {
        countries,
        totalActiveUsers,
        rowCount: report.rowCount || countries.length,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Google Analytics connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error:
          error?.message ||
          "Unable to connect to the Google Analytics Data API.",
      },
      { status: 500 }
    );
  }
}