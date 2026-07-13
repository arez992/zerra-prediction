import {
  NextRequest,
  NextResponse,
} from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function serializeHumanReview(
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const review = value as Record<
    string,
    unknown
  >;

  return {
    factsVerified:
      review.factsVerified === true,
    noMisleadingClaims:
      review.noMisleadingClaims === true,
    titleMetaReviewed:
      review.titleMetaReviewed === true,
    faqReviewed:
      review.faqReviewed === true,
    linksChecked:
      review.linksChecked === true,
    schemaChecked:
      review.schemaChecked === true,
    riskWordingReviewed:
      review.riskWordingReviewed === true,
    finalEditorialApproval:
      review.finalEditorialApproval ===
      true,
    completed:
      review.completed === true,
    reviewedBy:
      typeof review.reviewedBy ===
      "string"
        ? review.reviewedBy
        : null,
    reviewedAt:
      serializeTimestamp(
        review.reviewedAt
      ),
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireServerAdmin();

    const { id } = await context.params;

    const draftId =
      decodeURIComponent(id).trim();

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SEO page draft ID is required.",
        },
        { status: 400 }
      );
    }

    const document = await adminDb
      .collection("seoPageDrafts")
      .doc(draftId)
      .get();

    if (!document.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SEO page draft was not found.",
        },
        { status: 404 }
      );
    }

    const data =
      document.data() || {};

    const draft = {
      id: document.id,
      ...data,

      humanReview:
        serializeHumanReview(
          data.humanReview
        ),

      createdAt:
        serializeTimestamp(
          data.createdAt
        ),

      updatedAt:
        serializeTimestamp(
          data.updatedAt
        ),

      approvedAt:
        serializeTimestamp(
          data.approvedAt
        ),

      publishedAt:
        serializeTimestamp(
          data.publishedAt
        ),
    };

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load SEO page draft.";

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