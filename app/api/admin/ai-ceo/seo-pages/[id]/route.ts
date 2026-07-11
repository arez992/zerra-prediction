import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireServerAdmin();

    const { id } = await context.params;
    const draftId = decodeURIComponent(id).trim();

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO page draft ID is required.",
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
          error: "SEO page draft was not found.",
        },
        { status: 404 }
      );
    }

    const data = document.data() || {};

    const draft = {
      id: document.id,
      ...data,

      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
      approvedAt: serializeTimestamp(data.approvedAt),
      publishedAt: serializeTimestamp(data.publishedAt),
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
          message === "Unauthorized admin access"
            ? 401
            : 500,
      }
    );
  }
}