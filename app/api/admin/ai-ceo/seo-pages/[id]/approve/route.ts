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

const REVIEW_FIELDS = [
  "factsVerified",
  "noMisleadingClaims",
  "titleMetaReviewed",
  "faqReviewed",
  "linksChecked",
  "schemaChecked",
  "riskWordingReviewed",
  "finalEditorialApproval",
] as const;

type ReviewField = (typeof REVIEW_FIELDS)[number];

type HumanReviewChecklist = Record<
  ReviewField,
  boolean
>;

function parseChecklist(
  value: unknown
): HumanReviewChecklist | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const source = value as Record<
    string,
    unknown
  >;

  const checklist = {} as HumanReviewChecklist;

  for (const field of REVIEW_FIELDS) {
    checklist[field] =
      source[field] === true;
  }

  return checklist;
}

function getIncompleteFields(
  checklist: HumanReviewChecklist
): ReviewField[] {
  return REVIEW_FIELDS.filter(
    (field) => checklist[field] !== true
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireServerAdmin();

    const { id } = await context.params;
    const draftId =
      decodeURIComponent(id).trim();

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SEO draft ID is required.",
        },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<
        string,
        unknown
      >;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const checklist = parseChecklist(
      body.humanReview
    );

    if (!checklist) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Human review checklist is required.",
        },
        { status: 400 }
      );
    }

    const incompleteFields =
      getIncompleteFields(checklist);

    if (incompleteFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Every human review checklist item must be confirmed before approval.",
          incompleteFields,
        },
        { status: 400 }
      );
    }

    const draftRef = adminDb
      .collection("seoPageDrafts")
      .doc(draftId);

    const draftDocument =
      await draftRef.get();

    if (!draftDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SEO draft was not found.",
        },
        { status: 404 }
      );
    }

    const draft =
      draftDocument.data() || {};

    const currentStatus = String(
      draft.status || "draft"
    );

    if (currentStatus === "published") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Published drafts cannot be approved again.",
        },
        { status: 409 }
      );
    }

    if (currentStatus === "approved") {
      return NextResponse.json({
        success: true,
        message:
          "SEO draft is already approved.",
        draft: {
          id: draftDocument.id,
          ...draft,
        },
      });
    }

    const reviewer =
      admin.email ||
      admin.uid ||
      "admin";

    await draftRef.update({
      status: "approved",
      approvedAt:
        FieldValue.serverTimestamp(),
      approvedBy: reviewer,

      "humanReview.factsVerified":
        checklist.factsVerified,
      "humanReview.noMisleadingClaims":
        checklist.noMisleadingClaims,
      "humanReview.titleMetaReviewed":
        checklist.titleMetaReviewed,
      "humanReview.faqReviewed":
        checklist.faqReviewed,
      "humanReview.linksChecked":
        checklist.linksChecked,
      "humanReview.schemaChecked":
        checklist.schemaChecked,
      "humanReview.riskWordingReviewed":
        checklist.riskWordingReviewed,
      "humanReview.finalEditorialApproval":
        checklist.finalEditorialApproval,
      "humanReview.completed": true,
      "humanReview.reviewedBy":
        reviewer,
      "humanReview.reviewedAt":
        FieldValue.serverTimestamp(),

      rejectedAt: null,
      rejectionReason: null,
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    const updatedDocument =
      await draftRef.get();

    const updatedData =
      updatedDocument.data() || {};

    const humanReview =
      updatedData.humanReview &&
      typeof updatedData.humanReview ===
        "object"
        ? {
            ...updatedData.humanReview,
            reviewedAt:
              updatedData.humanReview
                .reviewedAt?.toDate?.()
                .toISOString?.() ||
              updatedData.humanReview
                .reviewedAt ||
              null,
          }
        : null;

    return NextResponse.json({
      success: true,
      message:
        "SEO draft approved after human review.",
      draft: {
        id: updatedDocument.id,
        ...updatedData,
        humanReview,
        createdAt:
          updatedData.createdAt
            ?.toDate?.()
            .toISOString?.() ||
          updatedData.createdAt ||
          null,
        updatedAt:
          updatedData.updatedAt
            ?.toDate?.()
            .toISOString?.() ||
          updatedData.updatedAt ||
          null,
        approvedAt:
          updatedData.approvedAt
            ?.toDate?.()
            .toISOString?.() ||
          updatedData.approvedAt ||
          null,
        publishedAt:
          updatedData.publishedAt
            ?.toDate?.()
            .toISOString?.() ||
          updatedData.publishedAt ||
          null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to approve SEO draft.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message ===
          "Unauthorized admin access"
            ? 401
            : 500,
      }
    );
  }
}