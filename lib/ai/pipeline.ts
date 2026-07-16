import {
  calculatePrediction,
  type PredictionResult,
} from "./prediction";

import {
  generateExplanation,
  type ExplanationResult,
} from "./explanation";

import {
  buildAIContext,
  type AIContext,
} from "./context";

import {
  validatePrediction,
  type ValidationResult,
} from "./validator";

import {
  buildPredictionDocument,
  type PredictionDocument,
} from "./builder";

import {
  evaluatePredictionDataQuality,
} from "./data-quality";

import type {
  GenerationDecision,
  OpenAIAnalysisEligibility,
  PredictionDataQuality,
} from "./types-v3";

export type PredictionPipelineAvailability = {
  fixture: boolean;
  statistics: boolean;
  events: boolean;
  lineups: boolean;
  headToHead: boolean;
  injuries: boolean;
  odds: boolean;
};

export type PredictionPipelineInput = {
  fixtureId?: string;

  fixture: unknown;

  statistics?: unknown[];
  lineups?: unknown[];
  events?: unknown[];

  headToHead?: unknown[];
  injuries?: unknown[];
  odds?: unknown[];

  availability?:
    Partial<PredictionPipelineAvailability>;

  fetchedAt?: string | null;
  source?: string;
};

export type PredictionPipelineResult = {
  prediction: PredictionResult;
  explanation: ExplanationResult;
  context: AIContext;
  validation: ValidationResult;
  document: PredictionDocument;

  dataQuality: PredictionDataQuality;
  generationDecision: GenerationDecision;

  openAIEligibility:
    OpenAIAnalysisEligibility;
};

type FixtureLike = {
  fixture?: {
    id?: number | string;
    date?: string;

    status?: {
      short?: string;
      long?: string;
    };

    venue?: {
      name?: string;
      city?: string;
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

function assertFixture(
  value: unknown
): asserts value is FixtureLike {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "A valid fixture object is required."
    );
  }

  const fixture =
    value as FixtureLike;

  const fixtureId =
    fixture.fixture?.id;

  if (
    fixtureId === undefined ||
    fixtureId === null ||
    String(fixtureId).trim() === ""
  ) {
    throw new Error(
      "Fixture ID is required."
    );
  }

  if (
    !fixture.teams?.home?.name ||
    !fixture.teams?.away?.name
  ) {
    throw new Error(
      "Home and away team names are required."
    );
  }
}

function ensureArray(
  value: unknown
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function hasArrayData(
  value: unknown
): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0
  );
}

function buildMatchEnvelope(
  input: PredictionPipelineInput
) {
  const fixture =
    input.fixture as FixtureLike;

  return {
    fixture: {
      fixture:
        fixture.fixture,

      league:
        fixture.league,

      teams:
        fixture.teams,

      goals:
        fixture.goals,
    },

    statistics:
      ensureArray(
        input.statistics
      ),

    lineups:
      ensureArray(
        input.lineups
      ),

    events:
      ensureArray(
        input.events
      ),

    headToHead:
      ensureArray(
        input.headToHead
      ),

    injuries:
      ensureArray(
        input.injuries
      ),

    odds:
      ensureArray(
        input.odds
      ),
  };
}

function resolveAvailability(
  input: PredictionPipelineInput
): PredictionPipelineAvailability {
  return {
    fixture:
      input.availability
        ?.fixture ??
      Boolean(input.fixture),

    statistics:
      input.availability
        ?.statistics ??
      hasArrayData(
        input.statistics
      ),

    events:
      input.availability
        ?.events ??
      hasArrayData(
        input.events
      ),

    lineups:
      input.availability
        ?.lineups ??
      hasArrayData(
        input.lineups
      ),

    headToHead:
      input.availability
        ?.headToHead ??
      hasArrayData(
        input.headToHead
      ),

    injuries:
      input.availability
        ?.injuries ??
      hasArrayData(
        input.injuries
      ),

    odds:
      input.availability
        ?.odds ??
      hasArrayData(
        input.odds
      ),
  };
}

function normalizeFixtureId(
  input: PredictionPipelineInput
): string {
  const fixture =
    input.fixture as FixtureLike;

  const value =
    input.fixtureId ??
    fixture.fixture?.id ??
    "";

  return String(value).trim();
}

function createInputFingerprint(
  input: PredictionPipelineInput,
  availability:
    PredictionPipelineAvailability
): string {
  const fixture =
    input.fixture as FixtureLike;

  const fingerprintSource = [
    normalizeFixtureId(input),
    fixture.fixture?.date ?? "",
    fixture.fixture?.status?.short ??
      "",

    availability.fixture
      ? "fixture-1"
      : "fixture-0",

    availability.statistics
      ? "statistics-1"
      : "statistics-0",

    availability.events
      ? "events-1"
      : "events-0",

    availability.lineups
      ? "lineups-1"
      : "lineups-0",

    availability.headToHead
      ? "h2h-1"
      : "h2h-0",

    availability.injuries
      ? "injuries-1"
      : "injuries-0",

    availability.odds
      ? "odds-1"
      : "odds-0",

    input.fetchedAt ?? "",
  ].join("|");

  let hash = 0;

  for (
    let index = 0;
    index <
    fingerprintSource.length;
    index += 1
  ) {
    hash =
      (
        hash * 31 +
        fingerprintSource.charCodeAt(
          index
        )
      ) >>>
      0;
  }

  return [
    "prediction-v3",
    normalizeFixtureId(input),
    hash.toString(16),
  ].join("-");
}

function evaluatePipelineDataQuality(
  input: PredictionPipelineInput
) {
  const availability =
    resolveAvailability(input);

  const inputFingerprint =
    createInputFingerprint(
      input,
      availability
    );

  /*
   * The current v2 form, strength,
   * and goals modules still depend
   * on placeholder fallback values.
   *
   * Until real recent-form and team
   * profile data are connected,
   * premium prediction persistence
   * must remain withheld.
   */
  const generatedFromFallback =
    true;

  return evaluatePredictionDataQuality({
    availability: {
      fixture:
        availability.fixture,

      /*
       * Match statistics from an
       * upcoming fixture are not
       * recent-form history.
       */
      recentFormHome: false,
      recentFormAway: false,

      homeAwaySplits: false,

      /*
       * Statistics are preserved as
       * available context, but they
       * do not yet prove that complete
       * team profiles exist for both
       * teams.
       */
      teamStatisticsHome:
        availability.statistics,

      teamStatisticsAway:
        availability.statistics,

      headToHead:
        availability.headToHead,

      injuries:
        availability.injuries,

      lineups:
        availability.lineups,

      odds:
        availability.odds,

      historicalModelData: false,
    },

    freshness: {
      fixtureFetchedAt:
        input.fetchedAt ?? null,

      recentFormFetchedAt:
        null,

      statisticsFetchedAt:
        availability.statistics
          ? input.fetchedAt ?? null
          : null,

      headToHeadFetchedAt:
        availability.headToHead
          ? input.fetchedAt ?? null
          : null,

      injuriesFetchedAt:
        availability.injuries
          ? input.fetchedAt ?? null
          : null,

      lineupsFetchedAt:
        availability.lineups
          ? input.fetchedAt ?? null
          : null,

      oddsFetchedAt:
        availability.odds
          ? input.fetchedAt ?? null
          : null,
    },

    sampleSize: {
      home: 0,
      away: 0,
    },

    generatedFromFallback,

    warnings: [
      "Prediction Engine v2 fallback factors are still active.",
      "Recent-form history is not connected to the prediction pipeline.",
      "Home and away performance splits are not connected.",
    ],

    dailyAIBudgetRemaining:
      true,

    cachedOpenAIResultAvailable:
      false,

    inputFingerprint,

    estimatedOpenAIInputTokens:
      null,

    estimatedOpenAIOutputTokens:
      null,
  });
}

export async function runPredictionPipeline(
  input: PredictionPipelineInput
): Promise<PredictionPipelineResult> {
  assertFixture(input.fixture);

  const qualityResult =
    evaluatePipelineDataQuality(
      input
    );

  const match =
    buildMatchEnvelope(input);

  /*
   * The v2 prediction runs temporarily
   * for backward compatibility with
   * the current UI and Firestore model.
   *
   * The generation decision is used
   * as the v3 quality gate.
   */
  const prediction =
    calculatePrediction(match);

  const explanation =
    generateExplanation(
      match,
      prediction
    );

  const context =
    buildAIContext(
      match,
      prediction
    );

  const validation =
    validatePrediction(
      prediction,
      input.fixture
    );

  const document =
    buildPredictionDocument({
      fixture:
        input.fixture,

      prediction,

      explanation,

      context,

      validation,

      dataQuality:
        qualityResult.dataQuality,

      generationDecision:
        qualityResult
          .generationDecision,

      openAIEligibility:
        qualityResult
          .openAIEligibility,

      source:
        input.source ||
        "prediction-pipeline",
    });

  return {
    prediction,
    explanation,
    context,
    validation,
    document,

    dataQuality:
      qualityResult.dataQuality,

    generationDecision:
      qualityResult
        .generationDecision,

    openAIEligibility:
      qualityResult
        .openAIEligibility,
  };
}