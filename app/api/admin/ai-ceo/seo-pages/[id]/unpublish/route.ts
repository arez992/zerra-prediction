import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TimestampLike = {
  toDate: () => Date;
};

function serializeTimestamp(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate === "function"
  ) {
    return (value as TimestampLike).toDate().toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorStatus(message: string): number {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("authentication required") ||
    normalizedMessage.includes("not authenticated")
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes("forbidden") ||
    normalizedMessage.includes("admin access required")
  ) {
    return 403;
  }

  if (message === "SEO draft was not found.") {
    return 404;
  }

  if (message.includes("Only published")) {
    return 409;
  }

  return 500;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireServerAdmin();

    const params = await context.params;
    const draftId = decodeURIComponent(params.id || "").trim();

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft ID is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const draftRef = adminDb
      .collection("seoPageDrafts")
      .doc(draftId);

    const transactionResult = await adminDb.runTransaction(
      async (transaction) => {
        const draftDocument = await transaction.get(draftRef);

        if (!draftDocument.exists) {
          throw new Error("SEO draft was not found.");
        }

        const draft = draftDocument.data() ?? {};
        const status = normalizeString(draft.status) || "draft";

        if (status === "approved") {
          return {
            alreadyUnpublished: true,
          };
        }

        if (status !== "published") {
          throw new Error(
            "Only published SEO pages can be unpublished."
          );
        }

        const canonicalPath = normalizeString(
          draft.canonicalPath
        );
        const slug = normalizeString(draft.slug);
        const performedBy =
          admin.email || admin.uid || "unknown-admin";

        transaction.update(draftRef, {
          status: "approved",
          publishedAt: FieldValue.delete(),
          publishedBy: FieldValue.delete(),
          unpublishedAt: FieldValue.serverTimestamp(),
          unpublishedBy: performedBy,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const auditRef = adminDb
          .collection("seoAuditLogs")
          .doc();

        transaction.set(auditRef, {
          action: "unpublish",
          draftId,
          slug,
          canonicalPath,
          previousStatus: status,
          newStatus: "approved",
          performedBy,
          createdAt: FieldValue.serverTimestamp(),
        });

        return {
          alreadyUnpublished: false,
        };
      }
    );

    const updatedDocument = await draftRef.get();

    if (!updatedDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft was not found after unpublishing.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const updatedData = updatedDocument.data() ?? {};

    return NextResponse.json(
      {
        success: true,
        message: transactionResult.alreadyUnpublished
          ? "SEO page is already unpublished."
          : "SEO page unpublished successfully.",
        publicPath: null,
        draft: {
          id: updatedDocument.id,
          ...updatedData,
          createdAt: serializeTimestamp(
            updatedData.createdAt
          ),
          updatedAt: serializeTimestamp(
            updatedData.updatedAt
          ),
          approvedAt: serializeTimestamp(
            updatedData.approvedAt
          ),
          publishedAt: serializeTimestamp(
            updatedData.publishedAt
          ),
          unpublishedAt: serializeTimestamp(
            updatedData.unpublishedAt
          ),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[SEO_UNPUBLISH_POST_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to unpublish SEO page.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: getErrorStatus(message),
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}