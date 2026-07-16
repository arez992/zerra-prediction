import type {
  PredictionResult,
  PredictionStatus,
} from "./prediction";

import type {
  ExplanationResult,
} from "./explanation";

import type {
  AIContext,
} from "./context";

import type {
  ValidationResult,
} from "./validator";

import type {
  GenerationDecision,
  OpenAIAnalysisEligibility,
  PredictionDataQuality,
} from "./types-v3";

export type PredictionDocument = {
  fixtureId: string;
  fixtureDate: string | null;

  competition: {
    id: number | null;
    name: string | null;
    country: string | null;
    season: number | null;
    round: string | null;
  };

  teams: {
    home: {
      id: number | null;
      name: string;
    };

    away: {
      id: number | null;
      name: string;
    };
  };

  venue: {
    name: string | null;
    city: string | null;
  };

  fixtureStatus: {
    short: string | null;
    long: string | null;
  };

  publicPrediction:
    PredictionResult["publicPrediction"];

  vipPrediction:
    PredictionResult["vipPrediction"];

  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
    under25: number;
    btts: number;
  };

  risk: {
    label: PredictionResult["risk"];
    score: number;
  };

  expectedGoals: {
    home: number;
    away: number;
    total: number;
  };

  model: PredictionResult["model"];

  review: PredictionResult["review"];

  status: PredictionStatus;

  explanation: {
    publicSummary: string;
    publicReasons: string[];
    vipSummary: string;
    vipReasons: string[];
  };

  validation: ValidationResult;

  /*
   * Prediction Engine v3 metadata.
   *
   * These fields remain optional so
   * existing v2 consumers and older
   * Firestore documents continue to work.
   */
  dataQuality?: PredictionDataQuality;

  generationDecision?: GenerationDecision;

  openAIEligibility?:
    OpenAIAnalysisEligibility;

  source: string;

  generatedAt: string;
  updatedAt: string;
};

type BuildPredictionDocumentInput = {
  fixture: unknown;

  prediction: PredictionResult;

  explanation: ExplanationResult;

  context: AIContext;

  validation: ValidationResult;

  dataQuality?: PredictionDataQuality;

  generationDecision?: GenerationDecision;

  openAIEligibility?:
    OpenAIAnalysisEligibility;

  source: string;
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
};

function safeString(
  value: unknown
): string | null {
  return typeof value === "string" &&
    value.trim().length > 0
    ? value.trim()
    : null;
}

function safeNumber(
  value: unknown
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

export function buildPredictionDocument(
  input: BuildPredictionDocumentInput
): PredictionDocument {
  const fixture =
    input.fixture as FixtureLike;

  const generatedAt =
    input.prediction.model.generatedAt ||
    new Date().toISOString();

  const document: PredictionDocument = {
    fixtureId: String(
      fixture.fixture?.id ?? ""
    ),

    fixtureDate:
      safeString(
        fixture.fixture?.date
      ),

    competition: {
      id:
        safeNumber(
          fixture.league?.id
        ),

      name:
        safeString(
          fixture.league?.name
        ),

      country:
        safeString(
          fixture.league?.country
        ),

      season:
        safeNumber(
          fixture.league?.season
        ),

      round:
        safeString(
          fixture.league?.round
        ),
    },

    teams: {
      home: {
        id:
          safeNumber(
            fixture.teams?.home?.id
          ),

        name:
          safeString(
            fixture.teams?.home?.name
          ) || "Home team",
      },

      away: {
        id:
          safeNumber(
            fixture.teams?.away?.id
          ),

        name:
          safeString(
            fixture.teams?.away?.name
          ) || "Away team",
      },
    },

    venue: {
      name:
        safeString(
          fixture.fixture?.venue?.name
        ),

      city:
        safeString(
          fixture.fixture?.venue?.city
        ),
    },

    fixtureStatus: {
      short:
        safeString(
          fixture.fixture?.status?.short
        ),

      long:
        safeString(
          fixture.fixture?.status?.long
        ),
    },

    publicPrediction:
      input.prediction.publicPrediction,

    vipPrediction:
      input.prediction.vipPrediction,

    probabilities: {
      homeWin:
        input.prediction.homeWin,

      draw:
        input.prediction.draw,

      awayWin:
        input.prediction.awayWin,

      over25:
        input.prediction.over25,

      under25:
        input.prediction.under25,

      btts:
        input.prediction.btts,
    },

    risk: {
      label:
        input.prediction.risk,

      score:
        input.prediction.riskScore,
    },

    expectedGoals: {
      home:
        input.prediction
          .homeExpectedGoals,

      away:
        input.prediction
          .awayExpectedGoals,

      total:
        input.prediction
          .expectedGoals,
    },

    model:
      input.prediction.model,

    review:
      input.prediction.review,

    status:
      input.prediction.status,

    explanation: {
      publicSummary:
        input.explanation
          .publicSummary,

      publicReasons:
        input.explanation
          .publicReasons,

      vipSummary:
        input.explanation
          .vipSummary,

      vipReasons:
        input.explanation
          .vipReasons,
    },

    validation:
      input.validation,

    source:
      input.source,

    generatedAt,

    updatedAt:
      new Date().toISOString(),
  };

  if (input.dataQuality) {
    document.dataQuality =
      input.dataQuality;
  }

  if (input.generationDecision) {
    document.generationDecision =
      input.generationDecision;
  }

  if (input.openAIEligibility) {
    document.openAIEligibility =
      input.openAIEligibility;
  }

  return document;
}