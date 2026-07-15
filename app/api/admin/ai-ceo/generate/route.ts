import {
  NextResponse,
} from "next/server";
import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  collectAICEOData,
} from "@/lib/ai-ceo/dataCollector";
import {
  generateCEODecisions,
  type CEODecision,
} from "@/lib/ai-ceo/decisionEngine";
import {
  runLegacyGenerateShadow,
} from "@/lib/ai-ceo/shadow/LegacyGenerateAdapter";
import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreatedRecommendation = CEODecision & {
  id: string;
  status: "pending";
};

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "unauthorized"
    ) ||
    normalized.includes(
      "authentication required"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes(
      "forbidden"
    ) ||
    normalized.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  return 500;
}

export async function POST() {
  try {
    const admin =
      await requireServerAdmin();

    const snapshot =
      await collectAICEOData();

    const decisions =
      generateCEODecisions(
        snapshot
      );

    const createdRecommendations:
      CreatedRecommendation[] = [];

    for (const decision of decisions) {
      const duplicateSnapshot =
        await adminDb
          .collection(
            "ceoRecommendations"
          )
          .where(
            "title",
            "==",
            decision.title
          )
          .where(
            "status",
            "in",
            [
              "pending",
              "approved",
              "executing",
            ]
          )
          .limit(1)
          .get();

      if (
        !duplicateSnapshot.empty
      ) {
        continue;
      }

      const recommendation = {
        ...decision,
        status: "pending" as const,

        createdBy:
          admin.email ||
          admin.uid ||
          "ai-ceo",

        dataSnapshotAt:
          snapshot.generatedAt,

        createdAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),

        approvedAt: null,
        rejectedAt: null,
        executedAt: null,
        completedAt: null,

        result: null,
        rejectionReason: null,
      };

      const document =
        await adminDb
          .collection(
            "ceoRecommendations"
          )
          .add(
            recommendation
          );

      createdRecommendations.push({
        id: document.id,
        ...decision,
        status: "pending",
      });
    }

    /*
     * ZAOS shadow validation runs after the
     * production recommendations have been
     * generated and saved.
     *
     * The adapter handles its own errors, so
     * a shadow failure cannot fail this route.
     */
    const shadow =
      await runLegacyGenerateShadow(
        snapshot,
        decisions,
        {
          requestedBy:
            admin.email ||
            admin.uid ||
            "unknown-admin",
          route:
            "/api/admin/ai-ceo/generate",
          generatedRecommendationIds:
            decisions.map(
              (decision) =>
                decision.title
            ),
          createdRecommendationIds:
            createdRecommendations.map(
              (recommendation) =>
                recommendation.id
            ),
          generatedCount:
            decisions.length,
          createdCount:
            createdRecommendations.length,
          duplicateCount:
            decisions.length -
            createdRecommendations.length,
        }
      );

    if (
      shadow.error ||
      shadow.persistenceError
    ) {
      console.warn(
        "[AI_CEO_GENERATE_SHADOW_WARNING]",
        {
          error:
            shadow.error,
          persistenceError:
            shadow.persistenceError,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        generated:
          decisions.length,
        created:
          createdRecommendations.length,
        skippedAsDuplicates:
          decisions.length -
          createdRecommendations.length,
        recommendations:
          createdRecommendations,
        snapshotGeneratedAt:
          snapshot.generatedAt,

        shadow: {
          attempted:
            shadow.attempted,
          skipped:
            shadow.skipped,
          persisted:
            shadow.persisted,
          historyRecordId:
            shadow.historyRecordId,
          acceptable:
            shadow.acceptable,
          score:
            shadow.score,
          error:
            shadow.error ||
            shadow.persistenceError,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "AI CEO decision generation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate AI CEO recommendations.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(message),
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}