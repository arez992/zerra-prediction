import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

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

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function cleanSlug(value: unknown) {
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
      (item) => item.heading.length > 0 && item.content.length > 0
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
      (item) => item.question.length > 0 && item.answer.length > 0
    )
    .slice(0, 20);
}

function cleanStringList(
  value: unknown,
  maximumItems: number,
  maximumLength: number
) {
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
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireServerAdmin();

    const { id } = await context.params;
    const draftId = decodeURIComponent(id).trim();

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft ID is required.",
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const draftRef = adminDb
      .collection("seoPageDrafts")
      .doc(draftId);

    const draftDocument = await draftRef.get();

    if (!draftDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft was not found.",
        },
        { status: 404 }
      );
    }

    const existingDraft = draftDocument.data() || {};
    const currentStatus = String(existingDraft.status || "draft");

    if (currentStatus === "published") {
      return NextResponse.json(
        {
          success: false,
          error: "Published SEO pages cannot be edited directly.",
        },
        { status: 409 }
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

    const language =
      existingDraft.language === "ku" ? "ku" : "en";

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

    await draftRef.update({
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
        currentStatus === "approved"
          ? "draft"
          : currentStatus,

      approvedAt:
        currentStatus === "approved"
          ? null
          : existingDraft.approvedAt || null,

      approvedBy:
        currentStatus === "approved"
          ? null
          : existingDraft.approvedBy || null,

      lastEditedBy: admin.email || admin.uid,
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

    const updatedDocument = await draftRef.get();
    const updatedData = updatedDocument.data() || {};

    return NextResponse.json({
      success: true,
      message: "SEO draft updated successfully.",
      draft: {
        id: updatedDocument.id,
        ...updatedData,
        createdAt: serializeTimestamp(updatedData.createdAt),
        updatedAt: serializeTimestamp(updatedData.updatedAt),
        approvedAt: serializeTimestamp(updatedData.approvedAt),
        rejectedAt: serializeTimestamp(updatedData.rejectedAt),
        publishedAt: serializeTimestamp(updatedData.publishedAt),
      },
    });
  } catch (error) {
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
        status:
          message === "Unauthorized admin access"
            ? 401
            : 500,
      }
    );
  }
}