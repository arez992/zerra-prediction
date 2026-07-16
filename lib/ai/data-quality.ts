import type {
  GenerationDecision,
  OpenAIAnalysisEligibility,
  PredictionDataQuality,
  PredictionEnrichmentLevel,
  PredictionEvidenceSource,
  PredictionReliability,
} from "./types-v3";

const DEFAULT_MINIMUM_COMPLETENESS = 55;
const DEFAULT_OPENAI_MINIMUM_COMPLETENESS = 70;

const OPENAI_DEFAULT_ESTIMATED_INPUT_TOKENS = 1_200;
const OPENAI_DEFAULT_ESTIMATED_OUTPUT_TOKENS = 500;

export type PredictionDataAvailability = {
  fixture: boolean;
  recentFormHome: boolean;
  recentFormAway: boolean;
  homeAwaySplits: boolean;
  teamStatisticsHome: boolean;
  teamStatisticsAway: boolean;
  headToHead: boolean;
  injuries: boolean;
  lineups: boolean;
  odds: boolean;
  historicalModelData: boolean;
};

export type PredictionDataFreshness = {
  fixtureFetchedAt?: string | null;
  recentFormFetchedAt?: string | null;
  statisticsFetchedAt?: string | null;
  headToHeadFetchedAt?: string | null;
  injuriesFetchedAt?: string | null;
  lineupsFetchedAt?: string | null;
  oddsFetchedAt?: string | null;
};

export type PredictionSampleSize = {
  home: number;
  away: number;
};

export type PredictionDataQualityInput = {
  availability: PredictionDataAvailability;
  freshness?: PredictionDataFreshness;
  sampleSize?: Partial<PredictionSampleSize>;

  generatedFromFallback?: boolean;
  warnings?: string[];

  minimumCompletenessRequired?: number;
  openAIMinimumCompletenessRequired?: number;

  dailyAIBudgetRemaining?: boolean;
  cachedOpenAIResultAvailable?: boolean;
  inputFingerprint?: string;

  estimatedOpenAIInputTokens?: number | null;
  estimatedOpenAIOutputTokens?: number | null;

  now?: Date;
};

export type PredictionDataQualityResult = {
  dataQuality: PredictionDataQuality;
  generationDecision: GenerationDecision;
  openAIEligibility: OpenAIAnalysisEligibility;
};

type WeightedAvailabilityKey =
  keyof PredictionDataAvailability;

type WeightedSourceConfig = {
  key: WeightedAvailabilityKey;
  weight: number;
  source: PredictionEvidenceSource;
  requiredForGeneration: boolean;
};

const SOURCE_CONFIGURATION: WeightedSourceConfig[] = [
  {
    key: "fixture",
    weight: 10,
    source: "api-football-fixture",
    requiredForGeneration: true,
  },
  {
    key: "recentFormHome",
    weight: 14,
    source: "api-football-recent-fixtures",
    requiredForGeneration: true,
  },
  {
    key: "recentFormAway",
    weight: 14,
    source: "api-football-recent-fixtures",
    requiredForGeneration: true,
  },
  {
    key: "homeAwaySplits",
    weight: 10,
    source: "calculated",
    requiredForGeneration: false,
  },
  {
    key: "teamStatisticsHome",
    weight: 12,
    source: "api-football-team-statistics",
    requiredForGeneration: false,
  },
  {
    key: "teamStatisticsAway",
    weight: 12,
    source: "api-football-team-statistics",
    requiredForGeneration: false,
  },
  {
    key: "headToHead",
    weight: 6,
    source: "api-football-head-to-head",
    requiredForGeneration: false,
  },
  {
    key: "injuries",
    weight: 7,
    source: "api-football-injuries",
    requiredForGeneration: false,
  },
  {
    key: "lineups",
    weight: 5,
    source: "api-football-lineups",
    requiredForGeneration: false,
  },
  {
    key: "odds",
    weight: 4,
    source: "api-football-odds",
    requiredForGeneration: false,
  },
  {
    key: "historicalModelData",
    weight: 6,
    source: "firestore-history",
    requiredForGeneration: false,
  },
];

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function safeSampleSize(
  value: unknown
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function parseDate(
  value: string | null | undefined
): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function getAgeInHours(
  value: string | null | undefined,
  now: Date
): number | null {
  const parsed = parseDate(value);

  if (!parsed) {
    return null;
  }

  const ageMilliseconds =
    now.getTime() - parsed.getTime();

  return Math.max(
    0,
    ageMilliseconds / (1000 * 60 * 60)
  );
}

function calculateFreshnessScore(
  freshness: PredictionDataFreshness,
  now: Date
): {
  score: number;
  warnings: string[];
  lastUpdatedAt: string | null;
} {
  const entries: Array<{
    name: string;
    value: string | null | undefined;
    idealAgeHours: number;
    maximumAgeHours: number;
  }> = [
    {
      name: "Fixture data",
      value: freshness.fixtureFetchedAt,
      idealAgeHours: 6,
      maximumAgeHours: 24,
    },
    {
      name: "Recent form",
      value: freshness.recentFormFetchedAt,
      idealAgeHours: 24,
      maximumAgeHours: 72,
    },
    {
      name: "Team statistics",
      value: freshness.statisticsFetchedAt,
      idealAgeHours: 24,
      maximumAgeHours: 96,
    },
    {
      name: "Head-to-head",
      value: freshness.headToHeadFetchedAt,
      idealAgeHours: 168,
      maximumAgeHours: 720,
    },
    {
      name: "Injuries",
      value: freshness.injuriesFetchedAt,
      idealAgeHours: 12,
      maximumAgeHours: 48,
    },
    {
      name: "Lineups",
      value: freshness.lineupsFetchedAt,
      idealAgeHours: 2,
      maximumAgeHours: 8,
    },
    {
      name: "Odds",
      value: freshness.oddsFetchedAt,
      idealAgeHours: 2,
      maximumAgeHours: 12,
    },
  ];

  const availableEntries = entries
    .map((entry) => {
      const ageHours = getAgeInHours(
        entry.value,
        now
      );

      return {
        ...entry,
        ageHours,
      };
    })
    .filter(
      (
        entry
      ): entry is typeof entry & {
        ageHours: number;
      } => entry.ageHours !== null
    );

  if (availableEntries.length === 0) {
    return {
      score: 0,
      warnings: [
        "No valid data freshness timestamps were provided.",
      ],
      lastUpdatedAt: null,
    };
  }

  const warnings: string[] = [];

  const scores = availableEntries.map(
    (entry) => {
      if (
        entry.ageHours <=
        entry.idealAgeHours
      ) {
        return 100;
      }

      if (
        entry.ageHours >=
        entry.maximumAgeHours
      ) {
        warnings.push(
          `${entry.name} may be stale.`
        );

        return 20;
      }

      const ageRange =
        entry.maximumAgeHours -
        entry.idealAgeHours;

      const ageBeyondIdeal =
        entry.ageHours -
        entry.idealAgeHours;

      const proportionalPenalty =
        (ageBeyondIdeal / ageRange) * 80;

      return clamp(
        Math.round(
          100 - proportionalPenalty
        ),
        20,
        100
      );
    }
  );

  const score = Math.round(
    scores.reduce(
      (total, current) =>
        total + current,
      0
    ) / scores.length
  );

  const validDates = availableEntries
    .map((entry) => parseDate(entry.value))
    .filter(
      (date): date is Date =>
        date !== null
    )
    .sort(
      (a, b) =>
        b.getTime() - a.getTime()
    );

  return {
    score,
    warnings,
    lastUpdatedAt:
      validDates[0]?.toISOString() ??
      null,
  };
}

function calculateCompleteness(
  availability: PredictionDataAvailability
): {
  completeness: number;
  sourcesUsed: PredictionEvidenceSource[];
  missingSources: PredictionEvidenceSource[];
  missingRequiredKeys: WeightedAvailabilityKey[];
} {
  let achievedWeight = 0;
  let totalWeight = 0;

  const sourcesUsed: PredictionEvidenceSource[] =
    [];

  const missingSources: PredictionEvidenceSource[] =
    [];

  const missingRequiredKeys: WeightedAvailabilityKey[] =
    [];

  for (const config of SOURCE_CONFIGURATION) {
    totalWeight += config.weight;

    if (availability[config.key]) {
      achievedWeight += config.weight;
      sourcesUsed.push(config.source);
    } else {
      missingSources.push(config.source);

      if (config.requiredForGeneration) {
        missingRequiredKeys.push(
          config.key
        );
      }
    }
  }

  const completeness =
    totalWeight > 0
      ? Math.round(
          (achievedWeight / totalWeight) *
            100
        )
      : 0;

  return {
    completeness: clamp(
      completeness,
      0,
      100
    ),
    sourcesUsed: unique(sourcesUsed),
    missingSources:
      unique(missingSources),
    missingRequiredKeys,
  };
}

function determineReliability(
  completeness: number,
  freshness: number,
  generatedFromFallback: boolean,
  homeSampleSize: number,
  awaySampleSize: number
): PredictionReliability {
  if (
    completeness < 40 ||
    generatedFromFallback
  ) {
    return "unavailable";
  }

  const minimumSampleSize = Math.min(
    homeSampleSize,
    awaySampleSize
  );

  const combinedScore = Math.round(
    completeness * 0.7 +
      freshness * 0.3
  );

  if (
    combinedScore >= 80 &&
    minimumSampleSize >= 5
  ) {
    return "high";
  }

  if (
    combinedScore >= 60 &&
    minimumSampleSize >= 3
  ) {
    return "medium";
  }

  return "low";
}

function determineEnrichmentLevel(
  availability: PredictionDataAvailability,
  completeness: number
): PredictionEnrichmentLevel {
  const hasCoreEnrichment =
    availability.recentFormHome &&
    availability.recentFormAway &&
    availability.teamStatisticsHome &&
    availability.teamStatisticsAway;

  const hasAdvancedEnrichment =
    hasCoreEnrichment &&
    availability.headToHead &&
    availability.injuries;

  const hasFullEnrichment =
    hasAdvancedEnrichment &&
    availability.lineups &&
    availability.odds &&
    availability.historicalModelData;

  if (
    hasFullEnrichment &&
    completeness >= 90
  ) {
    return "full";
  }

  if (
    hasAdvancedEnrichment &&
    completeness >= 70
  ) {
    return "enriched";
  }

  if (
    hasCoreEnrichment ||
    completeness >= 50
  ) {
    return "partial";
  }

  return "basic";
}

function buildWarnings(
  input: PredictionDataQualityInput,
  missingRequiredKeys: WeightedAvailabilityKey[],
  homeSampleSize: number,
  awaySampleSize: number,
  freshnessWarnings: string[]
): string[] {
  const warnings = [
    ...(input.warnings ?? []),
    ...freshnessWarnings,
  ];

  if (missingRequiredKeys.includes("fixture")) {
    warnings.push(
      "Fixture data is missing."
    );
  }

  if (
    missingRequiredKeys.includes(
      "recentFormHome"
    )
  ) {
    warnings.push(
      "Recent home-team form data is missing."
    );
  }

  if (
    missingRequiredKeys.includes(
      "recentFormAway"
    )
  ) {
    warnings.push(
      "Recent away-team form data is missing."
    );
  }

  if (
    !input.availability
      .teamStatisticsHome ||
    !input.availability
      .teamStatisticsAway
  ) {
    warnings.push(
      "Complete team statistics are not available for both teams."
    );
  }

  if (
    !input.availability
      .homeAwaySplits
  ) {
    warnings.push(
      "Home and away split data is unavailable."
    );
  }

  if (
    homeSampleSize < 3 ||
    awaySampleSize < 3
  ) {
    warnings.push(
      "The recent-form sample size is too small for a reliable prediction."
    );
  } else if (
    homeSampleSize < 5 ||
    awaySampleSize < 5
  ) {
    warnings.push(
      "The recent-form sample size is limited."
    );
  }

  if (input.generatedFromFallback) {
    warnings.push(
      "Fallback values were detected. Premium prediction generation must be withheld."
    );
  }

  return unique(warnings);
}

function buildGenerationDecision(params: {
  completeness: number;
  reliability: PredictionReliability;
  generatedFromFallback: boolean;
  fixtureAvailable: boolean;
  recentFormAvailable: boolean;
  minimumCompletenessRequired: number;
  warnings: string[];
}): GenerationDecision {
  const {
    completeness,
    reliability,
    generatedFromFallback,
    fixtureAvailable,
    recentFormAvailable,
    minimumCompletenessRequired,
    warnings,
  } = params;

  if (!fixtureAvailable) {
    return {
      status: "insufficient-data",
      allowed: false,
      reason:
        "Prediction generation was blocked because fixture data is missing.",
      minimumCompletenessRequired,
      actualCompleteness: completeness,
      warnings,
    };
  }

  if (generatedFromFallback) {
    return {
      status: "withheld",
      allowed: false,
      reason:
        "Prediction generation was withheld because fallback values were detected.",
      minimumCompletenessRequired,
      actualCompleteness: completeness,
      warnings,
    };
  }

  if (!recentFormAvailable) {
    return {
      status: "insufficient-data",
      allowed: false,
      reason:
        "Prediction generation was blocked because recent form data is incomplete.",
      minimumCompletenessRequired,
      actualCompleteness: completeness,
      warnings,
    };
  }

  if (
    completeness <
    minimumCompletenessRequired
  ) {
    return {
      status: "insufficient-data",
      allowed: false,
      reason:
        `Prediction generation requires at least ${minimumCompletenessRequired}% data completeness.`,
      minimumCompletenessRequired,
      actualCompleteness: completeness,
      warnings,
    };
  }

  if (
    reliability === "unavailable"
  ) {
    return {
      status: "withheld",
      allowed: false,
      reason:
        "Prediction generation was withheld because data reliability is unavailable.",
      minimumCompletenessRequired,
      actualCompleteness: completeness,
      warnings,
    };
  }

  return {
    status: "allowed",
    allowed: true,
    reason: null,
    minimumCompletenessRequired,
    actualCompleteness: completeness,
    warnings,
  };
}

function buildOpenAIEligibility(params: {
  generationDecision: GenerationDecision;
  completeness: number;
  openAIMinimumCompletenessRequired: number;
  reliability: PredictionReliability;
  generatedFromFallback: boolean;
  dailyAIBudgetRemaining: boolean;
  cachedOpenAIResultAvailable: boolean;
  inputFingerprint: string;
  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;
}): OpenAIAnalysisEligibility {
  const {
    generationDecision,
    completeness,
    openAIMinimumCompletenessRequired,
    reliability,
    generatedFromFallback,
    dailyAIBudgetRemaining,
    cachedOpenAIResultAvailable,
    inputFingerprint,
    estimatedInputTokens,
    estimatedOutputTokens,
  } = params;

  if (cachedOpenAIResultAvailable) {
    return {
      allowed: false,
      reason:
        "A cached OpenAI analysis is already available for this input fingerprint.",
      inputFingerprint,
      cachedResultAvailable: true,
      estimatedInputTokens,
      estimatedOutputTokens,
      dailyBudgetRemaining:
        dailyAIBudgetRemaining,
    };
  }

  if (!generationDecision.allowed) {
    return {
      allowed: false,
      reason:
        "OpenAI analysis is blocked because statistical prediction generation is not allowed.",
      inputFingerprint,
      cachedResultAvailable: false,
      estimatedInputTokens,
      estimatedOutputTokens,
      dailyBudgetRemaining:
        dailyAIBudgetRemaining,
    };
  }

  if (generatedFromFallback) {
    return {
      allowed: false,
      reason:
        "OpenAI analysis is blocked because fallback data was detected.",
      inputFingerprint,
      cachedResultAvailable: false,
      estimatedInputTokens,
      estimatedOutputTokens,
      dailyBudgetRemaining:
        dailyAIBudgetRemaining,
    };
  }

  if (
    completeness <
    openAIMinimumCompletenessRequired
  ) {
    return {
      allowed: false,
      reason:
        `OpenAI analysis requires at least ${openAIMinimumCompletenessRequired}% data completeness.`,
      inputFingerprint,
      cachedResultAvailable: false,
      estimatedInputTokens,
      estimatedOutputTokens,
      dailyBudgetRemaining:
        dailyAIBudgetRemaining,
    };
  }

  if (
    reliability !== "high" &&
    reliability !== "medium"
  ) {
    return {
      allowed: false,
      reason:
        "OpenAI analysis requires medium or high data reliability.",
      inputFingerprint,
      cachedResultAvailable: false,
      estimatedInputTokens,
      estimatedOutputTokens,
      dailyBudgetRemaining:
        dailyAIBudgetRemaining,
    };
  }

  if (!dailyAIBudgetRemaining) {
    return {
      allowed: false,
      reason:
        "OpenAI analysis is blocked because the daily AI budget is exhausted.",
      inputFingerprint,
      cachedResultAvailable: false,
      estimatedInputTokens,
      estimatedOutputTokens,
      dailyBudgetRemaining: false,
    };
  }

  if (!inputFingerprint.trim()) {
    return {
      allowed: false,
      reason:
        "OpenAI analysis is blocked because the input fingerprint is missing.",
      inputFingerprint,
      cachedResultAvailable: false,
      estimatedInputTokens,
      estimatedOutputTokens,
      dailyBudgetRemaining:
        dailyAIBudgetRemaining,
    };
  }

  return {
    allowed: true,
    reason: null,
    inputFingerprint,
    cachedResultAvailable: false,
    estimatedInputTokens,
    estimatedOutputTokens,
    dailyBudgetRemaining:
      dailyAIBudgetRemaining,
  };
}

export function evaluatePredictionDataQuality(
  input: PredictionDataQualityInput
): PredictionDataQualityResult {
  const now = input.now ?? new Date();

  const minimumCompletenessRequired =
    clamp(
      input.minimumCompletenessRequired ??
        DEFAULT_MINIMUM_COMPLETENESS,
      0,
      100
    );

  const openAIMinimumCompletenessRequired =
    clamp(
      input
        .openAIMinimumCompletenessRequired ??
        DEFAULT_OPENAI_MINIMUM_COMPLETENESS,
      0,
      100
    );

  const homeSampleSize = safeSampleSize(
    input.sampleSize?.home
  );

  const awaySampleSize = safeSampleSize(
    input.sampleSize?.away
  );

  const completenessResult =
    calculateCompleteness(
      input.availability
    );

  const freshnessResult =
    calculateFreshnessScore(
      input.freshness ?? {},
      now
    );

  const generatedFromFallback =
    input.generatedFromFallback === true;

  const reliability =
    determineReliability(
      completenessResult.completeness,
      freshnessResult.score,
      generatedFromFallback,
      homeSampleSize,
      awaySampleSize
    );

  const enrichmentLevel =
    determineEnrichmentLevel(
      input.availability,
      completenessResult.completeness
    );

  const warnings = buildWarnings(
    input,
    completenessResult.missingRequiredKeys,
    homeSampleSize,
    awaySampleSize,
    freshnessResult.warnings
  );

  const dataQuality: PredictionDataQuality =
    {
      completeness:
        completenessResult.completeness,
      freshness: freshnessResult.score,
      reliability,
      enrichmentLevel,

      sourcesUsed:
        completenessResult.sourcesUsed,
      missingSources:
        completenessResult.missingSources,
      warnings,

      generatedFromFallback,
      sampleSize: {
        home: homeSampleSize,
        away: awaySampleSize,
      },

      lastUpdatedAt:
        freshnessResult.lastUpdatedAt,
    };

  const recentFormAvailable =
    input.availability.recentFormHome &&
    input.availability.recentFormAway;

  const generationDecision =
    buildGenerationDecision({
      completeness:
        dataQuality.completeness,
      reliability:
        dataQuality.reliability,
      generatedFromFallback:
        dataQuality.generatedFromFallback,
      fixtureAvailable:
        input.availability.fixture,
      recentFormAvailable,
      minimumCompletenessRequired,
      warnings,
    });

  const openAIEligibility =
    buildOpenAIEligibility({
      generationDecision,
      completeness:
        dataQuality.completeness,
      openAIMinimumCompletenessRequired,
      reliability:
        dataQuality.reliability,
      generatedFromFallback:
        dataQuality.generatedFromFallback,
      dailyAIBudgetRemaining:
        input.dailyAIBudgetRemaining ??
        true,
      cachedOpenAIResultAvailable:
        input.cachedOpenAIResultAvailable ??
        false,
      inputFingerprint:
        input.inputFingerprint ?? "",
      estimatedInputTokens:
        input.estimatedOpenAIInputTokens ===
        undefined
          ? OPENAI_DEFAULT_ESTIMATED_INPUT_TOKENS
          : input.estimatedOpenAIInputTokens,
      estimatedOutputTokens:
        input.estimatedOpenAIOutputTokens ===
        undefined
          ? OPENAI_DEFAULT_ESTIMATED_OUTPUT_TOKENS
          : input.estimatedOpenAIOutputTokens,
    });

  return {
    dataQuality,
    generationDecision,
    openAIEligibility,
  };
}