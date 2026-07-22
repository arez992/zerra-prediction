import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  getFixturesByDate,
} from "@/lib/api-football/service";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const COLLECTION_NAME =
  "predictionHistory";

const MAX_DOCUMENTS =
  300;

function normalizeText(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function getDateOnly(
  value: unknown
): string | null {
  const text =
    normalizeText(
      value
    );

  if (
    !text
  ) {
    return null;
  }

  const date =
    text.slice(
      0,
      10
    );

  return /^\d{4}-\d{2}-\d{2}$/.test(
    date
  )
    ? date
    : null;
}

function isAuthorized(
  request:
    NextRequest
): boolean {
  const secret =
    process.env
      .CRON_SECRET;

  if (
    !secret
  ) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  return (
    authorization ===
    `Bearer ${secret}`
  );
}

function asRecord(
  value: unknown
): Record<
  string,
  unknown
> {
  return (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  )
    ? value as Record<
        string,
        unknown
      >
    : {};
}

export async function GET(
  request:
    NextRequest
) {
  if (
    !isAuthorized(
      request
    )
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "Unauthorized.",
      },
      {
        status:
          401,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  try {
    const snapshot =
      await adminDb
        .collection(
          COLLECTION_NAME
        )
        .limit(
          MAX_DOCUMENTS
        )
        .get();

    const candidates =
      snapshot.docs
        .map(
          (
            document
          ) => {
            const data =
              document.data();

            const teams =
              asRecord(
                data.teams
              );

            const home =
              asRecord(
                teams.home
              );

            const away =
              asRecord(
                teams.away
              );

            const fixtureId =
              normalizeText(
                data.fixtureId
              ) ||
              document.id.replace(
                /^fixture-/,
                ""
              );

            const fixtureDate =
              getDateOnly(
                data.fixtureDate
              );

            const hasHomeLogo =
              Boolean(
                normalizeText(
                  home.logo
                )
              );

            const hasAwayLogo =
              Boolean(
                normalizeText(
                  away.logo
                )
              );

            if (
              !fixtureId ||
              !fixtureDate ||
              (
                hasHomeLogo &&
                hasAwayLogo
              )
            ) {
              return null;
            }

            return {
              document,

              fixtureId,

              fixtureDate,

              currentHomeName:
                normalizeText(
                  home.name
                ),

              currentAwayName:
                normalizeText(
                  away.name
                ),
            };
          }
        )
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            item !==
            null
        );

    const groupedByDate =
      new Map<
        string,
        typeof candidates
      >();

    for (
      const candidate
      of candidates
    ) {
      const group =
        groupedByDate.get(
          candidate.fixtureDate
        ) ||
        [];

      group.push(
        candidate
      );

      groupedByDate.set(
        candidate.fixtureDate,
        group
      );
    }

    let updated =
      0;

    let notFound =
      0;

    let datesProcessed =
      0;

    const details:
      Array<{
        fixtureId:
          string;

        date:
          string;

        status:
          "updated" |
          "not-found";

        homeLogo:
          boolean;

        awayLogo:
          boolean;
      }> =
      [];

    for (
      const [
        date,
        dateCandidates,
      ]
      of groupedByDate
    ) {
      /*
       * Cost control:
       * exactly one fixtures-by-date lookup
       * per unique date, never one lookup
       * per prediction.
       *
       * getFixturesByDate() itself is already
       * protected by the existing 15-minute
       * Next.js unstable_cache layer.
       */
      const fixtures =
        await getFixturesByDate(
          date
        );

      datesProcessed +=
        1;

      const fixtureMap =
        new Map<
          string,
          any
        >();

      for (
        const fixture
        of fixtures
      ) {
        const id =
          String(
            fixture
              .fixture
              ?.id ??
            ""
          ).trim();

        if (
          id
        ) {
          fixtureMap.set(
            id,
            fixture
          );
        }
      }

      for (
        const candidate
        of dateCandidates
      ) {
        const fixture =
          fixtureMap.get(
            candidate.fixtureId
          );

        if (
          !fixture
        ) {
          notFound +=
            1;

          details.push({
            fixtureId:
              candidate.fixtureId,

            date,

            status:
              "not-found",

            homeLogo:
              false,

            awayLogo:
              false,
          });

          continue;
        }

        const homeLogo =
          normalizeText(
            fixture
              .teams
              ?.home
              ?.logo
          );

        const awayLogo =
          normalizeText(
            fixture
              .teams
              ?.away
              ?.logo
          );

        const homeName =
          normalizeText(
            fixture
              .teams
              ?.home
              ?.name
          ) ||
          candidate.currentHomeName ||
          "Home team";

        const awayName =
          normalizeText(
            fixture
              .teams
              ?.away
              ?.name
          ) ||
          candidate.currentAwayName ||
          "Away team";

        if (
          !homeLogo &&
          !awayLogo
        ) {
          notFound +=
            1;

          details.push({
            fixtureId:
              candidate.fixtureId,

            date,

            status:
              "not-found",

            homeLogo:
              false,

            awayLogo:
              false,
          });

          continue;
        }

        await candidate
          .document
          .ref
          .set(
            {
              teams: {
                home: {
                  name:
                    homeName,

                  ...(homeLogo
                    ? {
                        logo:
                          homeLogo,
                      }
                    : {}),
                },

                away: {
                  name:
                    awayName,

                  ...(awayLogo
                    ? {
                        logo:
                          awayLogo,
                      }
                    : {}),
                },
              },

              teamLogoBackfill: {
                source:
                  "fixtures-by-date",

                date,

                updatedAt:
                  new Date()
                    .toISOString(),
              },
            },
            {
              merge:
                true,
            }
          );

        updated +=
          1;

        details.push({
          fixtureId:
            candidate.fixtureId,

          date,

          status:
            "updated",

          homeLogo:
            Boolean(
              homeLogo
            ),

          awayLogo:
            Boolean(
              awayLogo
            ),
        });
      }
    }

    return NextResponse.json(
      {
        success:
          true,

        source:
          "prediction-team-logo-backfill",

        scanned:
          snapshot.size,

        candidates:
          candidates.length,

        uniqueDates:
          groupedByDate.size,

        datesProcessed,

        updated,

        notFound,

        apiStrategy:
          "one fixtures-by-date lookup per unique date, using existing cache",

        details,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[PREDICTION_TEAM_LOGO_BACKFILL_ERROR]",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof
            Error
            ? error.message
            : "Team logo backfill failed.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
