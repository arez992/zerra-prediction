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

type SEOPageSection = {
  heading: string;
  content: string;
};

type SEOFAQItem = {
  question: string;
  answer: string;
};

type UpdateDraftBody = {
  title?: string;
  metaDescription?: string;
  slug?: string;
  canonicalPath?: string;
  h1?: string;
  intro?: string;
  sections?: SEOPageSection[];
  faq?: SEOFAQItem[];
  internalLinks?: string[];
  relatedKeywords?: string[];
  schemaType?: string;
};

function cleanText(value: unknown, maximumLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function cleanSlug(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function cleanSections(value: unknown): SEOPageSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      return {
        heading: cleanText(source.heading, 180),
        content: cleanText(source.content, 8000),
      };
    })
    .filter(
      (item) =>
        item.heading.length > 0 &&
        item.content.length > 0
    )
    .slice(0, 30);
}

function cleanFAQ(value: unknown): SEOFAQItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      return {
        question: cleanText(source.question, 300),
        answer: cleanText(source.answer, 3000),
      };
    })
    .filter(
      (item) =>
        item.question.length > 0 &&
        item.answer.length > 0
    )
    .slice(0, 20);
}

function cleanStringList(
  value: unknown,
  maximumItems: number,
  maximumLength: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => cleanText(item, maximumLength))
        .filter(Boolean)
    )
  ).slice(0, maximumItems);
}

function serializeTimestamp(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate ===
      "function"
  ) {
    return (value as { toDate: () => Date })
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
    message.includes("cannot be edited") ||
    message.includes("already uses this canonical path")
  ) {
    return 409;
  }

  return 500;
}

export async function PATCH(
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
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    let body: UpdateDraftBody;

    try {
      body = (await request.json()) as UpdateDraftBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const title = cleanText(body.title, 180);
    const metaDescription = cleanText(
      body.metaDescription,
      320
    );
    const slug = cleanSlug(body.slug);
    const h1 = cleanText(body.h1, 200);
    const intro = cleanText(body.intro, 5000);
    const sections = cleanSections(body.sections);
    const faq = cleanFAQ(body.faq);
    const internalLinks = cleanStringList(
      body.internalLinks,
      50,
      500
    );
    const relatedKeywords = cleanStringList(
      body.relatedKeywords,
      50,
      200
    );
    const schemaType = cleanText(body.schemaType, 80);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO title is required.",
        },
        { status: 400 }
      );
    }

    if (!metaDescription) {
      return NextResponse.json(
        {
          success: false,
          error: "Meta description is required.",
        },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid slug is required.",
        },
        { status: 400 }
      );
    }

    if (!h1) {
      return NextResponse.json(
        {
          success: false,
          error: "H1 is required.",
        },
        { status: 400 }
      );
    }

    const draftRef = adminDb
      .collection("seoPageDrafts")
      .doc(draftId);

    const currentDocument = await draftRef.get();

    if (!currentDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft was not found.",
        },
        { status: 404 }
      );
    }

    const currentData = currentDocument.data() ?? {};
    const currentStatus = String(
      currentData.status || "draft"
    );

    if (currentStatus === "published") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Published SEO pages cannot be edited directly.",
        },
        { status: 409 }
      );
    }

    const language =
      currentData.language === "ku" ? "ku" : "en";

    const canonicalPath =
      language === "ku"
        ? `/ku/predictions/${slug}`
        : `/en/predictions/${slug}`;

    const duplicateSnapshot = await adminDb
      .collection("seoPageDrafts")
      .where("canonicalPath", "==", canonicalPath)
      .limit(2)
      .get();

    const duplicateExists = duplicateSnapshot.docs.some(
      (document) => document.id !== draftId
    );

    if (duplicateExists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Another SEO draft already uses this canonical path.",
        },
        { status: 409 }
      );
    }

    const performedBy =
      admin.email || admin.uid || "unknown-admin";

    const versionRef = adminDb
      .collection("seoPageVersions")
      .doc();

    const auditRef = adminDb
      .collection("seoAuditLogs")
      .doc();

    await adminDb.runTransaction(async (transaction) => {
      const draftDocument =
        await transaction.get(draftRef);

      if (!draftDocument.exists) {
        throw new Error("SEO draft was not found.");
      }

      const existingDraft =
        draftDocument.data() ?? {};

      const status = String(
        existingDraft.status || "draft"
      );

      if (status === "published") {
        throw new Error(
          "Published SEO pages cannot be edited directly."
        );
      }

      transaction.set(versionRef, {
        draftId,
        sourceAction: "edit",
        createdBy: performedBy,
        createdAt: FieldValue.serverTimestamp(),
        snapshot: existingDraft,
      });

      transaction.update(draftRef, {
        title,
        metaDescription,
        slug,
        canonicalPath,
        h1,
        intro,
        sections,
        faq,
        internalLinks,
        relatedKeywords,
        schemaType: schemaType || "WebPage",

        status:
          status === "approved"
            ? "draft"
            : status,

        approvedAt:
          status === "approved"
            ? null
            : existingDraft.approvedAt || null,

        approvedBy:
          status === "approved"
            ? null
            : existingDraft.approvedBy || null,

        lastEditedBy: performedBy,
        updatedAt: FieldValue.serverTimestamp(),

        guardrails: {
          ...(existingDraft.guardrails || {}),
          peopleFirstContent: true,
          uniqueHelpfulContent: true,
          duplicateChecked: true,
          humanApprovalRequired: true,
          autoPublishDisabled: true,
        },
      });

      transaction.set(auditRef, {
        action: "edit",
        draftId,
        versionId: versionRef.id,
        previousStatus: status,
        newStatus:
          status === "approved"
            ? "draft"
            : status,
        performedBy,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    const updatedDocument = await draftRef.get();
    const updatedData = updatedDocument.data() ?? {};

    return NextResponse.json(
      {
        success: true,
        message:
          "SEO draft updated and previous version saved.",
        versionId: versionRef.id,
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
          rejectedAt: serializeTimestamp(
            updatedData.rejectedAt
          ),
          publishedAt: serializeTimestamp(
            updatedData.publishedAt
          ),
          unpublishedAt: serializeTimestamp(
            updatedData.unpublishedAt
          ),
          rolledBackAt: serializeTimestamp(
            updatedData.rolledBackAt
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
    console.error("[SEO_DRAFT_UPDATE_ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update SEO draft.";

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