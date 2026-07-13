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

export type PredictionPipelineInput = {
  fixture: unknown;
  statistics?: unknown[];
  lineups?: unknown[];
  events?: unknown[];
  source?: string;
};

export type PredictionPipelineResult = {
  prediction: PredictionResult;
  explanation: ExplanationResult;
  context: AIContext;
  validation: ValidationResult;
  document: PredictionDocument;
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

function buildMatchEnvelope(
  input: PredictionPipelineInput
) {
  const fixture =
    input.fixture as FixtureLike;

  return {
    fixture: {
      fixture: fixture.fixture,
      league: fixture.league,
      teams: fixture.teams,
      goals: fixture.goals,
    },
    statistics: Array.isArray(
      input.statistics
    )
      ? input.statistics
      : [],
    lineups: Array.isArray(input.lineups)
      ? input.lineups
      : [],
    events: Array.isArray(input.events)
      ? input.events
      : [],
  };
}

export async function runPredictionPipeline(
  input: PredictionPipelineInput
): Promise<PredictionPipelineResult> {
  assertFixture(input.fixture);

  const match =
    buildMatchEnvelope(input);

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
      fixture: input.fixture,
      prediction,
      explanation,
      context,
      validation,
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
  };
}