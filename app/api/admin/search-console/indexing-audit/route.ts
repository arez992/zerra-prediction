import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerAdminUser } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.SEARCH_CONSOLE_SITE_URL || "sc-domain:zerraprediction.com";
const BASE_URL = "https://zerraprediction.com";

const URLS = [
  `${BASE_URL}/`,
  `${BASE_URL}/en`,
  `${BASE_URL}/en/predictions`,
  `${BASE_URL}/fr`,
  `${BASE_URL}/es`,
  `${BASE_URL}/ar`,
];

export async function GET() {
  try {
    const admin = await getServerAdminUser();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized admin access" }, { status: 401 });
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !key) throw new Error("Google service account credentials are missing");

    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });

    const searchConsole = google.searchconsole({ version: "v1", auth });

    const results = [];
    for (const inspectionUrl of URLS) {
      try {
        const response = await searchConsole.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl,
            siteUrl: SITE_URL,
            languageCode: "en-US",
          },
        });

        const r = response.data.inspectionResult?.indexStatusResult;
        results.push({
          url: inspectionUrl,
          success: true,
          verdict: r?.verdict || null,
          coverageState: r?.coverageState || null,
          robotsTxtState: r?.robotsTxtState || null,
          indexingState: r?.indexingState || null,
          pageFetchState: r?.pageFetchState || null,
          lastCrawlTime: r?.lastCrawlTime || null,
          googleCanonical: r?.googleCanonical || null,
          userCanonical: r?.userCanonical || null,
          sitemap: r?.sitemap || [],
        });
      } catch (error) {
        results.push({
          url: inspectionUrl,
          success: false,
          error: error instanceof Error ? error.message : "Unknown inspection error",
        });
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.success && r.verdict === "PASS").length,
      failed: results.filter((r) => !r.success).length,
      canonicalMismatches: results.filter((r) => r.success && r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical).length,
    };

    return NextResponse.json({
      success: true,
      readOnly: true,
      siteUrl: SITE_URL,
      summary,
      results,
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      success: false,
      readOnly: true,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
