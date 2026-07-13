import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  FieldValue,
  type DocumentData,
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

type RejectPredictionBody = {
  reason?: string;
};

type TimestampLike = {
  toDate: () => Date;
};

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate ===
      "function"
  ) {
    return (value as TimestampLike)
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function serializePrediction(
  id: string,
  data: DocumentData
) {
  return {
    id,
    ...data,
    createdAt:
      serializeTimestamp(data.createdAt),
    updatedAt:
      serializeTimestamp(data.updatedAt),
    generatedAt:
      serializeTimestamp(data.generatedAt) ||
      data.generatedAt ||
      null,
    approvedAt:
      serializeTimestamp(data.approvedAt),
    publishedAt:
      serializeTimestamp(data.publishedAt),
    rejectedAt:
      serializeTimestamp(data.rejectedAt),
    checkedAt:
      serializeTimestamp(data.checkedAt),
    reviewedAt:
      serializeTimestamp(data.reviewedAt),
  };
}

function cleanReason(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim().slice(0, 1000)
    : "";
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
    normalized.includes("invalid")
  ) {
    return 400;
  }

  if (
    normalized.includes("published")
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

    let body: RejectPredictionBody;

    try {
      body =
        (await request.json()) as RejectPredictionBody;
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

    const reason =
      cleanReason(body.reason);

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Rejection reason is required.",
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

    const transactionResult =
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
              "Published predictions cannot be rejected. Unpublish the prediction first."
            );
          }

          if (
            status === "rejected" &&
            String(
              prediction.rejectionReason ||
                ""
            ).trim() === reason
          ) {
            return {
              alreadyRejected: true,
              prediction,
            };
          }

          if (
            status !== "draft" &&
            status !== "review" &&
            status !== "approved" &&
            status !== "rejected"
          ) {
            throw new Error(
              `Invalid prediction status for rejection: ${status}.`
            );
          }

          transaction.update(
            predictionRef,
            {
              status: "rejected",

              rejectedAt:
                FieldValue.serverTimestamp(),
              rejectedBy:
                performedBy,
              rejectionReason:
                reason,

              approvedAt: null,
              approvedBy: null,

              publishedAt: null,
              publishedBy: null,

              "review.approved":
                false,
              "review.reviewedBy":
                null,
              "review.reviewedAt":
                null,

              humanReview: {
                fixtureVerified:
                  false,
                teamsVerified:
                  false,
                probabilitiesReviewed:
                  false,
                riskReviewed:
                  false,
                publicContentReviewed:
                  false,
                vipContentReviewed:
                  false,
                noMisleadingClaims:
                  false,
                finalApproval:
                  false,
                completed:
                  false,
                reviewedBy:
                  null,
                reviewedAt:
                  null,
              },

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
              action: "reject",
              predictionId,
              fixtureId:
                prediction.fixtureId ||
                null,
              previousStatus:
                status,
              newStatus:
                "rejected",
              reason,
              performedBy,
              humanReviewInvalidated:
                true,
              createdAt:
                FieldValue.serverTimestamp(),
            }
          );

          return {
            alreadyRejected: false,
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
            "Prediction was not found after rejection.",
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
          transactionResult.alreadyRejected
            ? "Prediction is already rejected with the same reason."
            : "Prediction rejected successfully.",
        prediction:
          serializePrediction(
            updatedSnapshot.id,
            updatedSnapshot.data() || {}
          ),
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
      "[PREDICTION_REJECT_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to reject prediction.";

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