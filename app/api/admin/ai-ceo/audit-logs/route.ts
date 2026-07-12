import { NextRequest, NextResponse } from "next/server";
import { FieldPath, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ACTIONS = new Set([
  "edit",
  "approve",
  "reject",
  "publish",
  "unpublish",
  "rollback",
]);

function serializeTimestamp(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function clampLimit(value: string | null): number {
  const parsed = Number.parseInt(value || "20", 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(parsed, 1), 50);
}

function parseCursor(
  value: string | null
): { millis: number; id: string } | null {
  if (!value) return null;

  const separatorIndex = value.indexOf(":");
  if (separatorIndex <= 0) return null;

  const millis = Number.parseInt(value.slice(0, separatorIndex), 10);
  const id = decodeURIComponent(value.slice(separatorIndex + 1)).trim();

  if (!Number.isFinite(millis) || !id) return null;
  return { millis, id };
}

function buildCursor(createdAt: unknown, documentId: string): string | null {
  if (
    createdAt &&
    typeof createdAt === "object" &&
    "toMillis" in createdAt &&
    typeof (createdAt as { toMillis?: unknown }).toMillis === "function"
  ) {
    const millis = (createdAt as { toMillis: () => number }).toMillis();
    return `${millis}:${encodeURIComponent(documentId)}`;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireServerAdmin();

    const searchParams = request.nextUrl.searchParams;
    const limit = clampLimit(searchParams.get("limit"));
    const requestedAction = (searchParams.get("action") || "").trim();
    const action = ALLOWED_ACTIONS.has(requestedAction)
      ? requestedAction
      : "";
    const cursor = parseCursor(searchParams.get("cursor"));

    let query = adminDb
      .collection("seoAuditLogs")
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit + 1);

    if (action) {
      query = query.where("action", "==", action);
    }

    if (cursor) {
      query = query.startAfter(
        Timestamp.fromMillis(cursor.millis),
        cursor.id
      );
    }

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const pageDocuments = snapshot.docs.slice(0, limit);

    const draftIds = Array.from(
      new Set(
        pageDocuments
          .map((document) => {
            const data = document.data() || {};
            return typeof data.draftId === "string" ? data.draftId : "";
          })
          .filter(Boolean)
      )
    );

    const titleByDraftId = new Map<string, string>();

    if (draftIds.length > 0) {
      const draftReferences = draftIds.map((draftId) =>
        adminDb.collection("seoPageDrafts").doc(draftId)
      );

      const draftDocuments = await adminDb.getAll(...draftReferences);

      for (const document of draftDocuments) {
        if (!document.exists) continue;

        const data = document.data() || {};
        const title =
          typeof data.title === "string"
            ? data.title
            : typeof data.h1 === "string"
            ? data.h1
            : "";

        if (title) titleByDraftId.set(document.id, title);
      }
    }

    const logs = pageDocuments.map((document) => {
      const data = document.data() || {};
      const draftId =
        typeof data.draftId === "string" ? data.draftId : null;

      return {
        id: document.id,
        action:
          typeof data.action === "string" ? data.action : "unknown",
        draftId,
        draftTitle:
          draftId && titleByDraftId.has(draftId)
            ? titleByDraftId.get(draftId) || null
            : null,
        canonicalPath:
          typeof data.canonicalPath === "string"
            ? data.canonicalPath
            : null,
        previousStatus:
          typeof data.previousStatus === "string"
            ? data.previousStatus
            : null,
        newStatus:
          typeof data.newStatus === "string"
            ? data.newStatus
            : null,
        performedBy:
          typeof data.performedBy === "string"
            ? data.performedBy
            : null,
        createdAt: serializeTimestamp(data.createdAt),
        versionId:
          typeof data.versionId === "string" ? data.versionId : null,
        rollbackFromVersion:
          typeof data.rollbackFromVersion === "string"
            ? data.rollbackFromVersion
            : null,
        rollbackToVersion:
          typeof data.rollbackToVersion === "string"
            ? data.rollbackToVersion
            : null,
      };
    });

    const lastDocument = pageDocuments[pageDocuments.length - 1];
    const nextCursor =
      hasMore && lastDocument
        ? buildCursor(lastDocument.data()?.createdAt, lastDocument.id)
        : null;

    return NextResponse.json(
      {
        success: true,
        logs,
        nextCursor,
        hasMore: Boolean(hasMore && nextCursor),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("[SEO_AUDIT_LOGS_GET_ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load SEO audit logs.";

    return NextResponse.json(
      { success: false, error: message },
      {
        status:
          message === "Unauthorized admin access" ? 401 : 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}