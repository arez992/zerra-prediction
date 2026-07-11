import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";
import { generateSEODirectorReport } from "@/lib/ai-ceo/seoDirector";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function createRecommendationId(
  opportunityId: string
) {
  const hash = createHash("sha256")
    .update(opportunityId)
    .digest("hex")
    .slice(0, 24);

  return `seo-${hash}`;
}

/*
 * GET:
 * Generate an SEO report without saving recommendations.
 */
export async function GET() {
  try {
    await requireServerAdmin();

    const report = await generateSEODirectorReport();

    return NextResponse.json({
      success: true,
      seo: report,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate the SEO Director report.";

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

/*
 * POST:
 * Generate the report and save new SEO opportunities
 * as pending AI CEO recommendations.
 */
export async function POST() {
  try {
    const admin = await requireServerAdmin();
    const report = await generateSEODirectorReport();

    const created: string[] = [];
    const skipped: string[] = [];

    for (const opportunity of report.opportunities) {
      const documentId = createRecommendationId(
        opportunity.id
      );

      const recommendationRef = adminDb
        .collection("ceoRecommendations")
        .doc(documentId);

      const existingDocument =
        await recommendationRef.get();

      if (existingDocument.exists) {
        skipped.push(documentId);
        continue;
      }

      await recommendationRef.set({
        title: opportunity.title,
        description: opportunity.description,
        category: "SEO",
        country: null,
        priority: opportunity.priority,
        confidence: opportunity.confidence,
        expectedImpact:
          opportunity.expectedImpact,
        source: opportunity.source,
        risk: opportunity.risk,

        status: "pending",

        executionType:
          opportunity.executionType,

        executionPayload: {
          ...opportunity.executionPayload,
          seoOpportunityId: opportunity.id,
          query: opportunity.query || null,
          page: opportunity.page || null,
          metrics: opportunity.metrics,
          reasons: opportunity.reasons,

          guardrails: {
            requireHumanApproval: true,
            requireUniqueHelpfulContent: true,
            preventDuplicatePages: true,
            preventScaledContentAbuse: true,
          },
        },

        seoOpportunityType: opportunity.type,
        recommendationKey: opportunity.id,

        createdBy:
          admin.email || admin.uid || "seo-director",

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),

        approvedAt: null,
        rejectedAt: null,
        executedAt: null,
        completedAt: null,

        result: null,
        rejectionReason: null,
      });

      created.push(documentId);
    }

    return NextResponse.json({
      success: true,
      report,
      created: created.length,
      skipped: skipped.length,
      createdRecommendationIds: created,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save SEO recommendations.";

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