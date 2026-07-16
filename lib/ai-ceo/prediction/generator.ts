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
  failedPredictions: number;
  apiDateRequests: number;
  enrichedFixtureRequests: number;
  items: PredictionGenerationItem[];
};

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
        headToHead: [],
        injuries: [],
        odds: [],
      },
    };
  }

  return {
    input: {
      fixture,
      statistics: [],
      lineups: [],
      events: [],
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
      },
      headToHead: [],
      injuries: [],
      odds: [],
    },
  };
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

      const now =
        new Date()
          .toISOString();

      const performedBy =
        options.performedBy ||
        "prediction-generation-scheduler";

      const documentData = {
        ...engineResult.data
          .document,

        prediction:
          engineResult.data
            .prediction,

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
        },
      };

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
        {
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

          modelVersion:
            engineResult.data
              .prediction
              .model.version,

          createdAt:
            FieldValue
              .serverTimestamp(),
        }
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
      });
    } catch (error) {
      failedPredictions += 1;

      items.push({
        fixtureId,
        fixtureDate,
        generated: false,
        skipped: true,
        reason:
          error instanceof Error
            ? error.message
            : "Prediction generation failed.",
        predictionId:
          null,
        enriched:
          mode === "enriched",
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
    failedPredictions,
    apiDateRequests: 1,
    enrichedFixtureRequests,
    items,
  };
}