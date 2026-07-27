import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

import {
  evaluatePredictionCheapScan,
  generatePredictionsForDate,
} from "@/lib/ai-ceo/prediction/generator";

import {
  selectDailyFreePredictions,
} from "@/lib/ai-ceo/prediction/freeSelector";

import {
  getFixturesByDate,
} from "@/lib/api-football/service";

import {
  ensurePredictionScanSession,
} from "@/lib/ai-ceo/prediction/scanSession";

import {
  claimPredictionQueueItem,
  claimPredictionScan,
  completePredictionQueueItem,
  completePredictionScan,
  enqueuePredictionCandidates,
  failPredictionQueueItem,
  getPendingPredictionQueue,
  getPredictionQueueStats,
  getPredictionScannedFixtureIds,
  releasePredictionScanClaim,
} from "@/lib/ai-ceo/prediction/queue";

import { syncPublishedPredictionToSEO } from "@/lib/ai-ceo/predictionSeoSync";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

/*
 * ZERRA autonomous two-stage prediction policy.
 *
 * SCAN:
 * - fetch fixtures-by-date once
 * - structurally filter and cap at 25 nearest kickoffs
 * - reuse that fixture payload for bounded recent-form enrichment
 * - avoid fixtureById, H2H, injuries, odds, events, lineups,
 *   and direct season-statistics calls during cheap evaluation
 * - do not persist a prediction
 * - queue only predictive candidates with:
 *   confidence > 68%, Low/Medium risk,
 *   valid consistency, and a usable pick
 *
 * PROCESS:
 * - claim queued candidates transactionally
 * - run one enriched canonical generation
 * - enforce the hard generation/data-quality gate
 * - enforce qualification, consistency, risk,
 *   confidence, pre-match, and learning policy
 *   before autonomous publication
 */
const MIN_CONFIDENCE =
  68;

const PROCESS_BATCH_SIZE =
  10;

const SCAN_CANDIDATE_LIMIT =
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

  league?: {
    id?:
      number;

    season?:
      number;
  };

  teams?: {
    home?: {
      id?:
        number;

      name?:
        string;
    };

    away?: {
      id?:
        number;

      name?:
        string;
    };
  };
};

function getTodayUTC(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
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

async function runScan(
  date:
    string
) {
  const scanSession =
    await ensurePredictionScanSession(date);

  if (!scanSession.active) {
    const queueStats =
      await getPredictionQueueStats(date);

    return {
    mode:
      "scan" as const,
      scanSession,
      sessionExpired: true,
      fixturesFound: 0,
      preMatchFixtures: 0,
      structuralCandidates: 0,
      scanCandidateLimit: SCAN_CANDIDATE_LIMIT,
      cheapScanned: 0,
      cheapScanSelected: 0,
      cheapScanRejected: 0,
      cheapScanFailed: 0,
      fixturesQueued: 0,
      queueResult: { requested: 0, queued: 0 },
      queueStats,
      cheapScanResults: [],
    };
  }

  const fixtures =
    await getFixturesByDate(
      date
    );

  const alreadyScannedFixtureIds =
    await getPredictionScannedFixtureIds(date);

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
            !alreadyScannedFixtureIds.has(fixtureId) &&
            homeTeam &&
            awayTeam &&
            isPreMatchFixture(
              fixture
            )
          );
        }
      );

  /*
   * Bound enrichment cost before any prediction
   * engine work. Only structurally complete,
   * pre-match fixtures are considered and the
   * nearest kickoffs are evaluated first.
   */
  const boundedPreMatchFixtures =
    preMatchFixtures
      .filter(
        (
          fixture
        ) =>
          Boolean(
            fixture
              .teams
              ?.home
              ?.id &&
            fixture
              .teams
              ?.away
              ?.id &&
            fixture
              .league
              ?.id &&
            fixture
              .league
              ?.season &&
            getFixtureDate(
              fixture
            )
          )
      )
      .sort(
        (
          first,
          second
        ) => {
          const firstTime =
            Date.parse(
              getFixtureDate(
                first
              ) ||
              ""
            );

          const secondTime =
            Date.parse(
              getFixtureDate(
                second
              ) ||
              ""
            );

          return (
            (
              Number.isFinite(
                firstTime
              )
                ? firstTime
                : Number.MAX_SAFE_INTEGER
            ) -
            (
              Number.isFinite(
                secondTime
              )
                ? secondTime
                : Number.MAX_SAFE_INTEGER
            )
          );
        }
      )
      .slice(
        0,
        SCAN_CANDIDATE_LIMIT
      );

  const queueCandidates:
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

  const cheapScanResults:
    Array<{
      fixtureId:
        string;
      match:
        string;
      selected:
        boolean;
      confidence:
        number;
      risk:
        string;
      qualified:
        boolean;
      consistencyValid:
        boolean;
      generationAllowed:
        boolean;
      pick:
        string;
      reason:
        string;
    }> =
    [];

  let cheapScanFailed =
    0;

  const selectedScanClaims =
    new Map<string, string>();

for (
    const fixture
    of boundedPreMatchFixtures
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

    let scanClaimToken: string | null = null;

    try {
      scanClaimToken = await claimPredictionScan(date, fixtureId);

      if (!scanClaimToken) {
        continue;
      }

      const scan =
        await evaluatePredictionCheapScan(
          fixture
        );

      const riskAllowed =
        scan.risk ===
          "Low" ||
        scan.risk ===
          "Medium";

      const selected =
        scan.eligible &&
        scan.confidence >
          MIN_CONFIDENCE &&
        riskAllowed &&
        scan.consistencyValid &&
        Boolean(
          scan.pick.trim()
        );

      cheapScanResults.push({
        fixtureId,
        match:
          `${homeTeam} vs ${awayTeam}`,
        selected,
        confidence:
          scan.confidence,
        risk:
          scan.risk,
        qualified:
          scan.qualified,
        consistencyValid:
          scan.consistencyValid,
        generationAllowed:
          scan.generationAllowed,
        pick:
          scan.pick,
        reason:
          selected
            ? "Selected by cheap scan for enriched processing."
            : "Rejected by cheap scan before enriched processing.",
      });

      if (
        !selected
      ) {
        await completePredictionScan(date, fixtureId, scanClaimToken, {
          selected: false,
          reason: "Rejected by cheap scan before enriched processing.",
        });
        continue;
      }

      queueCandidates.push({
        fixtureId,
        date,
        fixtureDate:
          scan.fixtureDate ||
          getFixtureDate(
            fixture
          ),
        homeTeam,
        awayTeam,
        confidence:
          scan.confidence,
        risk:
          scan.risk,
        pick:
          scan.pick,
        qualified:
          scan.qualified,
        consistencyValid:
          scan.consistencyValid,
      });

      selectedScanClaims.set(fixtureId, scanClaimToken);
    } catch (
      error
    ) {
      if (scanClaimToken) {
        await releasePredictionScanClaim(date, fixtureId, scanClaimToken);
      }

      cheapScanFailed +=
        1;

      cheapScanResults.push({
        fixtureId,
        match:
          `${homeTeam} vs ${awayTeam}`,
        selected:
          false,
        confidence:
          0,
        risk:
          "Unknown",
        qualified:
          false,
        consistencyValid:
          false,
        generationAllowed:
          false,
        pick:
          "",
        reason:
          error instanceof Error
            ? error.message
            : "Cheap prediction scan failed.",
      });
    }
  }

  let queueResult;

  try {
    queueResult = await enqueuePredictionCandidates(queueCandidates);

    for (const candidate of queueCandidates) {
      const claimToken = selectedScanClaims.get(candidate.fixtureId);
      if (claimToken) {
        await completePredictionScan(date, candidate.fixtureId, claimToken, {
          selected: true,
          reason: "Selected by cheap scan for enriched processing.",
        });
      }
    }
  } catch (error) {
    for (const [fixtureId, claimToken] of selectedScanClaims) {
      await releasePredictionScanClaim(date, fixtureId, claimToken).catch(() => undefined);
    }
    throw error;
  }

  const queueStats =
    await getPredictionQueueStats(
      date
    );

  return {
    mode:
      "scan" as const,

    scanSession,

    sessionExpired:
      false,

    fixturesFound:
      fixtures.length,

    preMatchFixtures:
      preMatchFixtures.length,

    structuralCandidates:
      boundedPreMatchFixtures.length,

    scanCandidateLimit:
      SCAN_CANDIDATE_LIMIT,

    cheapScanned:
      cheapScanResults.length,

    cheapScanSelected:
      queueCandidates.length,

    cheapScanRejected:
      Math.max(
        0,
        cheapScanResults.length -
          queueCandidates.length -
          cheapScanFailed
      ),

    cheapScanFailed,

    fixturesQueued:
      queueCandidates.length,

    queueResult,

    queueStats,

    cheapScanResults,
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
       * The queue item already passed the
       * non-persisting basic/cheap scan.
       *
       * PROCESS intentionally performs one
       * enriched canonical generation only for
       * those selected candidates.
       */
      const summary =
        await generatePredictionsForDate({
          date,

          fixtureId:
            queueItem.fixtureId,

          mode:
            "enriched",

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
       * A publication-policy rejection is NOT a
       * processing failure.
       *
       * The fixture has been successfully evaluated
       * even when the final decision is "withhold".
       */
      const evaluationCompleted =
        Boolean(
          summary.generatedPredictions >
            0 ||
          summary.existingPredictions >
            0 ||
          summary.policyWithheldPredictions >
            0 ||
          summary.withheldPredictions >
            0 ||
          summary.insufficientDataPredictions >
            0 ||
          item?.publicationDecision ===
            "withhold" ||
          item?.publicationDecision ===
            "review" ||
          item?.publicationDecision ===
            "auto-publish"
        );

      if (
        !evaluationCompleted
      ) {
        const failureReason =
          item
            ?.reason ||
          "Prediction generation failed before a publication decision was reached.";

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

          publicationDecision:
            publicationDecision ??
            "withhold",
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

        publicationDecision:
          publicationDecision ??
          "withhold",

        reason:
          item
            ?.reason ||
          "Prediction was evaluated and removed from the pending queue.",
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

function scheduleImmediateSEOForPublishedFixtures(
  _request: NextRequest,
  result: Awaited<ReturnType<typeof runProcess>>
): void {
  const publishedFixtureIds = result.results
    .filter((item) =>
      item.status === "completed" &&
      item.publicationDecision === "auto-publish" &&
      item.finalStatus === "published"
    )
    .map((item) => item.fixtureId);

  if (publishedFixtureIds.length === 0) return;

  after(async () => {
    await Promise.allSettled(
      publishedFixtureIds.map((fixtureId) =>
        syncPublishedPredictionToSEO(
          fixtureId,
          "ai-ceo-prediction-auto-publish"
        )
      )
    );
  });
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

    /*
     * AI CEO DAILY FREE PREDICTIONS
     *
     * - only process mode assigns free predictions
     * - only published predictions for this fixture date
     * - only Low risk
     * - maximum 3 free predictions per day
     *
     * The selector is idempotent, so repeated process
     * batches are safe. Once the daily limit reaches 3,
     * no additional prediction is marked free.
     */
    const freeSelection =
      mode ===
        "process"
        ? await selectDailyFreePredictions(
            date
          )
        : null;

    if (
      mode ===
        "process"
    ) {
      scheduleImmediateSEOForPublishedFixtures(
        request,
        result as Awaited<
          ReturnType<
            typeof runProcess
          >
        >
      );
    }

    

    if (mode === "scan") {
      const scanResult =
        result as Awaited<
          ReturnType<
            typeof runScan
          >
        >;

      console.info(
        "[AI_CEO_PREDICTION_SCAN_SUMMARY]",
        {
          date,
          sessionExpired:
            scanResult.sessionExpired,
          fixturesFound:
            scanResult.fixturesFound,
          preMatchFixtures:
            scanResult.preMatchFixtures,
          structuralCandidates:
            scanResult.structuralCandidates,
          scanCandidateLimit:
            scanResult.scanCandidateLimit,
          cheapScanned:
            scanResult.cheapScanned,
          cheapScanSelected:
            scanResult.cheapScanSelected,
          cheapScanRejected:
            scanResult.cheapScanRejected,
          cheapScanFailed:
            scanResult.cheapScanFailed,
          fixturesQueued:
            scanResult.fixturesQueued,
          queueResult:
            scanResult.queueResult,
          queueStats:
            scanResult.queueStats,
          cheapScanResults:
            scanResult.cheapScanResults,
        }
      );
    } else {
      const processResult =
        result as Awaited<
          ReturnType<
            typeof runProcess
          >
        >;

      console.info(
        "[AI_CEO_PREDICTION_PROCESS_SUMMARY]",
        {
          date,
          batchSize:
            processResult.batchSize,
          pendingSelected:
            processResult.pendingSelected,
          completed:
            processResult.completed,
          failed:
            processResult.failed,
          skipped:
            processResult.skipped,
          queueStats:
            processResult.queueStats,
          results:
            processResult.results,
        }
      );
    }return NextResponse.json(
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

        policy: {
          confidenceRule:
            "greater-than-68",

          minimumReference:
            MIN_CONFIDENCE,

          allowedRisk: [
            "Low",
            "Medium",
          ],

          cheapScan: {
            enabled:
              true,

            mode:
              "bounded-recent-form-no-persistence",

            requiresConsistency:
              true,

            requiresUsablePick:
              true,

            qualificationDiagnosticOnly:
              true,

            generationAllowedDiagnosticOnly:
              true,
          },

          processGenerationMode:
            "enriched",

          processBatchSize:
            PROCESS_BATCH_SIZE,

          hardGenerationGate:
            true,

          publicationConditions: [
            "qualified-primary-market",
            "valid-consistency",
            "generation-allowed",
            "quality-gate-passed",
            "pre-match-verified",
            "canonical-prediction-available",
            "low-or-medium-risk",
            "confidence-threshold",
            "learning-policy",
          ],

          overwriteExistingPredictions:
            false,
        },

        freePredictionPolicy: {
          enabled:
            true,

          dailyLimit:
            3,

          requiredRisk:
            "Low",

          otherSelectionConditions:
            false,

          selectionDateBasis:
            "fixtureDate",
        },

        freeSelection,

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
