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

import {
  evaluatePredictionAutoPublishPolicy,
} from "@/lib/ai-ceo/prediction/autoPublishPolicy";

import {
  evaluatePredictionLearningPolicy,
} from "@/lib/ai-ceo/prediction/learningPolicy";

const COLLECTION_NAME =
  "predictionHistory";

const AUDIT_COLLECTION =
  "predictionAuditLogs";

const UPCOMING_STATUSES =
  new Set([
    "NS",
    "TBD",
  ]);

const DEFAULT_LIMIT =
  10;

const MAX_LIMIT =
  25;

type FixtureLike = {
  fixture?: {
    id?:
      string | number;

    date?:
      string;

    status?: {
      short?:
        string;

      long?:
        string;
    };
  };

  league?: {
    id?:
      number;

    name?:
      string;

    country?:
      string;

    season?:
      number;

    round?:
      string;
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

  goals?: {
    home?:
      number | null;

    away?:
      number | null;
  };
};

export type PredictionGenerationMode =
  | "basic"
  | "enriched";

export type PredictionGenerationItem = {
  fixtureId:
    string;

  fixtureDate:
    string | null;

  generated:
    boolean;

  skipped:
    boolean;

  reason:
    string;

  predictionId:
    string | null;

  enriched:
    boolean;

  generationStatus?:
    | "allowed"
    | "withheld"
    | "insufficient-data"
    | "failed"
    | "existing";

  publicationDecision?:
    | "auto-publish"
    | "review"
    | "withhold"
    | "manual-review-flow";

  finalStatus?:
    string | null;
};

export type PredictionGenerationSummary = {
  generatedAt:
    string;

  date:
    string;

  mode:
    PredictionGenerationMode;

  fixturesFound:
    number;

  eligibleFixtures:
    number;

  generatedPredictions:
    number;

  skippedPredictions:
    number;

  existingPredictions:
    number;

  withheldPredictions:
    number;

  insufficientDataPredictions:
    number;

  failedPredictions:
    number;

  autoPublishedPredictions:
    number;

  reviewPredictions:
    number;

  policyWithheldPredictions:
    number;

  apiDateRequests:
    number;

  enrichedFixtureRequests:
    number;

  items:
    PredictionGenerationItem[];
};

function isPlainObject(
  value:
    unknown
): value is Record<
  string,
  unknown
> {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
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
    prototype ===
      null
  );
}

function sanitizeForFirestore(
  value:
    unknown
): unknown {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
      null ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
      "string"
  ) {
    return value;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .map(
        sanitizeForFirestore
      )
      .filter(
        (
          item
        ) =>
          item !==
            undefined &&
          !(
            typeof item ===
              "string" &&
            item.trim() ===
              ""
          )
      );
  }

  if (
    !isPlainObject(
      value
    )
  ) {
    return value;
  }

  const sanitized:
    Record<
      string,
      unknown
    > = {};

  for (
    const [
      rawKey,
      rawValue,
    ] of Object.entries(
      value
    )
  ) {
    const key =
      rawKey.trim();

    if (
      !key
    ) {
      continue;
    }

    const nextValue =
      sanitizeForFirestore(
        rawValue
      );

    if (
      nextValue !==
      undefined
    ) {
      sanitized[
        key
      ] =
        nextValue;
    }
  }

  return sanitized;
}

function normalizeDate(
  value:
    unknown
): string {
  if (
    typeof value !==
    "string"
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
  value:
    unknown
): number {
  const parsed =
    Number(
      value
    );

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

function normalizeMode(
  value:
    unknown
): PredictionGenerationMode {
  return value ===
    "enriched"
    ? "enriched"
    : "basic";
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

function normalizeOptionalText(
  value:
    unknown
): string | null {
  return (
    typeof value ===
      "string" &&
    value.trim()
  )
    ? value.trim()
    : null;
}

/*
 * Read the canonical market category
 * without depending on one exact
 * TypeScript primary-prediction shape.
 *
 * This keeps the learning integration
 * backward-compatible with older
 * prediction-engine document shapes.
 */
function getPrimaryMarketCategory(
  value:
    unknown
): string | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  return (
    normalizeOptionalText(
      source.marketCategory
    ) ??
    normalizeOptionalText(
      source.primaryMarketCategory
    ) ??
    normalizeOptionalText(
      source.category
    ) ??
    null
  );
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

function getFixtureStatusFromUnknown(
  value:
    unknown
): string {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return "";
  }

  const source =
    value as Record<
      string,
      any
    >;

  const status =
    source
      ?.fixture
      ?.status
      ?.short ||
    source
      ?.fixture
      ?.fixture
      ?.status
      ?.short ||
    source
      ?.status
      ?.short ||
    "";

  return String(
    status
  )
    .trim()
    .toUpperCase();
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

function isPreMatchStatus(
  status:
    string
): boolean {
  return UPCOMING_STATUSES.has(
    status
      .trim()
      .toUpperCase()
  );
}

function isEligibleFixture(
  fixture:
    FixtureLike
): boolean {
  const fixtureId =
    normalizeFixtureId(
      fixture
        .fixture
        ?.id
    );

  const homeName =
    fixture
      .teams
      ?.home
      ?.name;

  const awayName =
    fixture
      .teams
      ?.away
      ?.name;

  return Boolean(
    fixtureId &&
    homeName &&
    awayName &&
    isPreMatchStatus(
      getFixtureStatus(
        fixture
      )
    )
  );
}

function isAICEOPerformer(
  value:
    string
): boolean {
  return value
    .trim()
    .toLowerCase()
    .startsWith(
      "ai-ceo"
    );
}

async function buildPipelineInput(
  fixture:
    FixtureLike,

  mode:
    PredictionGenerationMode
) {
  const fixtureId =
    normalizeFixtureId(
      fixture
        .fixture
        ?.id
    );

  if (
    !fixtureId
  ) {
    throw new Error(
      "Fixture ID is missing."
    );
  }

  if (
    mode ===
    "enriched"
  ) {
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

      enriched:
        true,

      latestFixtureStatus:
        getFixtureStatusFromUnknown(
          complete
        ),

      sourceData: {
        fetchedFromApiFootball:
          true,

        fetchedAt:
          complete
            .fetchedAt,

        availability:
          complete
            .availability,

        headToHead:
          complete
            .headToHead,

        injuries:
          complete
            .injuries,

        odds:
          complete
            .odds,

        recentFixtures:
          complete
            .recentFixtures ?? {
            home:
              [],

            away:
              [],
          },

        teamSeasonStatistics:
          complete
            .teamSeasonStatistics ?? {
            home:
              null,

            away:
              null,
          },
      },
    };
  }

  return {
    input: {
      fixtureId,

      fixture,

      statistics:
        [],

      lineups:
        [],

      events:
        [],

      headToHead:
        [],

      injuries:
        [],

      odds:
        [],

      availability: {
        fixture:
          true,

        statistics:
          false,

        events:
          false,

        lineups:
          false,

        headToHead:
          false,

        injuries:
          false,

        odds:
          false,
      },

      fetchedAt:
        null,

      source:
        "prediction-generation-scheduler-basic",
    },

    enriched:
      false,

    latestFixtureStatus:
      getFixtureStatus(
        fixture
      ),

    sourceData: {
      fetchedFromApiFootball:
        false,

      fetchedAt:
        null,

      availability: {
        fixture:
          true,

        statistics:
          false,

        events:
          false,

        lineups:
          false,

        headToHead:
          false,

        injuries:
          false,

        odds:
          false,

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

      headToHead:
        [],

      injuries:
        [],

      odds:
        [],

      recentFixtures: {
        home:
          [],

        away:
          [],
      },

      teamSeasonStatistics: {
        home:
          null,

        away:
          null,
      },
    },
  };
}

async function writeGenerationAudit(
  input: {
    action:
      string;

    predictionId:
      string | null;

    fixtureId:
      string;

    source:
      string | undefined;

    generationMode:
      PredictionGenerationMode;

    fetchedFromApiFootball:
      boolean;

    dataAvailability:
      unknown;

    performedBy:
      string;

    modelVersion:
      string | null;

    dataQuality:
      unknown;

    generationDecision:
      unknown;

    openAIEligibility:
      unknown;

    reason:
      string | null;

    metadata?:
      Record<
        string,
        unknown
      >;
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
          input
            .predictionId,

        fixtureId:
          input
            .fixtureId,

        source:
          input.source ||
          "prediction-generation-scheduler",

        generationMode:
          input
            .generationMode,

        fetchedFromApiFootball:
          input
            .fetchedFromApiFootball,

        dataAvailability:
          input
            .dataAvailability,

        performedBy:
          input
            .performedBy,

        modelVersion:
          input
            .modelVersion,

        dataQuality:
          input
            .dataQuality,

        generationDecision:
          input
            .generationDecision,

        openAIEligibility:
          input
            .openAIEligibility,

        reason:
          input.reason,

        ...(
          input.metadata ||
          {}
        ),

        createdAt:
          FieldValue
            .serverTimestamp(),
      }) as FirebaseFirestore.DocumentData
    );
}

export async function generatePredictionsForDate(
  options: {
    date:
      string;

    limit?:
      number;

    mode?:
      PredictionGenerationMode;

    overwrite?:
      boolean;

    performedBy?:
      string;
  }
): Promise<
  PredictionGenerationSummary
> {
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

  const aiCEOAutonomous =
    isAICEOPerformer(
      performedBy
    );

  const fixtures =
    await getFixturesByDate(
      date
    );

  const eligibleFixtures =
    (
      fixtures as
        FixtureLike[]
    )
      .filter(
        isEligibleFixture
      )
      .slice(
        0,
        limit
      );

  const items:
    PredictionGenerationItem[] =
      [];

  let existingPredictions =
    0;

  let withheldPredictions =
    0;

  let insufficientDataPredictions =
    0;

  let failedPredictions =
    0;

  let enrichedFixtureRequests =
    0;

  let autoPublishedPredictions =
    0;

  let reviewPredictions =
    0;

  let policyWithheldPredictions =
    0;

  for (
    const fixture
    of eligibleFixtures
  ) {
    const fixtureId =
      normalizeFixtureId(
        fixture
          .fixture
          ?.id
      );

    const fixtureDate =
      getFixtureDate(
        fixture
      );

    const initialStatus =
      getFixtureStatus(
        fixture
      );

    if (
      !isPreMatchStatus(
        initialStatus
      )
    ) {
      items.push({
        fixtureId,

        fixtureDate,

        generated:
          false,

        skipped:
          true,

        reason:
          `Prediction generation blocked because fixture status is ${initialStatus || "unknown"}. Only pre-match fixtures can be predicted.`,

        predictionId:
          null,

        enriched:
          false,

        generationStatus:
          "withheld",

        publicationDecision:
          "withhold",

        finalStatus:
          null,
      });

      withheldPredictions +=
        1;

      continue;
    }

    const predictionRef =
      adminDb
        .collection(
          COLLECTION_NAME
        )
        .doc(
          `fixture-${fixtureId}`
        );

    const existing =
      await predictionRef
        .get();

    if (
      existing.exists &&
      options.overwrite !==
        true
    ) {
      existingPredictions +=
        1;

      items.push({
        fixtureId,

        fixtureDate,

        generated:
          false,

        skipped:
          true,

        reason:
          "Prediction already exists.",

        predictionId:
          predictionRef.id,

        enriched:
          Boolean(
            existing
              .data()
              ?.sourceData
              ?.availability
              ?.statistics
          ),

        generationStatus:
          "existing",

        finalStatus:
          String(
            existing
              .data()
              ?.status ||
            ""
          ) ||
          null,
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
        enrichedFixtureRequests +=
          1;
      }

      const latestStatus =
        pipeline
          .latestFixtureStatus ||
        getFixtureStatusFromUnknown(
          pipeline.input
        );

      if (
        !isPreMatchStatus(
          latestStatus
        )
      ) {
        const reason =
          `Prediction generation blocked because the latest fixture status is ${latestStatus || "unknown"}. ZERRA only generates predictions before kickoff.`;

        withheldPredictions +=
          1;

        await writeGenerationAudit({
          action:
            "generation-blocked-fixture-status",

          predictionId:
            existing.exists
              ? predictionRef.id
              : null,

          fixtureId,

          source:
            pipeline
              .input
              .source,

          generationMode:
            mode,

          fetchedFromApiFootball:
            pipeline
              .sourceData
              .fetchedFromApiFootball,

          dataAvailability:
            pipeline
              .sourceData
              .availability,

          performedBy,

          modelVersion:
            null,

          dataQuality:
            null,

          generationDecision: {
            allowed:
              false,

            status:
              "withheld",

            reason,

            fixtureStatus:
              latestStatus,
          },

          openAIEligibility:
            null,

          reason,
        });

        items.push({
          fixtureId,

          fixtureDate,

          generated:
            false,

          skipped:
            true,

          reason,

          predictionId:
            null,

          enriched:
            pipeline
              .enriched,

          generationStatus:
            "withheld",

          publicationDecision:
            "withhold",

          finalStatus:
            null,
        });

        continue;
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
        engineResult
          .data
          .generationDecision;

      const dataQuality =
        engineResult
          .data
          .dataQuality;

      const openAIEligibility =
        engineResult
          .data
          .openAIEligibility;

      const prediction =
        engineResult
          .data
          .prediction;

      const modelVersion =
        prediction
          .model
          .version;

      if (
        !generationDecision
          .allowed
      ) {
        if (
          generationDecision
            .status ===
          "withheld"
        ) {
          withheldPredictions +=
            1;
        } else {
          insufficientDataPredictions +=
            1;
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
            pipeline
              .input
              .source,

          generationMode:
            mode,

          fetchedFromApiFootball:
            pipeline
              .sourceData
              .fetchedFromApiFootball,

          dataAvailability:
            pipeline
              .sourceData
              .availability,

          performedBy,

          modelVersion,

          dataQuality,

          generationDecision,

          openAIEligibility,

          reason:
            generationDecision
              .reason,
        });

        items.push({
          fixtureId,

          fixtureDate,

          generated:
            false,

          skipped:
            true,

          reason:
            generationDecision
              .reason ||
            "Prediction generation was blocked by the data-quality gate.",

          predictionId:
            null,

          enriched:
            pipeline
              .enriched,

          generationStatus:
            generationDecision
              .status,

          publicationDecision:
            "withhold",

          finalStatus:
            null,
        });

        continue;
      }

      /*
       * AI CEO Publication Policy
       *
       * The prediction itself is evaluated
       * first. Historical ZAOS calibration
       * is then converted into a learning
       * policy context.
       *
       * The learning policy may:
       *
       * - preserve normal auto-publishing
       * - raise the confidence threshold
       * - restrict autonomous publishing
       *
       * It cannot automatically modify or
       * deploy the production model.
       */
      const primaryPrediction =
        prediction
          .vipPrediction
          ?.primaryPrediction;

      const primaryMarketCategory =
        getPrimaryMarketCategory(
          primaryPrediction
        );

      const learningPolicy =
        await evaluatePredictionLearningPolicy({
          marketCategory:
            primaryMarketCategory,

          modelVersion:
            modelVersion ??
            null,
        });

      const publicationPolicy =
        evaluatePredictionAutoPublishPolicy({
          confidence:
            primaryPrediction
              ?.confidence ??
            prediction
              .confidence ??
            null,

          primaryQualified:
            primaryPrediction
              ?.qualified ??
            null,

          consistencyValid:
            prediction
              .consistency
              ?.valid ??
            null,

          generationAllowed:
            generationDecision
              .allowed ===
            true,

          qualityGatePassed:
            true,

          preMatchStatusVerified:
            true,

          finalPrediction:
            prediction
              .vipPrediction
              ?.finalPrediction ??
            null,

          learningPolicy,
        });

      if (
        aiCEOAutonomous &&
        publicationPolicy
          .decision ===
          "withhold"
      ) {
        policyWithheldPredictions +=
          1;

        withheldPredictions +=
          1;

        await writeGenerationAudit({
          action:
            "ai-ceo-publication-withheld",

          predictionId:
            null,

          fixtureId,

          source:
            pipeline
              .input
              .source,

          generationMode:
            mode,

          fetchedFromApiFootball:
            pipeline
              .sourceData
              .fetchedFromApiFootball,

          dataAvailability:
            pipeline
              .sourceData
              .availability,

          performedBy,

          modelVersion,

          dataQuality,

          generationDecision,

          openAIEligibility,

          reason:
            publicationPolicy
              .reason,

          metadata: {
            aiCEOAutonomous:
              true,

            primaryMarketCategory,

            learningPolicy,

            publicationPolicy,
          },
        });

        items.push({
          fixtureId,

          fixtureDate,

          generated:
            false,

          skipped:
            true,

          reason:
            publicationPolicy
              .reason,

          predictionId:
            null,

          enriched:
            pipeline
              .enriched,

          generationStatus:
            "withheld",

          publicationDecision:
            "withhold",

          finalStatus:
            null,
        });

        continue;
      }

      const now =
        new Date()
          .toISOString();

      let finalStatus =
        engineResult
          .data
          .document
          .status ||
        prediction.status ||
        "draft";

      let publicationDecision:
        PredictionGenerationItem[
          "publicationDecision"
        ] =
        "manual-review-flow";

      const publicationMetadata:
        Record<
          string,
          unknown
        > = {
        aiCEOAutonomous,

        policy:
          publicationPolicy,

        learningPolicy,

        primaryMarketCategory,

        evaluatedAt:
          now,
      };

      const approvalFields:
        Record<
          string,
          unknown
        > = {};

      if (
        aiCEOAutonomous
      ) {
        publicationDecision =
          publicationPolicy
            .decision;

        if (
          publicationPolicy
            .decision ===
          "auto-publish"
        ) {
          finalStatus =
            "published";

          autoPublishedPredictions +=
            1;

          approvalFields.approvedAt =
            FieldValue
              .serverTimestamp();

          approvalFields.approvedBy =
            "ai-ceo";

          approvalFields.publishedAt =
            FieldValue
              .serverTimestamp();

          approvalFields.publishedBy =
            "ai-ceo";

          approvalFields.reviewedAt =
            FieldValue
              .serverTimestamp();

          approvalFields.reviewedBy =
            "ai-ceo";

          publicationMetadata
            .automaticallyApproved =
            true;

          publicationMetadata
            .automaticallyPublished =
            true;
        } else if (
          publicationPolicy
            .decision ===
          "review"
        ) {
          finalStatus =
            "review";

          reviewPredictions +=
            1;

          publicationMetadata
            .automaticallyApproved =
            false;

          publicationMetadata
            .automaticallyPublished =
            false;

          publicationMetadata
            .requiresHumanReview =
            true;
        }
      }

      const rawDocumentData = {
        ...engineResult
          .data
          .document,

        status:
          finalStatus,

        prediction: {
          ...prediction,

          status:
            finalStatus,
        },

        dataQuality,

        generationDecision,

        openAIEligibility,

        sourceData:
          pipeline
            .sourceData,

        publicationAutomation:
          publicationMetadata,

        ...approvalFields,

        correct:
          engineResult
            .data
            .validation
            .correct,

        result:
          engineResult
            .data
            .validation
            .result,

        resultChecked:
          engineResult
            .data
            .validation
            .checked,

        manuallyChecked:
          false,

        checkedAt:
          engineResult
            .data
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
          existing
            .data()
            ?.createdAt
            ? existing
                .data()
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

          preMatchStatusVerified:
            true,

          verifiedFixtureStatus:
            latestStatus,

          generationStatus:
            generationDecision
              .status,

          dataCompleteness:
            dataQuality
              .completeness,

          dataReliability:
            dataQuality
              .reliability,

          initiatedByAICEO:
            aiCEOAutonomous,

          learningPolicyApplied:
            true,

          learningPolicyDecision:
            learningPolicy
              .decision,

          primaryMarketCategory,
        },
      };

      const documentData =
        sanitizeForFirestore(
          rawDocumentData
        ) as FirebaseFirestore.DocumentData;

      const generationAuditRef =
        adminDb
          .collection(
            AUDIT_COLLECTION
          )
          .doc();

      const policyAuditRef =
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
        generationAuditRef,
        sanitizeForFirestore({
          action:
            existing.exists
              ? "regenerate"
              : "generate",

          predictionId:
            predictionRef.id,

          fixtureId,

          source:
            pipeline
              .input
              .source,

          generationMode:
            mode,

          fetchedFromApiFootball:
            pipeline
              .sourceData
              .fetchedFromApiFootball,

          dataAvailability:
            pipeline
              .sourceData
              .availability,

          performedBy,

          modelVersion,

          dataQuality,

          generationDecision,

          openAIEligibility,

          preMatchStatusVerified:
            true,

          verifiedFixtureStatus:
            latestStatus,

          aiCEOAutonomous,

          primaryMarketCategory,

          learningPolicy,

          publicationDecision,

          finalStatus,

          createdAt:
            FieldValue
              .serverTimestamp(),
        }) as FirebaseFirestore.DocumentData
      );

      batch.set(
        policyAuditRef,
        sanitizeForFirestore({
          action:
            aiCEOAutonomous
              ? publicationPolicy
                  .decision ===
                "auto-publish"
                ? "ai-ceo-auto-publish"
                : "ai-ceo-review-required"
              : "publication-policy-evaluated",

          predictionId:
            predictionRef.id,

          fixtureId,

          previousStatus:
            engineResult
              .data
              .document
              .status ||
            prediction.status ||
            "draft",

          newStatus:
            finalStatus,

          performedBy:
            aiCEOAutonomous
              ? "ai-ceo"
              : performedBy,

          aiCEOAutonomous,

          primaryMarketCategory,

          learningPolicy,

          publicationPolicy,

          modelVersion,

          confidence:
            primaryPrediction
              ?.confidence ??
            prediction
              .confidence ??
            null,

          primaryPrediction:
            primaryPrediction ??
            null,

          consistency:
            prediction
              .consistency ??
            null,

          reason:
            publicationPolicy
              .reason,

          createdAt:
            FieldValue
              .serverTimestamp(),
        }) as FirebaseFirestore.DocumentData
      );

      await batch.commit();

      items.push({
        fixtureId,

        fixtureDate,

        generated:
          true,

        skipped:
          false,

        reason:
          aiCEOAutonomous
            ? publicationPolicy
                .decision ===
              "auto-publish"
              ? "Prediction generated and published automatically by AI CEO."
              : "Prediction generated successfully and sent to the review queue."
            : "Prediction generated successfully.",

        predictionId:
          predictionRef.id,

        enriched:
          pipeline
            .enriched,

        generationStatus:
          "allowed",

        publicationDecision,

        finalStatus,
      });
    } catch (
      error
    ) {
      failedPredictions +=
        1;

      const reason =
        error instanceof
          Error
          ? error.message
          : "Prediction generation failed.";

      try {
        await writeGenerationAudit({
          action:
            "generation-failed",

          predictionId:
            null,

          fixtureId,

          source:
            "prediction-generation-scheduler",

          generationMode:
            mode,

          fetchedFromApiFootball:
            mode ===
            "enriched",

          dataAvailability:
            null,

          performedBy,

          modelVersion:
            null,

          dataQuality:
            null,

          generationDecision:
            null,

          openAIEligibility:
            null,

          reason,

          metadata: {
            aiCEOAutonomous,
          },
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

        generated:
          false,

        skipped:
          true,

        reason,

        predictionId:
          null,

        enriched:
          mode ===
          "enriched",

        generationStatus:
          "failed",

        finalStatus:
          null,
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
      eligibleFixtures
        .length,

    generatedPredictions:
      items.filter(
        (
          item
        ) =>
          item.generated
      ).length,

    skippedPredictions:
      items.filter(
        (
          item
        ) =>
          item.skipped
      ).length,

    existingPredictions,

    withheldPredictions,

    insufficientDataPredictions,

    failedPredictions,

    autoPublishedPredictions,

    reviewPredictions,

    policyWithheldPredictions,

    apiDateRequests:
      1,

    enrichedFixtureRequests,

    items,
  };
}