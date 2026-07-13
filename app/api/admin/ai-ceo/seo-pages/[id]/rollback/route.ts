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

type RollbackBody = {
  versionId?: string;
};

type TimestampLike = {
  toDate: () => Date;
};

const RESTORABLE_FIELDS = [
  "title",
  "metaDescription",
  "slug",
  "canonicalPath",
  "h1",
  "intro",
  "sections",
  "faq",
  "internalLinks",
  "relatedKeywords",
  "schemaType",
  "language",
  "country",
  "guardrails",
] as const;

function serializeTimestamp(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate ===
      "function"
  ) {
    return (value as TimestampLike)
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function buildRestoreData(
  snapshot: Record<string, unknown>
): Record<string, unknown> {
  const restoreData: Record<string, unknown> = {};

  for (const field of RESTORABLE_FIELDS) {
    if (field in snapshot) {
      restoreData[field] = snapshot[field];
    }
  }

  return restoreData;
}

function serializeHumanReview(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const review = value as Record<string, unknown>;

  return {
    ...review,
    reviewedAt: serializeTimestamp(
      review.reviewedAt
    ),
  };
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

  if (
    message === "SEO draft was not found." ||
    message === "SEO page version was not found."
  ) {
    return 404;
  }

  if (
    message.includes("does not belong") ||
    message.includes("canonical path")
  ) {
    return 409;
  }

  return 500;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireServerAdmin();

    const { id } = await context.params;
    const draftId = decodeURIComponent(id || "").trim();

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft ID is required.",
        },
        { status: 400 }
      );
    }

    let body: RollbackBody;

    try {
      body = (await request.json()) as RollbackBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const versionId = normalizeString(body.versionId);

    if (!versionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Version ID is required.",
        },
        { status: 400 }
      );
    }

    const draftRef = adminDb
      .collection("seoPageDrafts")
      .doc(draftId);

    const versionRef = adminDb
      .collection("seoPageVersions")
      .doc(versionId);

    const [draftDocument, versionDocument] =
      await Promise.all([
        draftRef.get(),
        versionRef.get(),
      ]);

    if (!draftDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft was not found.",
        },
        { status: 404 }
      );
    }

    if (!versionDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO page version was not found.",
        },
        { status: 404 }
      );
    }

    const versionData = versionDocument.data() ?? {};

    if (versionData.draftId !== draftId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected version does not belong to this SEO draft.",
        },
        { status: 409 }
      );
    }

    const selectedSnapshot =
      versionData.snapshot &&
      typeof versionData.snapshot === "object"
        ? (versionData.snapshot as Record<string, unknown>)
        : null;

    if (!selectedSnapshot) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected version does not contain a valid snapshot.",
        },
        { status: 409 }
      );
    }

    const selectedCanonicalPath = normalizeString(
      selectedSnapshot.canonicalPath
    );

    if (selectedCanonicalPath) {
      const duplicateSnapshot = await adminDb
        .collection("seoPageDrafts")
        .where(
          "canonicalPath",
          "==",
          selectedCanonicalPath
        )
        .limit(2)
        .get();

      const duplicateExists =
        duplicateSnapshot.docs.some(
          (document) => document.id !== draftId
        );

      if (duplicateExists) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Another SEO draft currently uses the selected version's canonical path.",
          },
          { status: 409 }
        );
      }
    }

    const performedBy =
      admin.email || admin.uid || "unknown-admin";

    const backupVersionRef = adminDb
      .collection("seoPageVersions")
      .doc();

    const auditRef = adminDb
      .collection("seoAuditLogs")
      .doc();

    await adminDb.runTransaction(async (transaction) => {
      const currentDraftDocument =
        await transaction.get(draftRef);

      const selectedVersionDocument =
        await transaction.get(versionRef);

      if (!currentDraftDocument.exists) {
        throw new Error("SEO draft was not found.");
      }

      if (!selectedVersionDocument.exists) {
        throw new Error(
          "SEO page version was not found."
        );
      }

      const currentDraft =
        currentDraftDocument.data() ?? {};

      const selectedVersion =
        selectedVersionDocument.data() ?? {};

      if (selectedVersion.draftId !== draftId) {
        throw new Error(
          "The selected version does not belong to this SEO draft."
        );
      }

      const snapshot =
        selectedVersion.snapshot &&
        typeof selectedVersion.snapshot === "object"
          ? (selectedVersion.snapshot as Record<
              string,
              unknown
            >)
          : null;

      if (!snapshot) {
        throw new Error(
          "The selected version does not contain a valid snapshot."
        );
      }

      const restoreData = buildRestoreData(snapshot);

      transaction.set(backupVersionRef, {
        draftId,
        sourceAction: "rollback_backup",
        createdBy: performedBy,
        createdAt: FieldValue.serverTimestamp(),
        snapshot: currentDraft,
      });

      transaction.update(draftRef, {
        ...restoreData,

        /*
         * Safety rule:
         * rollback restores content, but never republishes
         * or auto-approves a page.
         */
        status: "draft",

        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,

        publishedAt: FieldValue.delete(),
        publishedBy: FieldValue.delete(),
        unpublishedAt: FieldValue.delete(),
        unpublishedBy: FieldValue.delete(),

        rollbackFromVersion: backupVersionRef.id,
        rollbackToVersion: versionId,
        rolledBackAt: FieldValue.serverTimestamp(),
        rolledBackBy: performedBy,

        updatedAt: FieldValue.serverTimestamp(),
        lastEditedBy: performedBy,

        humanReview: {
          factsVerified: false,
          noMisleadingClaims: false,
          titleMetaReviewed: false,
          faqReviewed: false,
          linksChecked: false,
          schemaChecked: false,
          riskWordingReviewed: false,
          finalEditorialApproval: false,
          completed: false,
          reviewedBy: null,
          reviewedAt: null,
        },

        guardrails: {
          ...(
            restoreData.guardrails &&
            typeof restoreData.guardrails === "object"
              ? restoreData.guardrails
              : {}
          ),
          peopleFirstContent: true,
          uniqueHelpfulContent: true,
          duplicateChecked: true,
          humanApprovalRequired: true,
          autoPublishDisabled: true,
        },
      });

      transaction.set(auditRef, {
        action: "rollback",
        draftId,
        rollbackFromVersion: backupVersionRef.id,
        rollbackToVersion: versionId,
        previousStatus: String(
          currentDraft.status || "draft"
        ),
        newStatus: "draft",
        performedBy,
        humanReviewInvalidated: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    const rolledBackDocument = await draftRef.get();
    const rolledBackData =
      rolledBackDocument.data() ?? {};

    return NextResponse.json(
      {
        success: true,
        message:
          "SEO page rolled back successfully. It was returned to draft status for human review.",
        backupVersionId: backupVersionRef.id,
        rollbackToVersion: versionId,
        draft: {
          id: rolledBackDocument.id,
          ...rolledBackData,
          createdAt: serializeTimestamp(
            rolledBackData.createdAt
          ),
          updatedAt: serializeTimestamp(
            rolledBackData.updatedAt
          ),
          approvedAt: serializeTimestamp(
            rolledBackData.approvedAt
          ),
          rejectedAt: serializeTimestamp(
            rolledBackData.rejectedAt
          ),
          publishedAt: serializeTimestamp(
            rolledBackData.publishedAt
          ),
          unpublishedAt: serializeTimestamp(
            rolledBackData.unpublishedAt
          ),
          rolledBackAt: serializeTimestamp(
            rolledBackData.rolledBackAt
          ),
          humanReview: serializeHumanReview(
            rolledBackData.humanReview
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
    console.error("[SEO_ROLLBACK_POST_ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to roll back SEO page.";

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