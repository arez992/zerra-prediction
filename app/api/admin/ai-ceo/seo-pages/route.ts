import { NextRequest, NextResponse } from "next/server";
import { requireServerAdmin } from "@/lib/serverAdminAuth";
import {
  createSEOPageDraft,
  listSEOPageDrafts,
} from "@/lib/ai-ceo/pageGenerator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await requireServerAdmin();

    const drafts = await listSEOPageDrafts(100);

    return NextResponse.json({
      success: true,
      drafts,
      count: drafts.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load SEO page drafts.";

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

export async function POST(
  request: NextRequest
) {
  try {
    const admin = await requireServerAdmin();
    const body = await request.json();

    const keyword = String(
      body?.keyword || ""
    ).trim();

    const language =
      body?.language === "ku" ? "ku" : "en";

    const country = body?.country
      ? String(body.country).trim()
      : null;

    const sourceRecommendationId =
      body?.sourceRecommendationId
        ? String(
            body.sourceRecommendationId
          ).trim()
        : null;

    if (!keyword) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO keyword is required.",
        },
        { status: 400 }
      );
    }

    const draft = await createSEOPageDraft({
      keyword,
      language,
      country,
      sourceRecommendationId,
      createdBy:
        admin.email || admin.uid || "admin",
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "SEO page draft created successfully.",
        draft,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create SEO page draft.";

    const status =
      message === "Unauthorized admin access"
        ? 401
        : message.includes("already exists")
          ? 409
          : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}