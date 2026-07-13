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
    normalized.includes(
      "only approved"
    ) ||
    normalized.includes(
      "cannot be published"
    )
  ) {
    return 409;
  }

  return 500;
}

export async function POST(
  _request: NextRequest,
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
            return {
              alreadyPublished: true,
              prediction,
            };
          }

          if (
            status !== "approved"
          ) {
            throw new Error(
              "Only approved predictions can be published."
            );
          }

          transaction.update(
            predictionRef,
            {
              status: "published",
              publishedAt:
                FieldValue.serverTimestamp(),
              publishedBy:
                performedBy,
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
              action: "publish",
              predictionId,
              fixtureId:
                prediction.fixtureId ||
                null,
              previousStatus:
                status,
              newStatus:
                "published",
              performedBy,
              createdAt:
                FieldValue.serverTimestamp(),
            }
          );

          return {
            alreadyPublished: false,
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
            "Prediction was not found after publishing.",
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
          transactionResult.alreadyPublished
            ? "Prediction is already published."
            : "Prediction published successfully.",
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
      "[PREDICTION_PUBLISH_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to publish prediction.";

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