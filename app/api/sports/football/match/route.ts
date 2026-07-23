import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  unstable_cache,
} from "next/cache";

import {
  getCompleteFixtureData,
} from "@/lib/api-football/service";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const FAST_CACHE_SECONDS =
  5 * 60;

const ENRICHED_CACHE_SECONDS =
  30 * 60;

function getBooleanParam(
  value: string | null,
  fallback: boolean
): boolean {
  if (
    value === null
  ) {
    return fallback;
  }

  return value ===
    "true";
}

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "fixture id"
    ) ||
    normalized.includes(
      "valid numeric"
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

  if (
    normalized.includes(
      "api_football_key"
    )
  ) {
    return 500;
  }

  return 502;
}

/*
 * Persistent Next/Vercel data cache.
 *
 * Unlike the in-memory Map cache inside service.ts,
 * this cache is designed to survive normal serverless
 * request boundaries. After the first request for a
 * fixture, repeated match-page visits can reuse the
 * cached result instead of calling API-Football again
 * until the cache expires.
 */
const getCachedFastMatch =
  unstable_cache(
    async (
      fixtureId: string
    ) =>
      getCompleteFixtureData(
        fixtureId,
        {
          includeHeadToHead:
            false,

          includeInjuries:
            false,

          includeOdds:
            false,

          includeTeamEnrichment:
            false,
        }
      ),

    [
      "zerra-match-page",
      "fast",
      "v1",
    ],

    {
      revalidate:
        FAST_CACHE_SECONDS,

      tags: [
        "zerra-match-fast",
      ],
    }
  );

const getCachedEnrichedMatch =
  unstable_cache(
    async (
      fixtureId: string,
      includeHeadToHead: boolean,
      includeInjuries: boolean,
      includeOdds: boolean
    ) =>
      getCompleteFixtureData(
        fixtureId,
        {
          includeHeadToHead,

          includeInjuries,

          includeOdds,

          includeTeamEnrichment:
            true,
        }
      ),

    [
      "zerra-match-page",
      "enriched",
      "v1",
    ],

    {
      revalidate:
        ENRICHED_CACHE_SECONDS,

      tags: [
        "zerra-match-enriched",
      ],
    }
  );

export async function GET(
  request: NextRequest
) {
  try {
    const fixtureId =
      request.nextUrl.searchParams.get(
        "fixture"
      );

    if (
      !fixtureId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "fixture id is required",
        },
        {
          status:
            400,
        }
      );
    }

    const includeHeadToHead =
      getBooleanParam(
        request.nextUrl.searchParams.get(
          "h2h"
        ),
        false
      );

    const includeInjuries =
      getBooleanParam(
        request.nextUrl.searchParams.get(
          "injuries"
        ),
        false
      );

    const includeOdds =
      getBooleanParam(
        request.nextUrl.searchParams.get(
          "odds"
        ),
        false
      );

    const includeTeamEnrichment =
      getBooleanParam(
        request.nextUrl.searchParams.get(
          "enrichment"
        ),
        false
      );

    const enrichedMode =
      includeTeamEnrichment ||
      includeHeadToHead ||
      includeInjuries ||
      includeOdds;

    const data =
      enrichedMode
        ? await getCachedEnrichedMatch(
            fixtureId,
            includeHeadToHead,
            includeInjuries,
            includeOdds
          )
        : await getCachedFastMatch(
            fixtureId
          );

    return NextResponse.json(
      {
        success:
          true,

        cacheMode:
          enrichedMode
            ? "enriched"
            : "fast",

        cacheTtlSeconds:
          enrichedMode
            ? ENRICHED_CACHE_SECONDS
            : FAST_CACHE_SECONDS,

        ...data,
      },
      {
        status:
          200,

        headers: {
          /*
           * Browser/CDN layer on top of the server data cache.
           * stale-while-revalidate lets a cached response be
           * served immediately while it refreshes in background.
           */
          "Cache-Control":
            enrichedMode
              ? "public, s-maxage=1800, stale-while-revalidate=3600"
              : "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch match details.";

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Failed to fetch match details.",

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
