import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  requireServerVipOrAdmin,
} from "@/lib/serverVipAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION_NAME =
  "predictionHistory";

type BatchRequestBody = {
  fixtureIds?: unknown;
};

function normalizeFixtureIds(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          String(item).trim()
        )
        .filter((item) =>
          /^\d+$/.test(item)
        )
    )
  ).slice(0, 50);
}

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate: () => Date;
      }
    ).toDate === "function"
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

  return typeof value === "string"
    ? value
    : null;
}

function normalizeNumber(
  value: unknown
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function normalizeText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is string =>
        typeof item === "string"
    )
    .map((item) =>
      item.trim()
    )
    .filter(Boolean)
    .slice(0, 20);
}

function toPrediction(
  id: string,
  data: Record<
    string,
    any
  >
) {
  const vipPrediction =
    data.vipPrediction &&
    typeof data.vipPrediction ===
      "object"
      ? data.vipPrediction
      : {};

  const markets =
    vipPrediction.markets &&
    typeof vipPrediction.markets ===
      "object"
      ? vipPrediction.markets
      : {};

  const expectedGoals =
    vipPrediction.expectedGoals &&
    typeof vipPrediction.expectedGoals ===
      "object"
      ? vipPrediction.expectedGoals
      : {};

  return {
    id,
    fixtureId:
      normalizeText(
        data.fixtureId
      ) ||
      id.replace(
        /^fixture-/,
        ""
      ),

    vipPrediction: {
      finalPrediction:
        normalizeText(
          vipPrediction.finalPrediction
        ),

      confidence:
        normalizeNumber(
          vipPrediction.confidence
        ),

      exactScore:
        normalizeText(
          vipPrediction.exactScore
        ),

      valueBet:
        normalizeText(
          vipPrediction.valueBet
        ),

      markets: {
        homeWin:
          normalizeNumber(
            markets.homeWin
          ),
        draw:
          normalizeNumber(
            markets.draw
          ),
        awayWin:
          normalizeNumber(
            markets.awayWin
          ),
        over25:
          normalizeNumber(
            markets.over25
          ),
        under25:
          normalizeNumber(
            markets.under25
          ),
        btts:
          normalizeNumber(
            markets.btts
          ),
      },

      expectedGoals: {
        home:
          normalizeNumber(
            expectedGoals.home
          ),
        away:
          normalizeNumber(
            expectedGoals.away
          ),
        total:
          normalizeNumber(
            expectedGoals.total
          ),
      },

      reasoning:
        normalizeStringArray(
          vipPrediction.reasoning
        ),
    },

    publishedAt:
      serializeTimestamp(
        data.publishedAt
      ),

    updatedAt:
      serializeTimestamp(
        data.updatedAt
      ),
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const viewer =
      await requireServerVipOrAdmin();

    const body =
      (await request.json()) as BatchRequestBody;

    const fixtureIds =
      normalizeFixtureIds(
        body.fixtureIds
      );

    if (
      fixtureIds.length === 0
    ) {
      return NextResponse.json(
        {
          success: true,
          access: {
            role: viewer.role,
            plan: viewer.plan,
            expiresAt:
              viewer.expiresAt,
          },
          predictions: {},
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        }
      );
    }

    const documentRefs =
      fixtureIds.map(
        (fixtureId) =>
          adminDb
            .collection(
              COLLECTION_NAME
            )
            .doc(
              `fixture-${fixtureId}`
            )
      );

    const documents =
      await adminDb.getAll(
        ...documentRefs
      );

    const predictions: Record<
      string,
      unknown
    > = {};

    documents.forEach(
      (
        document,
        index
      ) => {
        if (!document.exists) {
          return;
        }

        const data =
          document.data() || {};

        if (
          data.status !==
          "published"
        ) {
          return;
        }

        const fixtureId =
          fixtureIds[index];

        predictions[
          fixtureId
        ] = toPrediction(
          document.id,
          data
        );
      }
    );

    return NextResponse.json(
      {
        success: true,

        access: {
          role: viewer.role,
          plan: viewer.plan,
          expiresAt:
            viewer.expiresAt,
        },

        predictions,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[VIP_PREDICTIONS_BATCH_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load VIP predictions.";

    const normalized =
      message.toLowerCase();

    const status =
      normalized.includes(
        "authentication required"
      )
        ? 401
        : normalized.includes(
            "vip access required"
          )
        ? 403
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }
}