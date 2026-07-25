import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeHost(value: string | null | undefined): string {
  if (!value) return "";
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""); }
}

export async function GET() {
  try {
    await requireServerAdmin();

    const propertyId = process.env.GA4_PROPERTY_ID?.trim() || "";
    const configuredMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";

    if (!propertyId) throw new Error("GA4_PROPERTY_ID is missing");
    if (!configuredMeasurementId) throw new Error("NEXT_PUBLIC_GA_MEASUREMENT_ID is missing");
    if (!clientEmail || !privateKey) throw new Error("Google service account credentials are missing");

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    const admin = google.analyticsadmin({ version: "v1beta", auth });
    const response = await admin.properties.dataStreams.list({ parent: `properties/${propertyId}`, pageSize: 200 });
    const streams = response.data.dataStreams || [];

    const webStreams = streams.filter((stream) => stream.type === "WEB_DATA_STREAM").map((stream) => {
      const measurementId = stream.webStreamData?.measurementId || "";
      const defaultUri = stream.webStreamData?.defaultUri || "";
      const host = normalizeHost(defaultUri);
      return {
        name: stream.name || null,
        displayName: stream.displayName || null,
        measurementId,
        defaultUri,
        host,
        matchesConfiguredMeasurementId: measurementId === configuredMeasurementId,
        matchesZerraDomain: host === "zerraprediction.com",
      };
    });

    const matchedStream = webStreams.find((stream) => stream.matchesConfiguredMeasurementId) || null;

    return NextResponse.json({
      success: true,
      readOnly: true,
      propertyId,
      configuredMeasurementId,
      totalStreams: streams.length,
      webStreamCount: webStreams.length,
      matchedStream,
      linkageValid: Boolean(matchedStream?.matchesConfiguredMeasurementId && matchedStream?.matchesZerraDomain),
      webStreams,
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") || lower.includes("authentication") || lower.includes("not authenticated") ? 401 : lower.includes("forbidden") || lower.includes("admin access required") ? 403 : 500;
    return NextResponse.json({ success: false, readOnly: true, error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
