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
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as TimestampLike
    ).toDate === "function"
  ) {
    return (
      value as TimestampLike
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

function normalizeText(
  value: unknown,
  fallback = ""
): string {
  return typeof value === "string" &&
    value.trim().length > 0
    ? value.trim()
    : fallback;
}

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      normalizeText(item)
    )
    .filter(Boolean)
    .slice(0, 12);
}

function toPublicPrediction(
  id: string,
  data: DocumentData
) {
  const publicPrediction =
    data.publicPrediction &&
    typeof data.publicPrediction ===
      "object" &&
    !Array.isArray(
      data.publicPrediction
    )
      ? (data.publicPrediction as Record<
          string,
          unknown
        >)
      : {};

  const competition =
    data.competition &&
    typeof data.competition ===
      "object" &&
    !Array.isArray(
      data.competition
    )
      ? (data.competition as Record<
          string,
          unknown
        >)
      : {};

  const teams =
    data.teams &&
    typeof data.teams ===
      "object" &&
    !Array.isArray(data.teams)
      ? (data.teams as Record<
          string,
          unknown
        >)
      : {};

  const homeTeam =
    teams.home &&
    typeof teams.home ===
      "object" &&
    !Array.isArray(
      teams.home
    )
      ? (teams.home as Record<
          string,
          unknown
        >)
      : {};

  const awayTeam =
    teams.away &&
    typeof teams.away ===
      "object" &&
    !Array.isArray(
      teams.away
    )
      ? (teams.away as Record<
          string,
          unknown
        >)
      : {};

  const fixtureStatus =
    data.fixtureStatus &&
    typeof data.fixtureStatus ===
      "object" &&
    !Array.isArray(
      data.fixtureStatus
    )
      ? (data.fixtureStatus as Record<
          string,
          unknown
        >)
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
        ) || null,

      round:
        normalizeText(
          competition.round
        ) || null,

      season:
        typeof competition.season ===
          "number" &&
        Number.isFinite(
          competition.season
        )
          ? competition.season
          : null,
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
        ) || null,

      long:
        normalizeText(
          fixtureStatus.long
        ) || null,
    },

    publicPrediction: {
      overview:
        normalizeText(
          publicPrediction.overview,
          "Public match analysis is available."
        ),

      risk:
        normalizeText(
          publicPrediction.risk,
          "Medium"
        ),

      riskScore:
        typeof publicPrediction.riskScore ===
          "number" &&
        Number.isFinite(
          publicPrediction.riskScore
        )
          ? publicPrediction.riskScore
          : null,

      keyInsights:
        normalizeStringArray(
          publicPrediction.keyInsights
        ),

      teaser:
        normalizeText(
          publicPrediction.teaser,
          "The final prediction and premium match intelligence are reserved for VIP members."
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

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

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

  if (
    normalized.includes(
      "not found"
    )
  ) {
    return 404;
  }

  return 500;
}

async function findPublishedPrediction(
  rawId: string
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

  /*
   * First try the exact document ID.
   * Example: fixture-123
   */
  const directDocument =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .doc(id)
      .get();

  if (
    directDocument.exists &&
    directDocument.data()
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

  /*
   * Avoid reading the same deterministic
   * document twice when id is already
   * fixture-{id}.
   */
  if (
    id !==
    `fixture-${normalizedFixtureId}`
  ) {
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
      deterministicDocument.exists &&
      deterministicDocument.data()
        ?.status ===
        "published"
    ) {
      return deterministicDocument;
    }
  }

  /*
   * Legacy fallback:
   * find by fixtureId + published status.
   */
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
      .limit(1)
      .get();

  if (
    !fixtureQuery.empty
  ) {
    return fixtureQuery.docs[0];
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      id,
    } =
      await context.params;

    const document =
      await findPublishedPrediction(
        id
      );

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Published prediction was not found.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "public, s-maxage=30, stale-while-revalidate=120",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        prediction:
          toPublicPrediction(
            document.id,
            document.data() ||
              {}
          ),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "[PUBLIC_PREDICTION_DETAIL_GET_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load public prediction.";

    return NextResponse.json(
      {
        success: false,
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
            "no-store",
        },
      }
    );
  }
}