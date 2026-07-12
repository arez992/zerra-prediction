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

  if (
    message.includes("Only approved") ||
    message.includes("missing required")
  ) {
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

        if (status === "published") {
          return {
            alreadyPublished: true,
          };
        }

        if (status !== "approved") {
          throw new Error(
            "Only approved SEO drafts can be published."
          );
        }

        const canonicalPath = normalizeString(
          draft.canonicalPath
        );
        const slug = normalizeString(draft.slug);
        const title = normalizeString(draft.title);
        const metaDescription = normalizeString(
          draft.metaDescription
        );
        const h1 = normalizeString(draft.h1);
        const intro = normalizeString(draft.intro);

        if (
          !canonicalPath ||
          !slug ||
          !title ||
          !metaDescription ||
          !h1 ||
          !intro
        ) {
          throw new Error(
            "SEO draft is missing required publishing fields."
          );
        }

        const performedBy =
          admin.email || admin.uid || "unknown-admin";

        transaction.update(draftRef, {
          status: "published",
          publishedAt: FieldValue.serverTimestamp(),
          publishedBy: performedBy,
          updatedAt: FieldValue.serverTimestamp(),

          guardrails: {
            ...(draft.guardrails || {}),
            peopleFirstContent: true,
            uniqueHelpfulContent: true,
            duplicateChecked: true,
            humanApprovalRequired: true,
            autoPublishDisabled: true,
          },
        });

        const auditRef = adminDb
          .collection("seoAuditLogs")
          .doc();

        transaction.set(auditRef, {
          action: "publish",
          draftId,
          slug,
          canonicalPath,
          previousStatus: status,
          newStatus: "published",
          performedBy,
          createdAt: FieldValue.serverTimestamp(),
        });

        return {
          alreadyPublished: false,
        };
      }
    );

    const publishedDocument = await draftRef.get();

    if (!publishedDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft was not found after publishing.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const publishedData = publishedDocument.data() ?? {};

    return NextResponse.json(
      {
        success: true,
        message: transactionResult.alreadyPublished
          ? "SEO page is already published."
          : "SEO page published successfully.",
        publicPath:
          normalizeString(publishedData.canonicalPath) || null,
        draft: {
          id: publishedDocument.id,
          ...publishedData,
          createdAt: serializeTimestamp(
            publishedData.createdAt
          ),
          updatedAt: serializeTimestamp(
            publishedData.updatedAt
          ),
          approvedAt: serializeTimestamp(
            publishedData.approvedAt
          ),
          publishedAt: serializeTimestamp(
            publishedData.publishedAt
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
      "[SEO_PUBLISH_POST_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to publish SEO page.";

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