import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  DocumentData,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  requireServerVipOrAdmin,
} from "@/lib/serverVipAuth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const COLLECTION_NAME =
  "predictionHistory";

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
    typeof value ===
      "object" &&
    "toDate" in value &&
    typeof (
      value as TimestampLike
    ).toDate ===
      "function"
  ) {
    return (
      value as TimestampLike
    )
      .toDate()
      .toISOString();
  }

  if (
    value instanceof
    Date
  ) {
    return value
      .toISOString();
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  return null;
}

function normalizeText(
  value: unknown,
  fallback = ""
): string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  )
    ? value.trim()
    : fallback;
}

function normalizeStringArray(
  value: unknown
): string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ) =>
        normalizeText(
          item
        )
    )
    .filter(
      Boolean
    )
    .slice(
      0,
      30
    );
}

function normalizeNumber(
  value: unknown
): number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}

function normalizeBoolean(
  value: unknown
): boolean | null {
  return (
    typeof value ===
      "boolean"
  )
    ? value
    : null;
}

function asRecord(
  value: unknown
): Record<
  string,
  unknown
> {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function toVipPrediction(
  id: string,
  data:
    DocumentData
) {
  const competition =
    asRecord(
      data.competition
    );

  const teams =
    asRecord(
      data.teams
    );

  const homeTeam =
    asRecord(
      teams.home
    );

  const awayTeam =
    asRecord(
      teams.away
    );

  const fixtureStatus =
    asRecord(
      data.fixtureStatus
    );

  const vipPrediction =
    asRecord(
      data.vipPrediction
    );

  const primaryPrediction =
    asRecord(
      vipPrediction
        .primaryPrediction
    );

  const markets =
    asRecord(
      vipPrediction
        .markets
    );

  const expectedGoals =
    asRecord(
      vipPrediction
        .expectedGoals
    );

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

    sport:
      "Football",

    competition: {
      name:
        normalizeText(
          competition.name,
          "Football"
        ),

      country:
        normalizeText(
          competition.country
        ) ||
        null,

      round:
        normalizeText(
          competition.round
        ) ||
        null,

      season:
        normalizeNumber(
          competition.season
        ),
    },

    teams: {
      home: {
        name:
          normalizeText(
            homeTeam.name,
            "Home team"
          ),
      },

      away: {
        name:
          normalizeText(
            awayTeam.name,
            "Away team"
          ),
      },
    },

    fixtureDate:
      serializeTimestamp(
        data.fixtureDate
      ) ||
      normalizeText(
        data.fixtureDate
      ) ||
      null,

    fixtureStatus: {
      short:
        normalizeText(
          fixtureStatus.short
        ) ||
        null,

      long:
        normalizeText(
          fixtureStatus.long
        ) ||
        null,
    },

    vipPrediction: {
      /*
       * Canonical market prediction.
       */
      primaryPrediction: {
        category:
          normalizeText(
            primaryPrediction
              .category
          ),

        pick:
          normalizeText(
            primaryPrediction
              .pick
          ),

        confidence:
          normalizeNumber(
            primaryPrediction
              .confidence
          ),

        qualified:
          normalizeBoolean(
            primaryPrediction
              .qualified
          ),

        reason:
          normalizeText(
            primaryPrediction
              .reason
          ),
      },

      /*
       * Backward-compatible fields.
       */
      finalPrediction:
        normalizeText(
          vipPrediction
            .finalPrediction
        ),

      confidence:
        normalizeNumber(
          vipPrediction
            .confidence
        ),

      exactScore:
        normalizeText(
          vipPrediction
            .exactScore
        ),

      valueBet:
        normalizeText(
          vipPrediction
            .valueBet
        ),

      markets: {
        /*
         * Supporting 1X2.
         */
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

        /*
         * Core goal markets.
         */
        over15:
          normalizeNumber(
            markets.over15
          ),

        under15:
          normalizeNumber(
            markets.under15
          ),

        over25:
          normalizeNumber(
            markets.over25
          ),

        under25:
          normalizeNumber(
            markets.under25
          ),

        over35:
          normalizeNumber(
            markets.over35
          ),

        under35:
          normalizeNumber(
            markets.under35
          ),

        /*
         * BTTS.
         */
        btts:
          normalizeNumber(
            markets.btts
          ),

        bttsYes:
          normalizeNumber(
            markets.bttsYes
          ),

        bttsNo:
          normalizeNumber(
            markets.bttsNo
          ),

        /*
         * Team Total Goals.
         */
        homeOver05:
          normalizeNumber(
            markets.homeOver05
          ),

        homeUnder05:
          normalizeNumber(
            markets.homeUnder05
          ),

        homeOver15:
          normalizeNumber(
            markets.homeOver15
          ),

        homeUnder15:
          normalizeNumber(
            markets.homeUnder15
          ),

        awayOver05:
          normalizeNumber(
            markets.awayOver05
          ),

        awayUnder05:
          normalizeNumber(
            markets.awayUnder05
          ),

        awayOver15:
          normalizeNumber(
            markets.awayOver15
          ),

        awayUnder15:
          normalizeNumber(
            markets.awayUnder15
          ),

        /*
         * Double Chance.
         */
        doubleChance1X:
          normalizeNumber(
            markets
              .doubleChance1X
          ),

        doubleChanceX2:
          normalizeNumber(
            markets
              .doubleChanceX2
          ),

        doubleChance12:
          normalizeNumber(
            markets
              .doubleChance12
          ),
      },

      expectedGoals: {
        home:
          normalizeNumber(
            expectedGoals
              .home
          ),

        away:
          normalizeNumber(
            expectedGoals
              .away
          ),

        total:
          normalizeNumber(
            expectedGoals
              .total
          ),
      },

      reasoning:
        normalizeStringArray(
          vipPrediction
            .reasoning
        ),
    },

    model:
      data.model ||
      null,

    risk:
      data.risk ||
      null,

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

async function findPublishedPrediction(
  rawId:
    string
) {
  const id =
    decodeURIComponent(
      rawId
    ).trim();

  if (!id) {
    throw new Error(
      "Prediction ID is required."
    );
  }

  const directDocument =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .doc(
        id
      )
      .get();

  if (
    directDocument
      .exists &&
    directDocument
      .data()
      ?.status ===
      "published"
  ) {
    return directDocument;
  }

  const normalizedFixtureId =
    id.replace(
      /^fixture-/,
      ""
    );

  if (
    !/^\d+$/.test(
      normalizedFixtureId
    )
  ) {
    return null;
  }

  const deterministicDocument =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .doc(
        `fixture-${normalizedFixtureId}`
      )
      .get();

  if (
    deterministicDocument
      .exists &&
    deterministicDocument
      .data()
      ?.status ===
      "published"
  ) {
    return deterministicDocument;
  }

  const fixtureQuery =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .where(
        "fixtureId",
        "==",
        normalizedFixtureId
      )
      .where(
        "status",
        "==",
        "published"
      )
      .limit(
        1
      )
      .get();

  if (
    !fixtureQuery.empty
  ) {
    return (
      fixtureQuery
        .docs[0]
    );
  }

  return null;
}

function getErrorStatus(
  message:
    string
): number {
  const normalized =
    message.toLowerCase();

  if (
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
    normalized.includes(
      "vip access required"
    ) ||
    normalized.includes(
      "forbidden"
    )
  ) {
    return 403;
  }

  if (
    normalized.includes(
      "not found"
    )
  ) {
    return 404;
  }

  if (
    normalized.includes(
      "required"
    ) ||
    normalized.includes(
      "invalid"
    )
  ) {
    return 400;
  }

  return 500;
}

export async function GET(
  _request:
    NextRequest,

  context:
    RouteContext
) {
  try {
    const viewer =
      await requireServerVipOrAdmin();

    const {
      id,
    } =
      await context.params;

    const document =
      await findPublishedPrediction(
        id
      );

    if (
      !document
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Published VIP prediction was not found.",
        },
        {
          status:
            404,

          headers: {
            "Cache-Control":
              "private, no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        access: {
          role:
            viewer.role,

          plan:
            viewer.plan,

          expiresAt:
            viewer.expiresAt,
        },

        prediction:
          toVipPrediction(
            document.id,
            document.data() ||
              {}
          ),
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[VIP_PREDICTION_DETAIL_GET_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to load VIP prediction.";

    return NextResponse.json(
      {
        success:
          false,

        error:
          message,
      },
      {
        status:
          getErrorStatus(
            message
          ),

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }
}