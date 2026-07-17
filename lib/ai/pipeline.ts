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

  recentFixturesHome: boolean;
  recentFixturesAway: boolean;

  teamSeasonStatisticsHome: boolean;
  teamSeasonStatisticsAway: boolean;

  homeAwaySplits: boolean;
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

  recentFixtures?: {
    home?: unknown[];
    away?: unknown[];
  };

  teamSeasonStatistics?: {
    home?: unknown | null;
    away?: unknown | null;
  };

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

type TeamSeasonStatisticsLike = {
  fixtures?: {
    played?: {
      home?: number;
      away?: number;
      total?: number;
    };
  };

  goals?: {
    for?: {
      average?: {
        home?: string | number | null;
        away?: string | number | null;
        total?: string | number | null;
      };
    };

    against?: {
      average?: {
        home?: string | number | null;
        away?: string | number | null;
        total?: string | number | null;
      };
    };
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

function hasObjectData(
  value: unknown
): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function hasHomeAwaySplits(
  value: unknown
): boolean {
  if (
    !hasObjectData(value)
  ) {
    return false;
  }

  const statistics =
    value as TeamSeasonStatisticsLike;

  const played =
    statistics.fixtures?.played;

  const goalsFor =
    statistics.goals
      ?.for?.average;

  const goalsAgainst =
    statistics.goals
      ?.against?.average;

  return Boolean(
    typeof played?.home === "number" &&
    typeof played?.away === "number" &&

    goalsFor?.home !== undefined &&
    goalsFor?.home !== null &&
    goalsFor?.away !== undefined &&
    goalsFor?.away !== null &&

    goalsAgainst?.home !== undefined &&
    goalsAgainst?.home !== null &&
    goalsAgainst?.away !== undefined &&
    goalsAgainst?.away !== null
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

    recentFixtures: {
      home:
        ensureArray(
          input.recentFixtures
            ?.home
        ),

      away:
        ensureArray(
          input.recentFixtures
            ?.away
        ),
    },

    teamSeasonStatistics: {
      home:
        input
          .teamSeasonStatistics
          ?.home ?? null,

      away:
        input
          .teamSeasonStatistics
          ?.away ?? null,
    },
  };
}

function resolveAvailability(
  input: PredictionPipelineInput
): PredictionPipelineAvailability {
  const recentHome =
    ensureArray(
      input.recentFixtures?.home
    );

  const recentAway =
    ensureArray(
      input.recentFixtures?.away
    );

  const seasonHome =
    input.teamSeasonStatistics
      ?.home ?? null;

  const seasonAway =
    input.teamSeasonStatistics
      ?.away ?? null;

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

    recentFixturesHome:
      input.availability
        ?.recentFixturesHome ??
      recentHome.length > 0,

    recentFixturesAway:
      input.availability
        ?.recentFixturesAway ??
      recentAway.length > 0,

    teamSeasonStatisticsHome:
      input.availability
        ?.teamSeasonStatisticsHome ??
      hasObjectData(
        seasonHome
      ),

    teamSeasonStatisticsAway:
      input.availability
        ?.teamSeasonStatisticsAway ??
      hasObjectData(
        seasonAway
      ),

    homeAwaySplits:
      input.availability
        ?.homeAwaySplits ??
      (
        hasHomeAwaySplits(
          seasonHome
        ) &&
        hasHomeAwaySplits(
          seasonAway
        )
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

  const recentHomeCount =
    ensureArray(
      input.recentFixtures?.home
    ).length;

  const recentAwayCount =
    ensureArray(
      input.recentFixtures?.away
    ).length;

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

    `recent-home-${recentHomeCount}`,
    `recent-away-${recentAwayCount}`,

    availability
      .teamSeasonStatisticsHome
      ? "season-home-1"
      : "season-home-0",

    availability
      .teamSeasonStatisticsAway
      ? "season-away-1"
      : "season-away-0",

    availability.homeAwaySplits
      ? "splits-1"
      : "splits-0",

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

  const recentHome =
    ensureArray(
      input.recentFixtures?.home
    );

  const recentAway =
    ensureArray(
      input.recentFixtures?.away
    );

  const inputFingerprint =
    createInputFingerprint(
      input,
      availability
    );

  /*
   * The scoring modules now consume
   * real recent-form and season data.
   *
   * A prediction is treated as fallback
   * whenever the minimum evidence needed
   * by those modules is incomplete.
   */
  const minimumRecentMatches = 5;

  const hasRecentFormEvidence =
    availability.recentFixturesHome &&
    availability.recentFixturesAway &&
    recentHome.length >= minimumRecentMatches &&
    recentAway.length >= minimumRecentMatches;

  const hasSeasonEvidence =
    availability.teamSeasonStatisticsHome &&
    availability.teamSeasonStatisticsAway &&
    availability.homeAwaySplits;

  const generatedFromFallback =
    !(
      hasRecentFormEvidence &&
      hasSeasonEvidence
    );

  const warnings: string[] = [];

  if (
    !availability
      .recentFixturesHome ||
    !availability
      .recentFixturesAway
  ) {
    warnings.push(
      "Recent-form fixtures are missing for one or both teams."
    );
  }

  if (
    !availability
      .teamSeasonStatisticsHome ||
    !availability
      .teamSeasonStatisticsAway
  ) {
    warnings.push(
      "Season statistics are missing for one or both teams."
    );
  }

  if (
    !availability
      .homeAwaySplits
  ) {
    warnings.push(
      "Complete home and away performance splits are unavailable."
    );
  }

  if (
    recentHome.length <
      minimumRecentMatches ||
    recentAway.length <
      minimumRecentMatches
  ) {
    warnings.push(
      `At least ${minimumRecentMatches} completed recent fixtures are required for each team.`
    );
  }

  if (generatedFromFallback) {
    warnings.push(
      "The prediction used neutral fallback values because minimum evidence requirements were not met."
    );
  }

  return evaluatePredictionDataQuality({
    availability: {
      fixture:
        availability.fixture,

      recentFormHome:
        availability
          .recentFixturesHome,

      recentFormAway:
        availability
          .recentFixturesAway,

      homeAwaySplits:
        availability
          .homeAwaySplits,

      teamStatisticsHome:
        availability
          .teamSeasonStatisticsHome,

      teamStatisticsAway:
        availability
          .teamSeasonStatisticsAway,

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
        (
          availability
            .recentFixturesHome ||
          availability
            .recentFixturesAway
        )
          ? input.fetchedAt ?? null
          : null,

      statisticsFetchedAt:
        (
          availability
            .teamSeasonStatisticsHome ||
          availability
            .teamSeasonStatisticsAway
        )
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
      home:
        recentHome.length,

      away:
        recentAway.length,
    },

    generatedFromFallback,

    warnings,

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
   * The statistical scoring modules now
   * consume enriched recent-form and
   * home/away season evidence.
   *
   * The hard quality gate remains active:
   * persistence is allowed only when the
   * required evidence passes validation.
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