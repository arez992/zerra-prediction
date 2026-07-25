import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function statusCounts(docs: Array<{ status: string }>) {
  return docs.reduce<Record<string, number>>((acc, item) => {
    const key = item.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export async function GET() {
  try {
    await requireServerAdmin();

    const [languageSnapshot, canonicalSnapshot] = await Promise.all([
      adminDb.collection("seoPageDrafts").where("language", "==", "ku").get(),
      adminDb.collection("seoPageDrafts").where("canonicalPath", ">=", "/ku").where("canonicalPath", "<", "/kv").get(),
    ]);

    const records = new Map<string, { id: string; language: string; canonicalPath: string; status: string }>();

    for (const doc of [...languageSnapshot.docs, ...canonicalSnapshot.docs]) {
      const data = doc.data();
      records.set(doc.id, {
        id: doc.id,
        language: text(data.language),
        canonicalPath: text(data.canonicalPath),
        status: text(data.status) || "unknown",
      });
    }

    const combined = Array.from(records.values()).sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({
      success: true,
      readOnly: true,
      languageKuCount: languageSnapshot.size,
      canonicalKuCount: canonicalSnapshot.size,
      uniqueLegacyKuRecords: combined.length,
      statusCounts: statusCounts(combined),
      sample: combined.slice(0, 25),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") || lower.includes("authentication") || lower.includes("not authenticated") ? 401 : lower.includes("forbidden") || lower.includes("admin access required") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
