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
import {
  runPredictionEngine,
} from "@/lib/ai/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION_NAME = "predictionHistory";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

type GeneratePredictionBody = {
  fixture?: unknown;
  statistics?: unknown[];
  lineups?: unknown[];
  events?: unknown[];
  source?: string;
  overwrite?: boolean;
};

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as {
      toDate?: unknown;
    }).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
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
    checkedAt:
      serializeTimestamp(data.checkedAt),
    reviewedAt:
      serializeTimestamp(data.reviewedAt),
    publishedAt:
      serializeTimestamp(data.publishedAt),
  };
}

function getSafeLimit(
  value: string | null
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(parsed))
  );
}

function getFixtureId(
  fixture: unknown
): string {
  if (
    !fixture ||
    typeof fixture !== "object" ||
    Array.isArray(fixture)
  ) {
    return "";
  }

  const source = fixture as {
    fixture?: {
      id?: number | string;
    };
  };

  const fixtureId =
    source.fixture?.id;

  return fixtureId === undefined ||
    fixtureId === null
    ? ""
    : String(fixtureId).trim();
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
    normalized.includes("required") ||
    normalized.includes("invalid")
  ) {
    return 400;
  }

  if (
    normalized.includes(
      "already exists"
    )
  ) {
    return 409;
  }

  return 500;
}

export async function GET(
  request: NextRequest
) {
  try {
    await requireServerAdmin();

    const limit = getSafeLimit(
      request.nextUrl.searchParams.get(
        "limit"
      )
    );

    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const predictions =
      snapshot.docs.map((document) =>
        serializePrediction(
          document.id,
          document.data()
        )
      );

    return NextResponse.json(
      {
        success: true,
        predictions,
        count: predictions.length,
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
      "[ADMIN_PREDICTIONS_GET_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load predictions.";

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

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    let body: GeneratePredictionBody;

    try {
      body =
        (await request.json()) as GeneratePredictionBody;
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

    const fixtureId =
      getFixtureId(body.fixture);

    if (!fixtureId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fixture ID is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const predictionRef = adminDb
      .collection(COLLECTION_NAME)
      .doc(`fixture-${fixtureId}`);

    const existing =
      await predictionRef.get();

    if (
      existing.exists &&
      body.overwrite !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A prediction for this fixture already exists.",
          prediction:
            serializePrediction(
              existing.id,
              existing.data() || {}
            ),
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const engineResult =
      await runPredictionEngine({
        fixture: body.fixture,
        statistics: Array.isArray(
          body.statistics
        )
          ? body.statistics
          : [],
        lineups: Array.isArray(
          body.lineups
        )
          ? body.lineups
          : [],
        events: Array.isArray(
          body.events
        )
          ? body.events
          : [],
        source:
          typeof body.source ===
            "string" &&
          body.source.trim()
            ? body.source.trim()
            : "admin-api",
      });

    if (!engineResult.success) {
      throw new Error(
        engineResult.error
      );
    }

    const performedBy =
      admin.email ||
      admin.uid ||
      "unknown-admin";

    const now =
      new Date().toISOString();

    const documentData = {
      ...engineResult.data.document,

      /*
       * Backward-compatible nested object used by
       * existing admin history and activity screens.
       */
      prediction:
        engineResult.data.prediction,

      /*
       * Accuracy tracking fields.
       */
      correct:
        engineResult.data.validation
          .correct,
      result:
        engineResult.data.validation
          .result,
      resultChecked:
        engineResult.data.validation
          .checked,
      manuallyChecked: false,
      checkedAt:
        engineResult.data.validation
          .checked
          ? now
          : null,

      createdBy: performedBy,
      updatedBy: performedBy,

      createdAt:
        existing.exists &&
        existing.data()?.createdAt
          ? existing.data()?.createdAt
          : FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    };

    const auditRef = adminDb
      .collection(
        "predictionAuditLogs"
      )
      .doc();

    const batch =
      adminDb.batch();

    batch.set(
      predictionRef,
      documentData,
      {
        merge: body.overwrite === true,
      }
    );

    batch.set(auditRef, {
      action:
        existing.exists
          ? "regenerate"
          : "generate",
      predictionId:
        predictionRef.id,
      fixtureId,
      performedBy,
      modelVersion:
        engineResult.data.prediction
          .model.version,
      createdAt:
        FieldValue.serverTimestamp(),
    });

    await batch.commit();

    const savedDocument =
      await predictionRef.get();

    return NextResponse.json(
      {
        success: true,
        message:
          existing.exists
            ? "Prediction regenerated successfully."
            : "Prediction generated and saved successfully.",
        prediction:
          serializePrediction(
            savedDocument.id,
            savedDocument.data() || {}
          ),
      },
      {
        status:
          existing.exists ? 200 : 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[ADMIN_PREDICTIONS_POST_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate prediction.";

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