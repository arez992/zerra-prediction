import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  unstable_cache,
} from "next/cache";

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

const PUBLIC_CACHE_SECONDS =
  60;

const FREE_CACHE_SECONDS =
  5 * 60;

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

  const settlement =
    asRecord(
      data.settlement
    );

  const actual =
    asRecord(
      settlement.actual
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

    result: {
      checked:
        data.resultChecked ===
        true,

      status:
        data.resultChecked ===
        true
          ? data.correct ===
            true
            ? "correct"
            : data.correct ===
              false
              ? "incorrect"
              : "void"
          : "pending",

      correct:
        typeof data.correct ===
          "boolean"
          ? data.correct
          : null,

      label:
        normalizeText(
          data.result
        ) ||
        null,

      settledAt:
        serializeTimestamp(
          data.settledAt
        ),

      finalStatus:
        normalizeText(
          settlement.finalStatus
        ) ||
        normalizeText(
          fixtureStatus.short
        ) ||
        null,

      homeGoals:
        normalizeNumber(
          actual.homeGoals
        ),

      awayGoals:
        normalizeNumber(
          actual.awayGoals
        ),

      finalScore:
        normalizeText(
          actual.exactScore
        ) ||
        (
          normalizeNumber(
            actual.homeGoals
          ) !== null &&
          normalizeNumber(
            actual.awayGoals
          ) !== null
            ? `${normalizeNumber(actual.homeGoals)}-${normalizeNumber(actual.awayGoals)}`
            : null
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

const getCachedPublicPredictionPool =
  unstable_cache(
    async () => {
      const [
        publishedSnapshot,
        settledSnapshot,
      ] =
        await Promise.all([
          adminDb
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
              MAX_LIMIT
            )
            .get(),

          adminDb
            .collection(
              COLLECTION_NAME
            )
            .where(
              "status",
              "==",
              "settled"
            )
            .orderBy(
              "publishedAt",
              "desc"
            )
            .limit(
              MAX_LIMIT
            )
            .get(),
        ]);

      const documents =
        [
          ...publishedSnapshot.docs,
          ...settledSnapshot.docs,
        ];

      return Array.from(
        new Map(
          documents.map(
            (
              document
            ) => [
              document.id,
              document,
            ]
          )
        ).values()
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
          MAX_LIMIT
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
    },
    [
      "zerra-public-predictions-pool",
      "v2",
    ],
    {
      revalidate:
        PUBLIC_CACHE_SECONDS,

      tags: [
        "zerra-public-predictions",
      ],
    }
  );

const getCachedFreePredictionPool =
  unstable_cache(
    async () => {
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

      return snapshot.docs
        .map(
          (
            document
          ) => ({
            id:
              document.id,

            publishedTime:
              getPublishedTime(
                document.data()
              ),

            fixtureDateKey:
              getFixtureDateKey(
                document.data()
                  .fixtureDate
              ),

            prediction:
              toPublicPrediction(
                document.id,
                document.data()
              ),
          })
        )
        .sort(
          (
            left,
            right
          ) =>
            right.publishedTime -
            left.publishedTime
        );
    },
    [
      "zerra-free-predictions-pool",
      "v2",
    ],
    {
      revalidate:
        FREE_CACHE_SECONDS,

      tags: [
        "zerra-free-predictions",
      ],
    }
  );

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
       * Free selections are immutable for the day,
       * so they can use a longer shared cache.
       *
       * Firestore is read once per cache window,
       * not once per page visitor.
       */
      const freePool =
        await getCachedFreePredictionPool();

      const predictions =
        freePool
          .filter(
            (
              item
            ) =>
              !date ||
              item.fixtureDateKey ===
                date
          )
          .slice(
            0,
            limit
          )
          .map(
            (
              item
            ) =>
              item.prediction
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
              "public, s-maxage=300, stale-while-revalidate=900",
          },
        }
      );
    }

    /*
     * Shared 60-second server data cache.
     *
     * All visitors reuse the same Firestore result
     * during the cache window. This keeps result
     * updates reasonably fresh without making every
     * page view generate new Firestore reads.
     */
    const predictionPool =
      await getCachedPublicPredictionPool();

    const predictions =
      predictionPool.slice(
        0,
        limit
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
          "published-and-settled",

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
