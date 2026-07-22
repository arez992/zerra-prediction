import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runPredictionEngine,
} from "@/lib/ai/engine";

import {
  generatePredictionsForDate,
} from "@/lib/ai-ceo/prediction/generator";

import {
  enrichExistingFixtureForPrediction,
  enrichExistingFixtureForPredictionRescue,
  getFixturesByDate,
} from "@/lib/api-football/service";

import {
  toPredictionPipelineInput,
} from "@/lib/api-football/mapper";

import {
  claimPredictionQueueItem,
  completePredictionQueueItem,
  enqueuePredictionCandidates,
  failPredictionQueueItem,
  getPendingPredictionQueue,
  getPredictionQueueStats,
} from "@/lib/ai-ceo/prediction/queue";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

/*
 * ZERRA autonomous candidate policy.
 *
 * A fixture can enter the processing queue when:
 *
 * - confidence >= 65%
 * - risk is Low or Medium
 * - prediction consistency is valid
 * - a usable canonical prediction exists
 *
 * primaryPrediction.qualified is retained for
 * diagnostics, but it is NOT a hard Cheap Scan
 * blocker because incomplete supporting data
 * must not automatically reject an otherwise
 * strong prediction.
 */
const MIN_CONFIDENCE =
  65;

const PROCESS_BATCH_SIZE =
  25;

const UPCOMING_STATUSES =
  new Set([
    "NS",
    "TBD",
  ]);

type CronMode =
  | "scan"
  | "process";

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

function normalizeMode(
  value:
    string | null
): CronMode {
  return value ===
    "process"
    ? "process"
    : "scan";
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

function isAuthorized(
  request:
    NextRequest
): boolean {
  const secret =
    process.env
      .CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  return authorization ===
    `Bearer ${secret}`;
}

function hasUsablePrediction(
  value:
    string
): boolean {
  const normalized =
    value
      .trim()
      .toLowerCase();

  return Boolean(
    normalized &&
    normalized !==
      "no strong prediction" &&
    normalized !==
      "insufficient data" &&
    normalized !==
      "no value"
  );
}

async function calculateScanPrediction(
  fixture: FixtureLike,
  rescue: boolean
) {
  const enriched =
    rescue
      ? await enrichExistingFixtureForPredictionRescue(
          fixture as any,
          {
            recentFixtureLimit:
              8,
          }
        )
      : await enrichExistingFixtureForPrediction(
          fixture as any,
          {
            recentFixtureLimit:
              8,
          }
        );

  const engineResult =
    await runPredictionEngine({
      ...toPredictionPipelineInput(
        enriched
      ),

      source:
        rescue
          ? "ai-ceo-season-statistics-rescue"
          : "ai-ceo-cached-enriched-scan",
    });

  if (
    !engineResult.success
  ) {
    throw new Error(
      engineResult.error
    );
  }

  return engineResult
    .data
    .prediction;
}

function readPredictionDecision(
  prediction: any
) {
  const primary =
    prediction
      ?.vipPrediction
      ?.primaryPrediction;

  const confidence =
    primary
      ?.confidence ??
    prediction
      ?.confidence ??
    0;

  const risk =
    prediction
      ?.risk ??
    prediction
      ?.publicPrediction
      ?.risk ??
    "High";

  const qualified =
    primary
      ?.qualified ===
    true;

  const consistencyValid =
    prediction
      ?.consistency
      ?.valid ===
    true;

  const pick =
    primary
      ?.pick ??
    prediction
      ?.vipPrediction
      ?.finalPrediction ??
    "";

  const confidencePassed =
    confidence >=
    MIN_CONFIDENCE;

  const riskPassed =
    risk === "Low" ||
    risk === "Medium";

  const predictionAvailable =
    hasUsablePrediction(
      pick
    );

  return {
    confidence,
    risk,
    qualified,
    consistencyValid,
    pick,
    confidencePassed,
    riskPassed,
    predictionAvailable,

    candidatePassed:
      confidencePassed &&
      riskPassed &&
      consistencyValid &&
      predictionAvailable,
  };
}

async function runScan(
  date:
    string
) {
  /*
   * STEP 1
   *
   * Fetch the daily fixture list once.
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
   * STEP 2
   *
   * Cheap-scan all valid pre-match fixtures.
   */
  const candidates:
    Array<{
      fixtureId:
        string;

      date:
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
    }> =
    [];

  const rejected:
    Array<{
      fixtureId:
        string;

      match:
        string;

      confidence:
        number | null;

      risk:
        string | null;

      qualified:
        boolean | null;

      consistencyValid:
        boolean | null;

      pick:
        string | null;

      reason:
        string;
    }> =
    [];

  let scanFailures =
    0;

  let rescueAttempts =
    0;

  let rescueCandidates =
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
       * STAGE 1 — cheap cached-enriched scan.
       */
      let prediction =
        await calculateScanPrediction(
          fixture,
          false
        );

      let decision =
        readPredictionDecision(
          prediction
        );

      let enrichmentStage:
        "cheap" |
        "rescue" =
        "cheap";

      /*
       * STAGE 2 — rescue with season statistics.
       * Only runs when Stage 1 does not qualify.
       */
      if (
        !decision
          .candidatePassed
      ) {
        rescueAttempts +=
          1;

        prediction =
          await calculateScanPrediction(
            fixture,
            true
          );

        decision =
          readPredictionDecision(
            prediction
          );

        enrichmentStage =
          "rescue";
      }

      const {
        confidence,
        risk,
        qualified,
        consistencyValid,
        pick,
        confidencePassed,
        riskPassed,
        predictionAvailable,
        candidatePassed,
      } =
        decision;

      if (
        candidatePassed
      ) {
        if (
          enrichmentStage ===
            "rescue"
        ) {
          rescueCandidates +=
            1;
        }

        candidates.push({
          fixtureId,

          date,

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

      /*
       * Only true Cheap Scan blockers are
       * included in rejection reasons.
       *
       * qualified=false is intentionally
       * not a rejection reason.
       */
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

        match:
          `${homeTeam} vs ${awayTeam}`,

        confidence,

        risk,

        qualified,

        consistencyValid,

        pick:
          pick ||
          null,

        reason:
          reasons.join(
            "; "
          ) ||
          "Cheap scan rejected prediction.",
      });
    } catch (
      error
    ) {
      scanFailures +=
        1;

      rejected.push({
        fixtureId,

        match:
          `${homeTeam} vs ${awayTeam}`,

        confidence:
          null,

        risk:
          null,

        qualified:
          null,

        consistencyValid:
          null,

        pick:
          null,

        reason:
          error instanceof
            Error
            ? error.message
            : "Cheap scan failed.",
      });
    }
  }

  /*
   * Highest confidence first.
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
   * STEP 3
   *
   * Persist strong candidates into the
   * deterministic Firestore queue.
   */
  const queueResult =
    await enqueuePredictionCandidates(
      candidates
    );

  const queueStats =
    await getPredictionQueueStats(
      date
    );

  return {
    mode:
      "scan" as const,

    fixturesFound:
      fixtures.length,

    preMatchFixtures:
      preMatchFixtures.length,

    fixturesScanned:
      preMatchFixtures.length,

    strongCandidates:
      candidates.length,

    rejected:
      rejected.length,

    scanFailures,

    rescueAttempts,

    rescueCandidates,

    queueResult,

    queueStats,

    candidates,

    rejectedItems:
      rejected,
  };
}

async function runProcess(
  date:
    string
) {
  /*
   * STEP 1
   *
   * Select the next controlled queue batch.
   */
  const pendingItems =
    await getPendingPredictionQueue({
      date,

      limit:
        PROCESS_BATCH_SIZE,
    });

  const results:
    Array<{
      queueId:
        string;

      fixtureId:
        string;

      match:
        string;

      cheapScanConfidence:
        number;

      cheapScanRisk:
        string;

      cheapScanQualified:
        boolean;

      status:
        "completed" |
        "failed" |
        "skipped";

      predictionId:
        string | null;

      finalStatus:
        string | null;

      publicationDecision:
        string | null;

      reason:
        string;
    }> =
    [];

  let completed =
    0;

  let failed =
    0;

  let skipped =
    0;

  for (
    const queueItem
    of pendingItems
  ) {
    /*
     * Claim transactionally so overlapping
     * cron runs cannot process the same
     * queue item simultaneously.
     */
    const claimed =
      await claimPredictionQueueItem(
        queueItem.id
      );

    if (
      !claimed
    ) {
      skipped +=
        1;

      results.push({
        queueId:
          queueItem.id,

        fixtureId:
          queueItem.fixtureId,

        match:
          `${queueItem.homeTeam} vs ${queueItem.awayTeam}`,

        cheapScanConfidence:
          queueItem.confidence,

        cheapScanRisk:
          queueItem.risk,

        cheapScanQualified:
          queueItem.qualified,

        status:
          "skipped",

        predictionId:
          null,

        finalStatus:
          null,

        publicationDecision:
          null,

        reason:
          "Queue item was already claimed or processed.",
      });

      continue;
    }

    try {
      /*
       * Run the existing prediction lifecycle
       * for this exact fixture.
       *
       * BASIC mode intentionally avoids the
       * expensive full enrichment pipeline.
       */
      const summary =
        await generatePredictionsForDate({
          date,

          fixtureId:
            queueItem.fixtureId,

          mode:
            "basic",

          limit:
            1,

          overwrite:
            false,

          performedBy:
            "ai-ceo-autonomous-prediction-cron",
        });

      const item =
        summary.items[0];

      const predictionId =
        item
          ?.predictionId ??
        null;

      const finalStatus =
        item
          ?.finalStatus ??
        null;

      const publicationDecision =
        item
          ?.publicationDecision ??
        null;

      /*
       * An already existing prediction also
       * means the queue work has effectively
       * completed.
       */
      const completedSuccessfully =
        Boolean(
          summary.generatedPredictions >
            0 ||
          summary.existingPredictions >
            0
        );

      if (
        !completedSuccessfully
      ) {
        const failureReason =
          item
            ?.reason ||
          "Prediction generator did not complete this queue item.";

        await failPredictionQueueItem(
          queueItem.id,
          failureReason
        );

        failed +=
          1;

        results.push({
          queueId:
            queueItem.id,

          fixtureId:
            queueItem.fixtureId,

          match:
            `${queueItem.homeTeam} vs ${queueItem.awayTeam}`,

          cheapScanConfidence:
            queueItem.confidence,

          cheapScanRisk:
            queueItem.risk,

          cheapScanQualified:
            queueItem.qualified,

          status:
            "failed",

          predictionId,

          finalStatus,

          publicationDecision,

          reason:
            failureReason,
        });

        continue;
      }

      await completePredictionQueueItem(
        queueItem.id,
        {
          predictionId,

          finalStatus,

          publicationDecision,
        }
      );

      completed +=
        1;

      results.push({
        queueId:
          queueItem.id,

        fixtureId:
          queueItem.fixtureId,

        match:
          `${queueItem.homeTeam} vs ${queueItem.awayTeam}`,

        cheapScanConfidence:
          queueItem.confidence,

        cheapScanRisk:
          queueItem.risk,

        cheapScanQualified:
          queueItem.qualified,

        status:
          "completed",

        predictionId,

        finalStatus,

        publicationDecision,

        reason:
          item
            ?.reason ||
          "Prediction queue item completed.",
      });
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Prediction queue processing failed.";

      await failPredictionQueueItem(
        queueItem.id,
        message
      );

      failed +=
        1;

      results.push({
        queueId:
          queueItem.id,

        fixtureId:
          queueItem.fixtureId,

        match:
          `${queueItem.homeTeam} vs ${queueItem.awayTeam}`,

        cheapScanConfidence:
          queueItem.confidence,

        cheapScanRisk:
          queueItem.risk,

        cheapScanQualified:
          queueItem.qualified,

        status:
          "failed",

        predictionId:
          null,

        finalStatus:
          null,

        publicationDecision:
          null,

        reason:
          message,
      });
    }
  }

  /*
   * Read fresh queue totals after processing.
   */
  const queueStats =
    await getPredictionQueueStats(
      date
    );

  return {
    mode:
      "process" as const,

    batchSize:
      PROCESS_BATCH_SIZE,

    pendingSelected:
      pendingItems.length,

    completed,

    failed,

    skipped,

    queueStats,

    results,
  };
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

    const mode =
      normalizeMode(
        request
          .nextUrl
          .searchParams
          .get(
            "mode"
          )
      );

    const result =
      mode ===
        "process"
        ? await runProcess(
            date
          )
        : await runScan(
            date
          );

    return NextResponse.json(
      {
        success:
          true,

        source:
          "ai-ceo-prediction-queue-cron",

        autonomous:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        date,

        /*
         * This object intentionally mirrors
         * the active Cheap Scan policy.
         */
        policy: {
          minimumConfidence:
            MIN_CONFIDENCE,

          allowedRisk: [
            "Low",
            "Medium",
          ],

          /*
           * qualified remains diagnostic
           * information, not a Cheap Scan
           * requirement.
           */
          primaryQualifiedRequired:
            false,

          consistencyRequired:
            true,

          usablePredictionRequired:
            true,

          processBatchSize:
            PROCESS_BATCH_SIZE,

          insufficientDataAloneHardReject:
            false,

          scanDataMode:
            "adaptive-two-stage",

          cheapStageSeasonStatistics:
            false,

          rescueStageSeasonStatistics:
            true,

          rescueOnlyAfterCheapFailure:
            true,

          fixtureRefetchPerMatch:
            false,

          openAIRequiredForBulkPrediction:
            false,

          overwriteExistingPredictions:
            false,
        },

        result,
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
      "[AI_CEO_PREDICTION_QUEUE_CRON_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "AI CEO prediction queue cron failed.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "ai-ceo-prediction-queue-cron",

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