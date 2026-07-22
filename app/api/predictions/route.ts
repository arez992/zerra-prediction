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

const DEFAULT_LIMIT =
  20;

const MAX_LIMIT =
  50;

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

function getSafeLimit(
  value:
    string | null
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(
        parsed
      )
    )
  );
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
      8
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

function normalizeDate(
  value:
    string | null
): string | null {
  if (
    value ===
    null
  ) {
    return null;
  }

  const date =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      "Date must use YYYY-MM-DD format."
    );
  }

  return date;
}

function getFixtureDateKey(
  value: unknown
): string {
  const serialized =
    serializeTimestamp(
      value
    ) ||
    normalizeText(
      value
    );

  return serialized
    ? serialized.slice(
        0,
        10
      )
    : "";
}

function getPublishedTime(
  data:
    DocumentData
): number {
  const value =
    serializeTimestamp(
      data.publishedAt
    );

  if (
    !value
  ) {
    return 0;
  }

  const timestamp =
    Date.parse(
      value
    );

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}

function toPublicPrediction(
  id:
    string,

  data:
    DocumentData
) {
  const publicPrediction =
    asRecord(
      data.publicPrediction
    );

  const vipPrediction =
    asRecord(
      data.vipPrediction
    );

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

  const isFree =
    data.isFree ===
    true;

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

    isFree,

    freeSelectionDate:
      isFree
        ? normalizeText(
            data.freeSelectionDate
          ) ||
          null
        : null,

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
    },

    teams: {
      home: {
        name:
          normalizeText(
            homeTeam.name,
            "Home team"
          ),

        logo:
          normalizeText(
            homeTeam.logo
          ) ||
          null,
      },

      away: {
        name:
          normalizeText(
            awayTeam.name,
            "Away team"
          ),

        logo:
          normalizeText(
            awayTeam.logo
          ) ||
          null,
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
        normalizeNumber(
          publicPrediction.riskScore
        ),

      marketCategory:
        normalizeText(
          publicPrediction
            .marketCategory
        ) ||
        null,

      keyInsights:
        normalizeStringArray(
          publicPrediction
            .keyInsights
        ),

      teaser:
        normalizeText(
          publicPrediction.teaser,
          "The strongest qualified prediction and premium match intelligence are reserved for VIP members."
        ),
    },

    /*
     * VIP data remains protected for normal
     * predictions. It is exposed only when
     * AI CEO has explicitly marked this record
     * as a daily free prediction.
     */
    freePrediction:
      isFree
        ? {
            finalPrediction:
              normalizeText(
                vipPrediction.finalPrediction
              ) ||
              null,

            confidence:
              normalizeNumber(
                vipPrediction.confidence
              ),

            exactScore:
              normalizeText(
                vipPrediction.exactScore
              ) ||
              null,

            valueBet:
              normalizeText(
                vipPrediction.valueBet
              ) ||
              null,

            reasoning:
              normalizeStringArray(
                vipPrediction.reasoning
              ),
          }
        : null,

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
      "yyyy-mm-dd"
    )
  ) {
    return 400;
  }

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
  request:
    NextRequest
) {
  try {
    const limit =
      getSafeLimit(
        request
          .nextUrl
          .searchParams
          .get(
            "limit"
          )
      );

    const freeOnly =
      request
        .nextUrl
        .searchParams
        .get(
          "free"
        ) ===
      "true";

    const date =
      normalizeDate(
        request
          .nextUrl
          .searchParams
          .get(
            "date"
          )
      );

    if (
      freeOnly
    ) {
      /*
       * Use only the single-field isFree query
       * so this feature does not require a new
       * Firestore composite index.
       *
       * Status/date are validated in memory.
       */
      const snapshot =
        await adminDb
          .collection(
            COLLECTION_NAME
          )
          .where(
            "isFree",
            "==",
            true
          )
          .get();

      const predictions =
        snapshot.docs
          .filter(
            (
              document
            ) => {
              const data =
                document.data();

              if (
                data.status !==
                "published"
              ) {
                return false;
              }

              if (
                date &&
                getFixtureDateKey(
                  data.fixtureDate
                ) !==
                  date
              ) {
                return false;
              }

              return true;
            }
          )
          .sort(
            (
              left,
              right
            ) =>
              getPublishedTime(
                right.data()
              ) -
              getPublishedTime(
                left.data()
              )
          )
          .slice(
            0,
            limit
          )
          .map(
            (
              document
            ) =>
              toPublicPrediction(
                document.id,
                document.data()
              )
          );

      return NextResponse.json(
        {
          success:
            true,

          engine:
            "ZERRA AI Prediction Engine",

          sport:
            "Football",

          mode:
            "free",

          date,

          count:
            predictions.length,

          predictions,
        },
        {
          status:
            200,

          headers: {
            "Cache-Control":
              "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    const snapshot =
      await adminDb
        .collection(
          COLLECTION_NAME
        )
        .where(
          "status",
          "==",
          "published"
        )
        .orderBy(
          "publishedAt",
          "desc"
        )
        .limit(
          limit
        )
        .get();

    const predictions =
      snapshot.docs.map(
        (
          document
        ) =>
          toPublicPrediction(
            document.id,
            document.data()
          )
      );

    return NextResponse.json(
      {
        success:
          true,

        engine:
          "ZERRA AI Prediction Engine",

        sport:
          "Football",

        mode:
          "published",

        count:
          predictions.length,

        predictions,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[PUBLIC_PREDICTIONS_GET_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to load public predictions.";

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
            "no-store",
        },
      }
    );
  }
}
