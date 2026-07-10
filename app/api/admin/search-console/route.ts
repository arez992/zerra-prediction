import { NextResponse } from "next/server";
import {
  getDailySearchPerformance,
  getSearchCountries,
  getSearchDevices,
  getSearchPages,
  getSearchQueries,
} from "@/lib/google/search-console";
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

    const [queries, countries, pages, devices, daily] = await Promise.all([
      getSearchQueries(100),
      getSearchCountries(100),
      getSearchPages(100),
      getSearchDevices(),
      getDailySearchPerformance(100),
    ]);

    const totals = daily.reduce(
      (acc, item) => {
        acc.clicks += Number(item.clicks || 0);
        acc.impressions += Number(item.impressions || 0);
        return acc;
      },
      {
        clicks: 0,
        impressions: 0,
      }
    );

    const averageCtr =
      totals.impressions === 0
        ? 0
        : Number(((totals.clicks / totals.impressions) * 100).toFixed(2));

    const averagePosition =
      daily.length === 0
        ? 0
        : Number(
            (
              daily.reduce(
                (total, item) => total + Number(item.position || 0),
                0
              ) / daily.length
            ).toFixed(2)
          );

    return NextResponse.json({
      success: true,
      connected: true,
      searchConsole: {
        totals: {
          clicks: totals.clicks,
          impressions: totals.impressions,
          ctr: averageCtr,
          averagePosition,
        },
        queries,
        countries,
        pages,
        devices,
        daily,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Search Console API failed:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error:
          error?.message ||
          "Unable to connect to the Google Search Console API.",
      },
      { status: 500 }
    );
  }
}