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

type PredictionAction =
  | "correct"
  | "wrong"
  | "pending"
  | "delete";

type UpdateBody = {
  predictionId?: string;
  action?: PredictionAction;
};

function getActionMessage(
  predictionId: string,
  action: PredictionAction
) {
  if (action === "correct") {
    return `Prediction ${predictionId} marked as Correct`;
  }

  if (action === "wrong") {
    return `Prediction ${predictionId} marked as Wrong`;
  }

  if (action === "pending") {
    return `Prediction ${predictionId} reset to Pending`;
  }

  return `Prediction ${predictionId} deleted`;
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

  return 500;
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    let body: UpdateBody;

    try {
      body =
        (await request.json()) as UpdateBody;
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

    const predictionId =
      String(
        body.predictionId || ""
      ).trim();

    const action =
      body.action;

    if (!predictionId || !action) {
      return NextResponse.json(
        {
          success: false,
          error:
            "predictionId and action are required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (
      ![
        "correct",
        "wrong",
        "pending",
        "delete",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const ref = adminDb
      .collection(COLLECTION_NAME)
      .doc(predictionId);

    const snap =
      await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Prediction was not found.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const prediction =
      snap.data() || {};

    const performedBy =
      admin.email ||
      admin.uid ||
      "unknown-admin";

    const auditRef = adminDb
      .collection(
        "predictionAuditLogs"
      )
      .doc();

    const activityRef = adminDb
      .collection("activityLogs")
      .doc();

    const batch =
      adminDb.batch();

    if (action === "correct") {
      batch.update(ref, {
        correct: true,
        resultChecked: true,
        manuallyChecked: true,
        checkedBy: performedBy,
        checkedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      });
    } else if (action === "wrong") {
      batch.update(ref, {
        correct: false,
        resultChecked: true,
        manuallyChecked: true,
        checkedBy: performedBy,
        checkedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      });
    } else if (action === "pending") {
      batch.update(ref, {
        correct: null,
        resultChecked: false,
        manuallyChecked: false,
        checkedBy: null,
        checkedAt: null,
        updatedAt:
          FieldValue.serverTimestamp(),
      });
    } else {
      batch.delete(ref);
    }

    batch.set(auditRef, {
      action:
        `manual_${action}`,
      predictionId,
      fixtureId:
        prediction.fixtureId || null,
      previousCorrect:
        prediction.correct ?? null,
      performedBy,
      createdAt:
        FieldValue.serverTimestamp(),
    });

    batch.set(activityRef, {
      type: "prediction",
      actor: performedBy,
      message: getActionMessage(
        predictionId,
        action
      ),
      targetId: predictionId,
      metadata: {
        action,
        fixtureId:
          prediction.fixtureId || null,
        pick:
          prediction
            ?.vipPrediction
            ?.valueBet ||
          prediction
            ?.prediction
            ?.valueBet ||
          prediction.pick ||
          null,
        confidence:
          prediction
            ?.vipPrediction
            ?.confidence ??
          prediction
            ?.prediction
            ?.confidence ??
          prediction.confidence ??
          null,
      },
      createdAt:
        FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        message: getActionMessage(
          predictionId,
          action
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
      "[ADMIN_PREDICTION_UPDATE_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update prediction.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: getErrorStatus(message),
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}