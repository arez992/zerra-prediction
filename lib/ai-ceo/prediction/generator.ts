import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  runPredictionEngine,
} from "@/lib/ai/engine";

import {
  getCompleteFixtureData,
  getFixturesByDate,
} from "@/lib/api-football/service";

import {
  toPredictionPipelineInput,
} from "@/lib/api-football/mapper";

const COLLECTION_NAME =
  "predictionHistory";

const AUDIT_COLLECTION =
  "predictionAuditLogs";

const UPCOMING_STATUSES =
  new Set([
    "NS",
    "TBD",
  ]);

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

type FixtureLike = {
  fixture?: {
    id?: string | number;
    date?: string;

    status?: {
      short?: string;
      long?: string;
    };
  };

  league?: {
    id?: number;
    name?: string;
    country?: string;
    season?: number;
    round?: string;
  };

  teams?: {
    home?: {
      id?: number;
      name?: string;
    };

    away?: {
      id?: number;
      name?: string;
    };
  };

  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

export type PredictionGenerationMode =
  | "basic"
  | "enriched";

export type PredictionGenerationItem = {
  fixtureId: string;
  fixtureDate: string | null;

  generated: boolean;
  skipped: boolean;

  reason: string;

  predictionId: string | null;

  enriched: boolean;

  generationStatus?:
    | "allowed"
    | "withheld"
    | "insufficient-data"
    | "failed"
    | "existing";
};

export type PredictionGenerationSummary = {
  generatedAt: string;
  date: string;
  mode: PredictionGenerationMode;

  fixturesFound: number;
  eligibleFixtures: number;

  generatedPredictions: number;
  skippedPredictions: number;
  existingPredictions: number;
  withheldPredictions: number;
  insufficientDataPredictions: number;
  failedPredictions: number;

  apiDateRequests: number;
  enrichedFixtureRequests: number;

  items: PredictionGenerationItem[];
};

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  return (
    prototype ===
      Object.prototype ||
    prototype === null
  );
}

function sanitizeForFirestore(
  value: unknown
): unknown {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        sanitizeForFirestore
      )
      .filter(
        (item) =>
          item !== undefined &&
          !(
            typeof item === "string" &&
            item.trim() === ""
          )
      );
  }

  if (
    !isPlainObject(value)
  ) {
    return value;
  }

  const sanitized:
    Record<string, unknown> = {};

  for (
    const [
      rawKey,
      rawValue,
    ] of Object.entries(value)
  ) {
    const key =
      rawKey.trim();

    if (!key) {
      continue;
    }

    const nextValue =
      sanitizeForFirestore(
        rawValue
      );

    if (
      nextValue !== undefined
    ) {
      sanitized[key] =
        nextValue;
    }
  }

  return sanitized;
}

function normalizeDate(
  value: unknown
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      "Prediction generation date is required."
    );
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

function normalizeLimit(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(parsed)
    )
  );
}

function normalizeMode(
  value: unknown
): PredictionGenerationMode {
  return value === "enriched"
    ? "enriched"
    : "basic";
}

function normalizeFixtureId(
  value: unknown
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  const fixtureId =
    String(value).trim();

  return /^\d+$/.test(
    fixtureId
  )
    ? fixtureId
    : "";
}

function getFixtureStatus(
  fixture: FixtureLike
): string {
  return String(
    fixture.fixture?.status
      ?.short || ""
  )
    .trim()
    .toUpperCase();
}

function getFixtureDate(
  fixture: FixtureLike
): string | null {
  const value =
    fixture.fixture?.date;

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function isEligibleFixture(
  fixture: FixtureLike
): boolean {
  const fixtureId =
    normalizeFixtureId(
      fixture.fixture?.id
    );

  const homeName =
    fixture.teams?.home?.name;

  const awayName =
    fixture.teams?.away?.name;

  return Boolean(
    fixtureId &&
    homeName &&
    awayName &&
    UPCOMING_STATUSES.has(
      getFixtureStatus(
        fixture
      )
    )
  );
}

async function buildPipelineInput(
  fixture: FixtureLike,
  mode: PredictionGenerationMode
) {
  const fixtureId =
    normalizeFixtureId(
      fixture.fixture?.id
    );

  if (!fixtureId) {
    throw new Error(
      "Fixture ID is missing."
    );
  }

  if (mode === "enriched") {
    const complete =
      await getCompleteFixtureData(
        fixtureId,
        {
          includeHeadToHead:
            false,

          includeInjuries:
            false,

          includeOdds:
            false,

          includeTeamEnrichment:
            true,

          recentFixtureLimit:
            8,
        }
      );

    return {
      input: {
        ...toPredictionPipelineInput(
          complete
        ),

        source:
          "prediction-generation-scheduler-enriched",
      },

      enriched: true,

      sourceData: {
        fetchedFromApiFootball:
          true,

        fetchedAt:
          complete.fetchedAt,

        availability:
          complete.availability,

        headToHead:
          complete.headToHead,

        injuries:
          complete.injuries,

        odds:
          complete.odds,

        recentFixtures:
          complete.recentFixtures ?? {
            home: [],
            away: [],
          },

        teamSeasonStatistics:
          complete.teamSeasonStatistics ?? {
            home: null,
            away: null,
          },
      },
    };
  }

  return {
    input: {
      fixtureId,

      fixture,

      statistics: [],
      lineups: [],
      events: [],
      headToHead: [],
      injuries: [],
      odds: [],

      availability: {
        fixture: true,
        statistics: false,
        events: false,
        lineups: false,
        headToHead: false,
        injuries: false,
        odds: false,
      },

      fetchedAt: null,

      source:
        "prediction-generation-scheduler-basic",
    },

    enriched: false,

    sourceData: {
      fetchedFromApiFootball:
        false,

      fetchedAt: null,

      availability: {
        fixture: true,
        statistics: false,
        events: false,
        lineups: false,
        headToHead: false,
        injuries: false,
        odds: false,

        recentFixturesHome:
          false,

        recentFixturesAway:
          false,

        teamSeasonStatisticsHome:
          false,

        teamSeasonStatisticsAway:
          false,

        homeAwaySplits:
          false,
      },

      headToHead: [],
      injuries: [],
      odds: [],

      recentFixtures: {
        home: [],
        away: [],
      },

      teamSeasonStatistics: {
        home: null,
        away: null,
      },
    },
  };
}

async function writeGenerationAudit(
  input: {
    action: string;
    predictionId: string | null;
    fixtureId: string;
    source: string | undefined;
    generationMode: PredictionGenerationMode;
    fetchedFromApiFootball: boolean;
    dataAvailability: unknown;
    performedBy: string;
    modelVersion: string | null;
    dataQuality: unknown;
    generationDecision: unknown;
    openAIEligibility: unknown;
    reason: string | null;
  }
): Promise<void> {
  await adminDb
    .collection(
      AUDIT_COLLECTION
    )
    .doc()
    .set(
      sanitizeForFirestore({
        action:
          input.action,

        predictionId:
          input.predictionId,

        fixtureId:
          input.fixtureId,

        source:
          input.source ||
          "prediction-generation-scheduler",

        generationMode:
          input.generationMode,

        fetchedFromApiFootball:
          input.fetchedFromApiFootball,

        dataAvailability:
          input.dataAvailability,

        performedBy:
          input.performedBy,

        modelVersion:
          input.modelVersion,

        dataQuality:
          input.dataQuality,

        generationDecision:
          input.generationDecision,

        openAIEligibility:
          input.openAIEligibility,

        reason:
          input.reason,

        createdAt:
          FieldValue
            .serverTimestamp(),
      }) as FirebaseFirestore.DocumentData
    );
}

export async function generatePredictionsForDate(
  options: {
    date: string;
    limit?: number;
    mode?: PredictionGenerationMode;
    overwrite?: boolean;
    performedBy?: string;
  }
): Promise<PredictionGenerationSummary> {
  const date =
    normalizeDate(
      options.date
    );

  const limit =
    normalizeLimit(
      options.limit
    );

  const mode =
    normalizeMode(
      options.mode
    );

  const performedBy =
    options.performedBy ||
    "prediction-generation-scheduler";

  const fixtures =
    await getFixturesByDate(
      date
    );

  const eligibleFixtures =
    (
      fixtures as FixtureLike[]
    )
      .filter(
        isEligibleFixture
      )
      .slice(
        0,
        limit
      );

  const items:
    PredictionGenerationItem[] = [];

  let existingPredictions = 0;
  let withheldPredictions = 0;
  let insufficientDataPredictions = 0;
  let failedPredictions = 0;
  let enrichedFixtureRequests = 0;

  for (
    const fixture of eligibleFixtures
  ) {
    const fixtureId =
      normalizeFixtureId(
        fixture.fixture?.id
      );

    const fixtureDate =
      getFixtureDate(
        fixture
      );

    const predictionRef =
      adminDb
        .collection(
          COLLECTION_NAME
        )
        .doc(
          `fixture-${fixtureId}`
        );

    const existing =
      await predictionRef.get();

    if (
      existing.exists &&
      options.overwrite !== true
    ) {
      existingPredictions += 1;

      items.push({
        fixtureId,
        fixtureDate,

        generated: false,
        skipped: true,

        reason:
          "Prediction already exists.",

        predictionId:
          predictionRef.id,

        enriched:
          Boolean(
            existing.data()
              ?.sourceData
              ?.availability
              ?.statistics
          ),

        generationStatus:
          "existing",
      });

      continue;
    }

    try {
      const pipeline =
        await buildPipelineInput(
          fixture,
          mode
        );

      if (
        pipeline.enriched
      ) {
        enrichedFixtureRequests += 1;
      }

      const engineResult =
        await runPredictionEngine(
          pipeline.input
        );

      if (
        !engineResult.success
      ) {
        throw new Error(
          engineResult.error
        );
      }

      const generationDecision =
        engineResult.data
          .generationDecision;

      const dataQuality =
        engineResult.data
          .dataQuality;

      const openAIEligibility =
        engineResult.data
          .openAIEligibility;

      const modelVersion =
        engineResult.data
          .prediction
          .model
          .version;

      /*
       * Hard quality gate:
       *
       * Predictions with fallback,
       * insufficient data, or a
       * withheld decision are not
       * persisted in predictionHistory.
       */
      if (
        !generationDecision.allowed
      ) {
        if (
          generationDecision.status ===
          "withheld"
        ) {
          withheldPredictions += 1;
        } else {
          insufficientDataPredictions += 1;
        }

        await writeGenerationAudit({
          action:
            "generation-blocked",

          predictionId:
            existing.exists
              ? predictionRef.id
              : null,

          fixtureId,

          source:
            pipeline.input.source,

          generationMode:
            mode,

          fetchedFromApiFootball:
            pipeline.sourceData
              .fetchedFromApiFootball,

          dataAvailability:
            pipeline.sourceData
              .availability,

          performedBy,

          modelVersion,

          dataQuality,

          generationDecision,

          openAIEligibility,

          reason:
            generationDecision.reason,
        });

        items.push({
          fixtureId,
          fixtureDate,

          generated: false,
          skipped: true,

          reason:
            generationDecision.reason ||
            "Prediction generation was blocked by the data-quality gate.",

          predictionId: null,

          enriched:
            pipeline.enriched,

          generationStatus:
            generationDecision.status,
        });

        continue;
      }

      const now =
        new Date()
          .toISOString();

      const rawDocumentData = {
        ...engineResult.data
          .document,

        prediction:
          engineResult.data
            .prediction,

        dataQuality,

        generationDecision,

        openAIEligibility,

        sourceData:
          pipeline.sourceData,

        correct:
          engineResult.data
            .validation
            .correct,

        result:
          engineResult.data
            .validation
            .result,

        resultChecked:
          engineResult.data
            .validation
            .checked,

        manuallyChecked:
          false,

        checkedAt:
          engineResult.data
            .validation
            .checked
            ? now
            : null,

        createdBy:
          performedBy,

        updatedBy:
          performedBy,

        createdAt:
          existing.exists &&
          existing.data()
            ?.createdAt
            ? existing.data()
                ?.createdAt
            : FieldValue
                .serverTimestamp(),

        updatedAt:
          FieldValue
            .serverTimestamp(),

        generation: {
          mode,

          generatedAutomatically:
            true,

          generatedForDate:
            date,

          qualityGatePassed:
            true,

          generationStatus:
            generationDecision.status,

          dataCompleteness:
            dataQuality.completeness,

          dataReliability:
            dataQuality.reliability,
        },
      };

      const documentData =
        sanitizeForFirestore(
          rawDocumentData
        ) as FirebaseFirestore.DocumentData;

      const auditRef =
        adminDb
          .collection(
            AUDIT_COLLECTION
          )
          .doc();

      const batch =
        adminDb.batch();

      batch.set(
        predictionRef,
        documentData,
        {
          merge:
            options.overwrite ===
            true,
        }
      );

      batch.set(
        auditRef,
        sanitizeForFirestore({
          action:
            existing.exists
              ? "regenerate"
              : "generate",

          predictionId:
            predictionRef.id,

          fixtureId,

          source:
            pipeline.input
              .source,

          generationMode:
            mode,

          fetchedFromApiFootball:
            pipeline.sourceData
              .fetchedFromApiFootball,

          dataAvailability:
            pipeline.sourceData
              .availability,

          performedBy,

          modelVersion,

          dataQuality,

          generationDecision,

          openAIEligibility,

          createdAt:
            FieldValue
              .serverTimestamp(),
        }) as FirebaseFirestore.DocumentData
      );

      await batch.commit();

      items.push({
        fixtureId,
        fixtureDate,

        generated: true,
        skipped: false,

        reason:
          "Prediction generated successfully.",

        predictionId:
          predictionRef.id,

        enriched:
          pipeline.enriched,

        generationStatus:
          "allowed",
      });
    } catch (error) {
      failedPredictions += 1;

      const reason =
        error instanceof Error
          ? error.message
          : "Prediction generation failed.";

      try {
        await writeGenerationAudit({
          action:
            "generation-failed",

          predictionId: null,

          fixtureId,

          source:
            "prediction-generation-scheduler",

          generationMode:
            mode,

          fetchedFromApiFootball:
            mode === "enriched",

          dataAvailability: null,

          performedBy,

          modelVersion: null,

          dataQuality: null,

          generationDecision: null,

          openAIEligibility: null,

          reason,
        });
      } catch {
        /*
         * Do not hide the original
         * prediction-generation error
         * if audit logging also fails.
         */
      }

      items.push({
        fixtureId,
        fixtureDate,

        generated: false,
        skipped: true,

        reason,

        predictionId: null,

        enriched:
          mode === "enriched",

        generationStatus:
          "failed",
      });
    }
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    date,

    mode,

    fixturesFound:
      fixtures.length,

    eligibleFixtures:
      eligibleFixtures.length,

    generatedPredictions:
      items.filter(
        (item) =>
          item.generated
      ).length,

    skippedPredictions:
      items.filter(
        (item) =>
          item.skipped
      ).length,

    existingPredictions,

    withheldPredictions,

    insufficientDataPredictions,

    failedPredictions,

    apiDateRequests: 1,

    enrichedFixtureRequests,

    items,
  };
}