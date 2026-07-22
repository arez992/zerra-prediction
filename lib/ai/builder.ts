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

  fixtureDate:
    string | null;

  competition: {
    id:
      number | null;

    name:
      string | null;

    country:
      string | null;

    season:
      number | null;

    round:
      string | null;
  };

  teams: {
    home: {
      id:
        number | null;

      name:
        string;

      logo:
        string | null;
    };

    away: {
      id:
        number | null;

      name:
        string;

      logo:
        string | null;
    };
  };

  venue: {
    name:
      string | null;

    city:
      string | null;
  };

  fixtureStatus: {
    short:
      string | null;

    long:
      string | null;
  };

  publicPrediction:
    PredictionResult["publicPrediction"];

  vipPrediction:
    PredictionResult["vipPrediction"];

  probabilities: {
    homeWin:
      number;

    draw:
      number;

    awayWin:
      number;

    over25:
      number;

    under25:
      number;

    btts:
      number;

    over15?:
      number;

    under15?:
      number;

    over35?:
      number;

    under35?:
      number;

    bttsYes?:
      number;

    bttsNo?:
      number;

    homeOver05?:
      number;

    homeUnder05?:
      number;

    homeOver15?:
      number;

    homeUnder15?:
      number;

    awayOver05?:
      number;

    awayUnder05?:
      number;

    awayOver15?:
      number;

    awayUnder15?:
      number;

    doubleChance1X?:
      number;

    doubleChanceX2?:
      number;

    doubleChance12?:
      number;
  };

  risk: {
    label:
      PredictionResult["risk"];

    score:
      number;
  };

  expectedGoals: {
    home:
      number;

    away:
      number;

    total:
      number;
  };

  model:
    PredictionResult["model"];

  review:
    PredictionResult["review"];

  status:
    PredictionStatus;

  explanation: {
    publicSummary:
      string;

    publicReasons:
      string[];

    vipSummary:
      string;

    vipReasons:
      string[];
  };

  validation:
    ValidationResult;

  dataQuality?:
    PredictionDataQuality;

  generationDecision?:
    GenerationDecision;

  openAIEligibility?:
    OpenAIAnalysisEligibility;

  source:
    string;

  generatedAt:
    string;

  updatedAt:
    string;
};

type BuildPredictionDocumentInput = {
  fixture:
    unknown;

  prediction:
    PredictionResult;

  explanation:
    ExplanationResult;

  context:
    AIContext;

  validation:
    ValidationResult;

  dataQuality?:
    PredictionDataQuality;

  generationDecision?:
    GenerationDecision;

  openAIEligibility?:
    OpenAIAnalysisEligibility;

  source:
    string;
};

type FixtureLike = {
  fixture?: {
    id?:
      number | string;

    date?:
      string;

    status?: {
      short?:
        string;

      long?:
        string;
    };

    venue?: {
      name?:
        string;

      city?:
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

      logo?:
        string;
    };

    away?: {
      id?:
        number;

      name?:
        string;

      logo?:
        string;
    };
  };
};

function safeString(
  value:
    unknown
):
  string | null {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  )
    ? value.trim()
    : null;
}

function safeNumber(
  value:
    unknown
):
  number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}

export function buildPredictionDocument(
  input:
    BuildPredictionDocumentInput
): PredictionDocument {
  const fixture =
    input.fixture as
      FixtureLike;

  const generatedAt =
    input
      .prediction
      .model
      .generatedAt ||
    new Date()
      .toISOString();

  const markets =
    input
      .prediction
      .vipPrediction
      .markets;

  const document:
    PredictionDocument = {
    fixtureId:
      String(
        fixture
          .fixture
          ?.id ??
        ""
      ),

    fixtureDate:
      safeString(
        fixture
          .fixture
          ?.date
      ),

    competition: {
      id:
        safeNumber(
          fixture
            .league
            ?.id
        ),

      name:
        safeString(
          fixture
            .league
            ?.name
        ),

      country:
        safeString(
          fixture
            .league
            ?.country
        ),

      season:
        safeNumber(
          fixture
            .league
            ?.season
        ),

      round:
        safeString(
          fixture
            .league
            ?.round
        ),
    },

    teams: {
      home: {
        id:
          safeNumber(
            fixture
              .teams
              ?.home
              ?.id
          ),

        name:
          safeString(
            fixture
              .teams
              ?.home
              ?.name
          ) ||
          "Home team",

        logo:
          safeString(
            fixture
              .teams
              ?.home
              ?.logo
          ),
      },

      away: {
        id:
          safeNumber(
            fixture
              .teams
              ?.away
              ?.id
          ),

        name:
          safeString(
            fixture
              .teams
              ?.away
              ?.name
          ) ||
          "Away team",

        logo:
          safeString(
            fixture
              .teams
              ?.away
              ?.logo
          ),
      },
    },

    venue: {
      name:
        safeString(
          fixture
            .fixture
            ?.venue
            ?.name
        ),

      city:
        safeString(
          fixture
            .fixture
            ?.venue
            ?.city
        ),
    },

    fixtureStatus: {
      short:
        safeString(
          fixture
            .fixture
            ?.status
            ?.short
        ),

      long:
        safeString(
          fixture
            .fixture
            ?.status
            ?.long
        ),
    },

    publicPrediction:
      input
        .prediction
        .publicPrediction,

    vipPrediction:
      input
        .prediction
        .vipPrediction,

    probabilities: {
      homeWin:
        markets.homeWin,

      draw:
        markets.draw,

      awayWin:
        markets.awayWin,

      over25:
        markets.over25,

      under25:
        markets.under25,

      btts:
        markets.btts,

      over15:
        markets.over15,

      under15:
        markets.under15,

      over35:
        markets.over35,

      under35:
        markets.under35,

      bttsYes:
        markets.bttsYes,

      bttsNo:
        markets.bttsNo,

      homeOver05:
        markets.homeOver05,

      homeUnder05:
        markets.homeUnder05,

      homeOver15:
        markets.homeOver15,

      homeUnder15:
        markets.homeUnder15,

      awayOver05:
        markets.awayOver05,

      awayUnder05:
        markets.awayUnder05,

      awayOver15:
        markets.awayOver15,

      awayUnder15:
        markets.awayUnder15,

      doubleChance1X:
        markets
          .doubleChance1X,

      doubleChanceX2:
        markets
          .doubleChanceX2,

      doubleChance12:
        markets
          .doubleChance12,
    },

    risk: {
      label:
        input
          .prediction
          .risk,

      score:
        input
          .prediction
          .riskScore,
    },

    expectedGoals: {
      home:
        input
          .prediction
          .homeExpectedGoals,

      away:
        input
          .prediction
          .awayExpectedGoals,

      total:
        input
          .prediction
          .expectedGoals,
    },

    model:
      input
        .prediction
        .model,

    review:
      input
        .prediction
        .review,

    status:
      input
        .prediction
        .status,

    explanation: {
      publicSummary:
        input
          .explanation
          .publicSummary,

      publicReasons:
        input
          .explanation
          .publicReasons,

      vipSummary:
        input
          .explanation
          .vipSummary,

      vipReasons:
        input
          .explanation
          .vipReasons,
    },

    validation:
      input.validation,

    source:
      input.source,

    generatedAt,

    updatedAt:
      new Date()
        .toISOString(),
  };

  if (
    input.dataQuality
  ) {
    document.dataQuality =
      input.dataQuality;
  }

  if (
    input
      .generationDecision
  ) {
    document
      .generationDecision =
      input
        .generationDecision;
  }

  if (
    input
      .openAIEligibility
  ) {
    document
      .openAIEligibility =
      input
        .openAIEligibility;
  }

  return document;
}
