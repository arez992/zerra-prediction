import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";
import { collectAICEOData } from "@/lib/ai-ceo/dataCollector";
import { generateCEODecisions } from "@/lib/ai-ceo/decisionEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    const admin = await requireServerAdmin();

    const snapshot = await collectAICEOData();
    const decisions = generateCEODecisions(snapshot);

    const createdRecommendations = [];

    for (const decision of decisions) {
      const duplicateSnapshot = await adminDb
        .collection("ceoRecommendations")
        .where("title", "==", decision.title)
        .where("status", "in", [
          "pending",
          "approved",
          "executing",
        ])
        .limit(1)
        .get();

      if (!duplicateSnapshot.empty) {
        continue;
      }

      const recommendation = {
        ...decision,
        status: "pending",

        createdBy:
          admin.email || admin.uid || "ai-ceo",

        dataSnapshotAt: snapshot.generatedAt,

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),

        approvedAt: null,
        rejectedAt: null,
        executedAt: null,
        completedAt: null,

        result: null,
        rejectionReason: null,
      };

      const document = await adminDb
        .collection("ceoRecommendations")
        .add(recommendation);

      createdRecommendations.push({
        id: document.id,
        ...decision,
        status: "pending",
      });
    }

    return NextResponse.json({
      success: true,
      generated: decisions.length,
      created: createdRecommendations.length,
      skippedAsDuplicates:
        decisions.length - createdRecommendations.length,
      recommendations: createdRecommendations,
      snapshotGeneratedAt: snapshot.generatedAt,
    });
  } catch (error: any) {
    console.error("AI CEO decision generation failed:", error);

    const message =
      error?.message ||
      "Unable to generate AI CEO recommendations.";

    const status =
      message === "Unauthorized admin access" ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}