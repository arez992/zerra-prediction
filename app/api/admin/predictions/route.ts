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
import {
  getCompleteFixtureData,
} from "@/lib/api-football/service";
import {
  toPredictionPipelineInput,
} from "@/lib/api-football/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION_NAME = "predictionHistory";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

type GeneratePredictionBody = {
  fixtureId?: string | number;
  fixture?: unknown;
  statistics?: unknown[];
  lineups?: unknown[];
  events?: unknown[];
  source?: string;
  overwrite?: boolean;

  includeHeadToHead?: boolean;
  includeInjuries?: boolean;
  includeOdds?: boolean;
  headToHeadLimit?: number;
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

function getFixtureIdFromFixture(
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

function normalizeFixtureId(
  value: unknown
): string {
  const fixtureId =
    value === undefined ||
    value === null
      ? ""
      : String(value).trim();

  if (!fixtureId) {
    return "";
  }

  if (!/^\d+$/.test(fixtureId)) {
    throw new Error(
      "A valid numeric fixture ID is required."
    );
  }

  return fixtureId;
}

function getSafeHeadToHeadLimit(
  value: unknown
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(
    20,
    Math.max(1, Math.floor(parsed))
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

  if (
    normalized.includes(
      "api_football_key"
    )
  ) {
    return 500;
  }

  if (
    normalized.includes(
      "api-football"
    )
  ) {
    return 502;
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

    const requestedFixtureId =
      normalizeFixtureId(
        body.fixtureId
      );

    const embeddedFixtureId =
      getFixtureIdFromFixture(
        body.fixture
      );

    if (
      requestedFixtureId &&
      embeddedFixtureId &&
      requestedFixtureId !==
        embeddedFixtureId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "fixtureId does not match the supplied fixture object.",
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
      requestedFixtureId ||
      normalizeFixtureId(
        embeddedFixtureId
      );

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

    let pipelineInput: {
      fixture: unknown;
      statistics: unknown[];
      lineups: unknown[];
      events: unknown[];
      source: string;
    };

    let sourceData:
      | {
          fetchedFromApiFootball: true;
          fetchedAt: string;
          availability: {
            fixture: boolean;
            statistics: boolean;
            events: boolean;
            lineups: boolean;
            headToHead: boolean;
            injuries: boolean;
            odds: boolean;
          };
          headToHead: unknown[];
          injuries: unknown[];
          odds: unknown[];
        }
      | {
          fetchedFromApiFootball: false;
          fetchedAt: null;
          availability: null;
          headToHead: unknown[];
          injuries: unknown[];
          odds: unknown[];
        };

    if (requestedFixtureId) {
      const completeFixtureData =
        await getCompleteFixtureData(
          fixtureId,
          {
            includeHeadToHead:
              body.includeHeadToHead !==
              false,
            includeInjuries:
              body.includeInjuries !==
              false,
            includeOdds:
              body.includeOdds === true,
            headToHeadLimit:
              getSafeHeadToHeadLimit(
                body.headToHeadLimit
              ),
          }
        );

      pipelineInput = {
        ...toPredictionPipelineInput(
          completeFixtureData
        ),
        source:
          typeof body.source ===
            "string" &&
          body.source.trim()
            ? body.source.trim()
            : "api-football-admin",
      };

      sourceData = {
        fetchedFromApiFootball: true,
        fetchedAt:
          completeFixtureData.fetchedAt,
        availability:
          completeFixtureData.availability,
        headToHead:
          completeFixtureData.headToHead,
        injuries:
          completeFixtureData.injuries,
        odds:
          completeFixtureData.odds,
      };
    } else {
      pipelineInput = {
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
            : "admin-api-manual",
      };

      sourceData = {
        fetchedFromApiFootball: false,
        fetchedAt: null,
        availability: null,
        headToHead: [],
        injuries: [],
        odds: [],
      };
    }

    const engineResult =
      await runPredictionEngine(
        pipelineInput
      );

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

      prediction:
        engineResult.data.prediction,

      sourceData,

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
      source:
        pipelineInput.source,
      fetchedFromApiFootball:
        sourceData
          .fetchedFromApiFootball,
      dataAvailability:
        sourceData.availability,
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