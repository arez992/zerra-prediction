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

export async function POST(
  _request: NextRequest,
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

    const draft = draftDocument.data() || {};
    const currentStatus = String(draft.status || "draft");

    if (currentStatus === "published") {
      return NextResponse.json(
        {
          success: false,
          error: "Published drafts cannot be approved again.",
        },
        { status: 409 }
      );
    }

    if (currentStatus === "approved") {
      return NextResponse.json({
        success: true,
        message: "SEO draft is already approved.",
        draft: {
          id: draftDocument.id,
          ...draft,
        },
      });
    }

    await draftRef.update({
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: admin.email || admin.uid,
      rejectedAt: null,
      rejectionReason: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDocument = await draftRef.get();
    const updatedData = updatedDocument.data() || {};

    return NextResponse.json({
      success: true,
      message: "SEO draft approved successfully.",
      draft: {
        id: updatedDocument.id,
        ...updatedData,
        createdAt:
          updatedData.createdAt?.toDate?.().toISOString?.() ||
          updatedData.createdAt ||
          null,
        updatedAt:
          updatedData.updatedAt?.toDate?.().toISOString?.() ||
          updatedData.updatedAt ||
          null,
        approvedAt:
          updatedData.approvedAt?.toDate?.().toISOString?.() ||
          updatedData.approvedAt ||
          null,
        publishedAt:
          updatedData.publishedAt?.toDate?.().toISOString?.() ||
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
          message === "Unauthorized admin access"
            ? 401
            : 500,
      }
    );
  }
}