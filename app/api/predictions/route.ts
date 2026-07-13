import {
  NextRequest,
  NextResponse,
} from "next/server";
import type {
  DocumentData,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION_NAME = "predictionHistory";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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
    .slice(0, 8);
}

function toPublicPrediction(
  id: string,
  data: DocumentData
) {
  const publicPrediction =
    data.publicPrediction &&
    typeof data.publicPrediction ===
      "object" &&
    !Array.isArray(data.publicPrediction)
      ? (data.publicPrediction as Record<
          string,
          unknown
        >)
      : {};

  const competition =
    data.competition &&
    typeof data.competition === "object" &&
    !Array.isArray(data.competition)
      ? (data.competition as Record<
          string,
          unknown
        >)
      : {};

  const teams =
    data.teams &&
    typeof data.teams === "object" &&
    !Array.isArray(data.teams)
      ? (data.teams as Record<
          string,
          unknown
        >)
      : {};

  const homeTeam =
    teams.home &&
    typeof teams.home === "object" &&
    !Array.isArray(teams.home)
      ? (teams.home as Record<
          string,
          unknown
        >)
      : {};

  const awayTeam =
    teams.away &&
    typeof teams.away === "object" &&
    !Array.isArray(teams.away)
      ? (teams.away as Record<
          string,
          unknown
        >)
      : {};

  const fixtureStatus =
    data.fixtureStatus &&
    typeof data.fixtureStatus === "object" &&
    !Array.isArray(data.fixtureStatus)
      ? (data.fixtureStatus as Record<
          string,
          unknown
        >)
      : {};

  return {
    id,
    fixtureId:
      normalizeText(data.fixtureId) ||
      id.replace(/^fixture-/, ""),

    sport: "Football",

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
      normalizeText(data.fixtureDate) ||
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
      "index"
    ) ||
    normalized.includes(
      "firestore"
    )
  ) {
    return 500;
  }

  return 500;
}

export async function GET(
  request: NextRequest
) {
  try {
    const limit = getSafeLimit(
      request.nextUrl.searchParams.get(
        "limit"
      )
    );

    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where(
        "status",
        "==",
        "published"
      )
      .orderBy(
        "publishedAt",
        "desc"
      )
      .limit(limit)
      .get();

    const predictions =
      snapshot.docs.map((document) =>
        toPublicPrediction(
          document.id,
          document.data()
        )
      );

    return NextResponse.json(
      {
        success: true,
        engine:
          "ZERRA AI Prediction Engine",
        sport: "Football",
        count: predictions.length,
        predictions,
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
      "[PUBLIC_PREDICTIONS_GET_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load public predictions.";

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