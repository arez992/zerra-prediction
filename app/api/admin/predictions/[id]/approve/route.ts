import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  FieldValue,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION_NAME = "predictionHistory";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type HumanReviewBody = {
  humanReview?: {
    fixtureVerified?: boolean;
    teamsVerified?: boolean;
    probabilitiesReviewed?: boolean;
    riskReviewed?: boolean;
    publicContentReviewed?: boolean;
    vipContentReviewed?: boolean;
    noMisleadingClaims?: boolean;
    finalApproval?: boolean;
  };
};

const REVIEW_FIELDS = [
  "fixtureVerified",
  "teamsVerified",
  "probabilitiesReviewed",
  "riskReviewed",
  "publicContentReviewed",
  "vipContentReviewed",
  "noMisleadingClaims",
  "finalApproval",
] as const;

type ReviewField =
  (typeof REVIEW_FIELDS)[number];

type HumanReviewChecklist =
  Record<ReviewField, boolean>;

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

  const source =
    value as Record<string, unknown>;

  const checklist =
    {} as HumanReviewChecklist;

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
    (field) =>
      checklist[field] !== true
  );
}

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("unauthorized") ||
    normalized.includes(
      "authentication required"
    ) ||
    normalized.includes(
      "not authenticated"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes("forbidden") ||
    normalized.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  if (
    normalized.includes("not found")
  ) {
    return 404;
  }

  if (
    normalized.includes("required") ||
    normalized.includes("invalid") ||
    normalized.includes("must be confirmed")
  ) {
    return 400;
  }

  if (
    normalized.includes("published") ||
    normalized.includes("approved")
  ) {
    return 409;
  }

  return 500;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin =
      await requireServerAdmin();

    const { id } =
      await context.params;

    const predictionId =
      decodeURIComponent(
        id || ""
      ).trim();

    if (!predictionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Prediction ID is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    let body: HumanReviewBody;

    try {
      body =
        (await request.json()) as HumanReviewBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const checklist =
      parseChecklist(
        body.humanReview
      );

    if (!checklist) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Human review checklist is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const incompleteFields =
      getIncompleteFields(
        checklist
      );

    if (
      incompleteFields.length > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Every human review checklist item must be confirmed before approval.",
          incompleteFields,
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const predictionRef =
      adminDb
        .collection(
          COLLECTION_NAME
        )
        .doc(predictionId);

    const performedBy =
      admin.email ||
      admin.uid ||
      "unknown-admin";

    const result =
      await adminDb.runTransaction(
        async (transaction) => {
          const snapshot =
            await transaction.get(
              predictionRef
            );

          if (!snapshot.exists) {
            throw new Error(
              "Prediction was not found."
            );
          }

          const prediction =
            snapshot.data() || {};

          const status =
            String(
              prediction.status ||
                "draft"
            );

          if (
            status === "published"
          ) {
            throw new Error(
              "Published predictions cannot be approved again."
            );
          }

          if (
            status === "approved"
          ) {
            return {
              alreadyApproved: true,
              prediction,
            };
          }

          if (
            status !== "draft" &&
            status !== "rejected" &&
            status !== "review"
          ) {
            throw new Error(
              `Invalid prediction status for approval: ${status}.`
            );
          }

          transaction.update(
            predictionRef,
            {
              status: "approved",
              approvedAt:
                FieldValue.serverTimestamp(),
              approvedBy:
                performedBy,

              "review.approved": true,
              "review.reviewedBy":
                performedBy,
              "review.reviewedAt":
                FieldValue.serverTimestamp(),

              humanReview: {
                ...checklist,
                completed: true,
                reviewedBy:
                  performedBy,
                reviewedAt:
                  FieldValue.serverTimestamp(),
              },

              rejectedAt: null,
              rejectedBy: null,
              rejectionReason: null,

              updatedBy:
                performedBy,
              updatedAt:
                FieldValue.serverTimestamp(),
            }
          );

          const auditRef =
            adminDb
              .collection(
                "predictionAuditLogs"
              )
              .doc();

          transaction.set(
            auditRef,
            {
              action: "approve",
              predictionId,
              fixtureId:
                prediction.fixtureId ||
                null,
              previousStatus:
                status,
              newStatus:
                "approved",
              performedBy,
              checklist,
              createdAt:
                FieldValue.serverTimestamp(),
            }
          );

          return {
            alreadyApproved: false,
            prediction,
          };
        }
      );

    const updatedSnapshot =
      await predictionRef.get();

    if (!updatedSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Prediction was not found after approval.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          result.alreadyApproved
            ? "Prediction is already approved."
            : "Prediction approved successfully.",
        prediction: {
          id:
            updatedSnapshot.id,
          ...updatedSnapshot.data(),
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
    console.error(
      "[PREDICTION_APPROVE_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to approve prediction.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(message),
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}