import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculatePrediction,
} from "@/lib/ai/prediction";

import {
  generatePredictionsForDate,
} from "@/lib/ai-ceo/prediction/generator";

import {
  getFixturesByDate,
} from "@/lib/api-football/service";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

/*
 * ZERRA AI CEO daily cheap-scan policy.
 *
 * Every pre-match fixture is scanned
 * using the same lightweight prediction
 * logic used by the Match Page.
 *
 * Only strong candidates continue into
 * persistence/publication.
 */
const MIN_CONFIDENCE =
  65;

const UPCOMING_STATUSES =
  new Set([
    "NS",
    "TBD",
  ]);

type FixtureLike = {
  fixture?: {
    id?:
      string | number;

    date?:
      string;

    status?: {
      short?:
        string;
    };
  };

  teams?: {
    home?: {
      name?:
        string;
    };

    away?: {
      name?:
        string;
    };
  };
};

type CheapScanCandidate = {
  fixture:
    FixtureLike;

  fixtureId:
    string;

  fixtureDate:
    string | null;

  homeTeam:
    string;

  awayTeam:
    string;

  confidence:
    number;

  risk:
    string;

  pick:
    string;

  qualified:
    boolean;

  consistencyValid:
    boolean;
};

type CheapScanRejectedItem = {
  fixtureId:
    string;

  homeTeam:
    string;

  awayTeam:
    string;

  confidence:
    number | null;

  risk:
    string | null;

  reason:
    string;
};

function getTodayUTC(): string {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}

function normalizeDate(
  value:
    string | null
): string {
  if (
    !value ||
    !value.trim()
  ) {
    return getTodayUTC();
  }

  const date =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      "Prediction generation date must use YYYY-MM-DD format."
    );
  }

  return date;
}

function normalizeFixtureId(
  value:
    unknown
): string {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  const fixtureId =
    String(
      value
    ).trim();

  return /^\d+$/.test(
    fixtureId
  )
    ? fixtureId
    : "";
}

function normalizeText(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function getFixtureStatus(
  fixture:
    FixtureLike
): string {
  return String(
    fixture
      .fixture
      ?.status
      ?.short ||
      ""
  )
    .trim()
    .toUpperCase();
}

function isPreMatchFixture(
  fixture:
    FixtureLike
): boolean {
  return UPCOMING_STATUSES.has(
    getFixtureStatus(
      fixture
    )
  );
}

function isAuthorized(
  request:
    NextRequest
): boolean {
  const cronSecret =
    process.env
      .CRON_SECRET;

  if (
    !cronSecret
  ) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  return authorization ===
    `Bearer ${cronSecret}`;
}

function getFixtureDate(
  fixture:
    FixtureLike
): string | null {
  const value =
    fixture
      .fixture
      ?.date;

  return (
    typeof value ===
      "string" &&
    value.trim()
  )
    ? value.trim()
    : null;
}

export async function GET(
  request:
    NextRequest
) {
  try {
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
            "Unauthorized cron request.",
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

    const date =
      normalizeDate(
        request
          .nextUrl
          .searchParams
          .get(
            "date"
          )
      );

    /*
     * ------------------------------------------------
     * STEP 1
     * Fetch today's fixtures once.
     * ------------------------------------------------
     */
    const fixtures =
      await getFixturesByDate(
        date
      );

    const preMatchFixtures =
      (
        fixtures as
          FixtureLike[]
      )
        .filter(
          (
            fixture
          ) => {
            const fixtureId =
              normalizeFixtureId(
                fixture
                  .fixture
                  ?.id
              );

            const homeTeam =
              normalizeText(
                fixture
                  .teams
                  ?.home
                  ?.name
              );

            const awayTeam =
              normalizeText(
                fixture
                  .teams
                  ?.away
                  ?.name
              );

            return Boolean(
              fixtureId &&
              homeTeam &&
              awayTeam &&
              isPreMatchFixture(
                fixture
              )
            );
          }
        );

    /*
     * ------------------------------------------------
     * STEP 2
     * Cheap-scan ALL pre-match fixtures.
     *
     * No expensive per-fixture enrichment is
     * requested here.
     * ------------------------------------------------
     */
    const candidates:
      CheapScanCandidate[] =
      [];

    const rejected:
      CheapScanRejectedItem[] =
      [];

    let scanFailures =
      0;

    for (
      const fixture
      of preMatchFixtures
    ) {
      const fixtureId =
        normalizeFixtureId(
          fixture
            .fixture
            ?.id
        );

      const homeTeam =
        normalizeText(
          fixture
            .teams
            ?.home
            ?.name
        );

      const awayTeam =
        normalizeText(
          fixture
            .teams
            ?.away
            ?.name
        );

      try {
        /*
         * Same lightweight canonical
         * prediction logic used by the
         * Match Page.
         */
        const prediction =
          calculatePrediction(
            fixture
          );

        const primary =
          prediction
            .vipPrediction
            ?.primaryPrediction;

        const confidence =
          primary
            ?.confidence ??
          prediction
            .confidence ??
          0;

        const risk =
          prediction
            .risk ??
          prediction
            .publicPrediction
            ?.risk ??
          "High";

        const qualified =
          primary
            ?.qualified ===
          true;

        const consistencyValid =
          prediction
            .consistency
            ?.valid ===
          true;

        const pick =
          primary
            ?.pick ??
          prediction
            .vipPrediction
            ?.finalPrediction ??
          "";

        /*
         * ZERRA cheap-scan candidate rules:
         *
         * - confidence >= 65
         * - Low or Medium risk
         * - canonical primary pick qualified
         * - prediction consistency valid
         * - usable prediction exists
         */
        const confidencePassed =
          confidence >=
          MIN_CONFIDENCE;

        const riskPassed =
          risk === "Low" ||
          risk === "Medium";

        const predictionAvailable =
          Boolean(
            pick &&
            pick
              .trim()
              .toLowerCase() !==
              "no strong prediction" &&
            pick
              .trim()
              .toLowerCase() !==
              "insufficient data"
          );

        if (
          confidencePassed &&
          riskPassed &&
          qualified &&
          consistencyValid &&
          predictionAvailable
        ) {
          candidates.push({
            fixture,

            fixtureId,

            fixtureDate:
              getFixtureDate(
                fixture
              ),

            homeTeam,

            awayTeam,

            confidence,

            risk,

            pick,

            qualified,

            consistencyValid,
          });

          continue;
        }

        const reasons:
          string[] =
          [];

        if (
          !confidencePassed
        ) {
          reasons.push(
            `confidence below ${MIN_CONFIDENCE}%`
          );
        }

        if (
          !riskPassed
        ) {
          reasons.push(
            `risk is ${risk}`
          );
        }

        if (
          !qualified
        ) {
          reasons.push(
            "primary prediction not qualified"
          );
        }

        if (
          !consistencyValid
        ) {
          reasons.push(
            "consistency validation failed"
          );
        }

        if (
          !predictionAvailable
        ) {
          reasons.push(
            "no usable canonical prediction"
          );
        }

        rejected.push({
          fixtureId,

          homeTeam,

          awayTeam,

          confidence,

          risk,

          reason:
            reasons.join(
              "; "
            ) ||
            "Cheap scan policy rejected prediction.",
        });
      } catch (
        error
      ) {
        scanFailures +=
          1;

        rejected.push({
          fixtureId,

          homeTeam,

          awayTeam,

          confidence:
            null,

          risk:
            null,

          reason:
            error instanceof
              Error
              ? error.message
              : "Cheap prediction scan failed.",
        });
      }
    }

    /*
     * Highest-confidence candidates first.
     */
    candidates.sort(
      (
        first,
        second
      ) =>
        second.confidence -
        first.confidence
    );

    /*
     * ------------------------------------------------
     * STEP 3
     * Persist/evaluate every strong candidate.
     *
     * We intentionally use BASIC mode here.
     *
     * This avoids expensive per-match team
     * enrichment for every selected fixture.
     *
     * The generator still applies:
     *
     * - publication policy
     * - learning policy
     * - consistency
     * - Firestore persistence
     * - audit logs
     * - duplicate protection
     *
     * The newly approved insufficient-data
     * policy allows strong Low/Medium-risk
     * predictions with >=65% confidence to
     * continue even with partial data.
     * ------------------------------------------------
     */
    const generationResults:
      Array<{
        fixtureId:
          string;

        homeTeam:
          string;

        awayTeam:
          string;

        cheapScanConfidence:
          number;

        cheapScanRisk:
          string;

        cheapScanPick:
          string;

        generated:
          number;

        autoPublished:
          number;

        review:
          number;

        withheld:
          number;

        existing:
          number;

        failed:
          number;

        finalStatus:
          string | null;

        publicationDecision:
          string | null;
      }> =
      [];

    let generatedPredictions =
      0;

    let autoPublishedPredictions =
      0;

    let reviewPredictions =
      0;

    let withheldPredictions =
      0;

    let existingPredictions =
      0;

    let failedPredictions =
      0;

    for (
      const candidate
      of candidates
    ) {
      try {
        const summary =
          await generatePredictionsForDate({
            date,

            fixtureId:
              candidate.fixtureId,

            mode:
              "basic",

            limit:
              1,

            overwrite:
              false,

            performedBy:
              "ai-ceo-autonomous-prediction-cron",
          });

        generatedPredictions +=
          summary
            .generatedPredictions;

        autoPublishedPredictions +=
          summary
            .autoPublishedPredictions;

        reviewPredictions +=
          summary
            .reviewPredictions;

        withheldPredictions +=
          summary
            .withheldPredictions;

        existingPredictions +=
          summary
            .existingPredictions;

        failedPredictions +=
          summary
            .failedPredictions;

        const item =
          summary.items[0];

        generationResults.push({
          fixtureId:
            candidate.fixtureId,

          homeTeam:
            candidate.homeTeam,

          awayTeam:
            candidate.awayTeam,

          cheapScanConfidence:
            candidate.confidence,

          cheapScanRisk:
            candidate.risk,

          cheapScanPick:
            candidate.pick,

          generated:
            summary
              .generatedPredictions,

          autoPublished:
            summary
              .autoPublishedPredictions,

          review:
            summary
              .reviewPredictions,

          withheld:
            summary
              .withheldPredictions,

          existing:
            summary
              .existingPredictions,

          failed:
            summary
              .failedPredictions,

          finalStatus:
            item
              ?.finalStatus ??
            null,

          publicationDecision:
            item
              ?.publicationDecision ??
            null,
        });
      } catch (
        error
      ) {
        failedPredictions +=
          1;

        generationResults.push({
          fixtureId:
            candidate.fixtureId,

          homeTeam:
            candidate.homeTeam,

          awayTeam:
            candidate.awayTeam,

          cheapScanConfidence:
            candidate.confidence,

          cheapScanRisk:
            candidate.risk,

          cheapScanPick:
            candidate.pick,

          generated:
            0,

          autoPublished:
            0,

          review:
            0,

          withheld:
            0,

          existing:
            0,

          failed:
            1,

          finalStatus:
            null,

          publicationDecision:
            null,
        });

        console.error(
          "[AI_CEO_CHEAP_SCAN_CANDIDATE_ERROR]",
          {
            fixtureId:
              candidate.fixtureId,

            error:
              error instanceof
                Error
                ? error.message
                : error,
          }
        );
      }
    }

    /*
     * ------------------------------------------------
     * STEP 4
     * Return a transparent operational summary.
     * ------------------------------------------------
     */
    return NextResponse.json(
      {
        success:
          true,

        source:
          "ai-ceo-autonomous-cheap-scan-cron",

        autonomous:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        date,

        policy: {
          scan:
            "all-pre-match-fixtures",

          minimumConfidence:
            MIN_CONFIDENCE,

          allowedRisk: [
            "Low",
            "Medium",
          ],

          primaryQualifiedRequired:
            true,

          consistencyRequired:
            true,

          generationMode:
            "basic",

          expensiveEnrichmentForAllMatches:
            false,

          insufficientDataAloneHardReject:
            false,

          overwriteExistingPredictions:
            false,

          autoPublish:
            true,
        },

        summary: {
          fixturesFound:
            fixtures.length,

          preMatchFixtures:
            preMatchFixtures.length,

          fixturesScanned:
            preMatchFixtures.length,

          strongCandidates:
            candidates.length,

          cheapScanRejected:
            rejected.length,

          scanFailures,

          generatedPredictions,

          autoPublishedPredictions,

          reviewPredictions,

          withheldPredictions,

          existingPredictions,

          failedPredictions,
        },

        candidates:
          candidates.map(
            (
              candidate
            ) => ({
              fixtureId:
                candidate.fixtureId,

              match:
                `${candidate.homeTeam} vs ${candidate.awayTeam}`,

              confidence:
                candidate.confidence,

              risk:
                candidate.risk,

              pick:
                candidate.pick,

              qualified:
                candidate.qualified,

              consistencyValid:
                candidate
                  .consistencyValid,
            })
          ),

        generationResults,

        rejected,
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
      "[AI_CEO_AUTONOMOUS_PREDICTION_CRON_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "AI CEO autonomous prediction generation failed.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "ai-ceo-autonomous-cheap-scan-cron",

        error:
          message,
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