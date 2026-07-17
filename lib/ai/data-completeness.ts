import type {
  MatchIntelligenceResult,
} from "./intelligence";

export type DataCompletenessLevel =
  | "low"
  | "medium"
  | "good"
  | "excellent";

export type PredictionFactorKey =
  | "TEAM_IDENTITY"
  | "HOME_SEASON_DATA"
  | "AWAY_SEASON_DATA"
  | "HOME_RECENT_FORM"
  | "AWAY_RECENT_FORM"
  | "HOME_DATA_RELIABILITY"
  | "AWAY_DATA_RELIABILITY"
  | "MATCH_EVIDENCE_RELIABILITY"
  | "GOAL_EVIDENCE"
  | "DATA_FRESHNESS";

export type PredictionFactorSource =
  | "fixture"
  | "team-season-statistics"
  | "recent-fixtures"
  | "intelligence-engine"
  | "derived";

export type PredictionFactor = {
  key: PredictionFactorKey;
  score: number;
  weight: number;
  confidence: number;
  availability: boolean;
  reliability: number;
  freshness: number;
  source: PredictionFactorSource;
  reason: string;
};

export type DataCompletenessResult = {
  score: number;
  level: DataCompletenessLevel;
  vipReady: boolean;

  threshold: {
    vipMinimum: number;
    passed: boolean;
  };

  missingCritical: string[];
  missingOptional: string[];
  warnings: string[];

  factors: PredictionFactor[];

  summary: {
    availableFactors: number;
    totalFactors: number;
    weightedReliability: number;
    weightedFreshness: number;
  };
};

export type DataCompletenessInput = {
  match: unknown;
  intelligence: MatchIntelligenceResult;
  generatedAt?: string | Date;
};

type TeamLike = {
  id?: number;
  name?: string;
};

type RecentFixtureLike = {
  fixture?: {
    date?: string;
    timestamp?: number;
    status?: {
      short?: string;
    };
  };

  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type MatchLike = {
  fixture?: {
    date?: string;
    timestamp?: number;

    teams?: {
      home?: TeamLike;
      away?: TeamLike;
    };
  };

  recentFixtures?: {
    home?: RecentFixtureLike[];
    away?: RecentFixtureLike[];
  };

  teamSeasonStatistics?: {
    home?: unknown;
    away?: unknown;
  };
};

const VIP_MINIMUM_SCORE = 72;
const GOOD_RECENT_SAMPLE = 7;
const EXCELLENT_RECENT_SAMPLE = 10;

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}

function round(
  value: number,
  decimals = 1
): number {
  const multiplier =
    10 ** decimals;

  return Math.round(
    value * multiplier
  ) / multiplier;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asMatchLike(
  match: unknown
): MatchLike {
  return isRecord(match)
    ? match as MatchLike
    : {};
}

function hasTeamIdentity(
  team: TeamLike | undefined
): boolean {
  const validId =
    typeof team?.id === "number" &&
    Number.isFinite(team.id);

  const validName =
    typeof team?.name === "string" &&
    team.name.trim().length > 0;

  return validId || validName;
}

function completedFixture(
  fixture: RecentFixtureLike
): boolean {
  const status =
    String(
      fixture.fixture
        ?.status
        ?.short ??
      ""
    )
      .trim()
      .toUpperCase();

  const completedStatus =
    status === "FT" ||
    status === "AET" ||
    status === "PEN";

  return (
    completedStatus &&
    typeof fixture.goals?.home ===
      "number" &&
    typeof fixture.goals?.away ===
      "number"
  );
}

function fixtureTimestamp(
  fixture: RecentFixtureLike
): number {
  const direct =
    fixture.fixture
      ?.timestamp;

  if (
    typeof direct === "number" &&
    Number.isFinite(direct)
  ) {
    return direct * 1000;
  }

  const date =
    fixture.fixture?.date;

  if (
    typeof date !== "string"
  ) {
    return 0;
  }

  const parsed =
    Date.parse(date);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function countCompletedFixtures(
  fixtures: RecentFixtureLike[] | undefined
): number {
  if (!Array.isArray(fixtures)) {
    return 0;
  }

  return fixtures
    .filter(completedFixture)
    .length;
}

function latestCompletedFixtureTime(
  fixtures: RecentFixtureLike[] | undefined
): number {
  if (!Array.isArray(fixtures)) {
    return 0;
  }

  return fixtures
    .filter(completedFixture)
    .map(fixtureTimestamp)
    .filter(
      (value) =>
        value > 0
    )
    .reduce(
      (latest, value) =>
        Math.max(
          latest,
          value
        ),
      0
    );
}

function calculateFreshnessScore(
  latestTime: number,
  generatedAt: Date
): number {
  if (latestTime <= 0) {
    return 20;
  }

  const ageDays =
    Math.max(
      0,
      (
        generatedAt.getTime() -
        latestTime
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );

  if (ageDays <= 7) {
    return 100;
  }

  if (ageDays <= 14) {
    return 90;
  }

  if (ageDays <= 30) {
    return 75;
  }

  if (ageDays <= 60) {
    return 55;
  }

  if (ageDays <= 90) {
    return 35;
  }

  return 15;
}

function sampleScore(
  sampleSize: number
): number {
  if (
    sampleSize >=
    EXCELLENT_RECENT_SAMPLE
  ) {
    return 100;
  }

  if (
    sampleSize >=
    GOOD_RECENT_SAMPLE
  ) {
    return 85;
  }

  if (sampleSize >= 5) {
    return 70;
  }

  if (sampleSize >= 3) {
    return 50;
  }

  if (sampleSize >= 1) {
    return 30;
  }

  return 0;
}

function reliabilityScore(
  reliability: number
): number {
  return round(
    clamp(
      reliability,
      0,
      1
    ) * 100
  );
}

function addFactor(
  factors: PredictionFactor[],
  factor: PredictionFactor
): void {
  factors.push({
    ...factor,

    score:
      round(
        clamp(
          factor.score,
          0,
          100
        )
      ),

    confidence:
      round(
        clamp(
          factor.confidence,
          0,
          100
        )
      ),

    reliability:
      round(
        clamp(
          factor.reliability,
          0,
          100
        )
      ),

    freshness:
      round(
        clamp(
          factor.freshness,
          0,
          100
        )
      ),

    weight:
      round(
        Math.max(
          0,
          factor.weight
        ),
        2
      ),
  });
}

function weightedAverage(
  factors: PredictionFactor[],
  selector: (
    factor: PredictionFactor
  ) => number
): number {
  const totalWeight =
    factors.reduce(
      (sum, factor) =>
        sum + factor.weight,
      0
    );

  if (totalWeight <= 0) {
    return 0;
  }

  return round(
    factors.reduce(
      (sum, factor) =>
        sum +
        selector(factor) *
        factor.weight,
      0
    ) /
    totalWeight
  );
}

function determineLevel(
  score: number
): DataCompletenessLevel {
  if (score >= 88) {
    return "excellent";
  }

  if (score >= 72) {
    return "good";
  }

  if (score >= 50) {
    return "medium";
  }

  return "low";
}

export function calculateDataCompleteness(
  input: DataCompletenessInput
): DataCompletenessResult {
  const match =
    asMatchLike(
      input.match
    );

  const intelligence =
    input.intelligence;

  const generatedAt =
    input.generatedAt
      ? new Date(
          input.generatedAt
        )
      : new Date();

  const safeGeneratedAt =
    Number.isFinite(
      generatedAt.getTime()
    )
      ? generatedAt
      : new Date();

  const factors:
    PredictionFactor[] = [];

  const missingCritical:
    string[] = [];

  const missingOptional:
    string[] = [];

  const warnings:
    string[] = [];

  const homeTeam =
    match.fixture
      ?.teams
      ?.home;

  const awayTeam =
    match.fixture
      ?.teams
      ?.away;

  const homeIdentity =
    hasTeamIdentity(
      homeTeam
    );

  const awayIdentity =
    hasTeamIdentity(
      awayTeam
    );

  const identityAvailable =
    homeIdentity &&
    awayIdentity;

  addFactor(
    factors,
    {
      key:
        "TEAM_IDENTITY",

      score:
        identityAvailable
          ? 100
          : homeIdentity ||
            awayIdentity
          ? 50
          : 0,

      weight:
        1.15,

      confidence:
        identityAvailable
          ? 100
          : 35,

      availability:
        identityAvailable,

      reliability:
        identityAvailable
          ? 100
          : 25,

      freshness:
        100,

      source:
        "fixture",

      reason:
        identityAvailable
          ? "Both teams have usable fixture identity data."
          : "One or both teams are missing a usable ID or name.",
    }
  );

  if (!identityAvailable) {
    missingCritical.push(
      "Both team identities are required."
    );
  }

  const homeSeasonAvailable =
    Boolean(
      match
        .teamSeasonStatistics
        ?.home
    );

  const awaySeasonAvailable =
    Boolean(
      match
        .teamSeasonStatistics
        ?.away
    );

  addFactor(
    factors,
    {
      key:
        "HOME_SEASON_DATA",

      score:
        homeSeasonAvailable
          ? reliabilityScore(
              intelligence
                .home
                .dataReliability
            )
          : 0,

      weight:
        1.25,

      confidence:
        reliabilityScore(
          intelligence
            .home
            .dataReliability
        ),

      availability:
        homeSeasonAvailable,

      reliability:
        reliabilityScore(
          intelligence
            .home
            .dataReliability
        ),

      freshness:
        homeSeasonAvailable
          ? 85
          : 0,

      source:
        "team-season-statistics",

      reason:
        homeSeasonAvailable
          ? "Home season statistics are available."
          : "Home season statistics are missing.",
    }
  );

  addFactor(
    factors,
    {
      key:
        "AWAY_SEASON_DATA",

      score:
        awaySeasonAvailable
          ? reliabilityScore(
              intelligence
                .away
                .dataReliability
            )
          : 0,

      weight:
        1.25,

      confidence:
        reliabilityScore(
          intelligence
            .away
            .dataReliability
        ),

      availability:
        awaySeasonAvailable,

      reliability:
        reliabilityScore(
          intelligence
            .away
            .dataReliability
        ),

      freshness:
        awaySeasonAvailable
          ? 85
          : 0,

      source:
        "team-season-statistics",

      reason:
        awaySeasonAvailable
          ? "Away season statistics are available."
          : "Away season statistics are missing.",
    }
  );

  if (!homeSeasonAvailable) {
    missingCritical.push(
      "Home season statistics are missing."
    );
  }

  if (!awaySeasonAvailable) {
    missingCritical.push(
      "Away season statistics are missing."
    );
  }

  const homeRecentCount =
    countCompletedFixtures(
      match
        .recentFixtures
        ?.home
    );

  const awayRecentCount =
    countCompletedFixtures(
      match
        .recentFixtures
        ?.away
    );

  const homeRecentScore =
    sampleScore(
      homeRecentCount
    );

  const awayRecentScore =
    sampleScore(
      awayRecentCount
    );

  addFactor(
    factors,
    {
      key:
        "HOME_RECENT_FORM",

      score:
        homeRecentScore,

      weight:
        1.4,

      confidence:
        homeRecentScore,

      availability:
        homeRecentCount > 0,

      reliability:
        homeRecentScore,

      freshness:
        homeRecentCount > 0
          ? 100
          : 0,

      source:
        "recent-fixtures",

      reason:
        homeRecentCount > 0
          ? `Home recent-form sample contains ${homeRecentCount} completed matches.`
          : "No completed recent fixtures were found for the home team.",
    }
  );

  addFactor(
    factors,
    {
      key:
        "AWAY_RECENT_FORM",

      score:
        awayRecentScore,

      weight:
        1.4,

      confidence:
        awayRecentScore,

      availability:
        awayRecentCount > 0,

      reliability:
        awayRecentScore,

      freshness:
        awayRecentCount > 0
          ? 100
          : 0,

      source:
        "recent-fixtures",

      reason:
        awayRecentCount > 0
          ? `Away recent-form sample contains ${awayRecentCount} completed matches.`
          : "No completed recent fixtures were found for the away team.",
    }
  );

  if (homeRecentCount < 3) {
    missingCritical.push(
      "Home recent-form sample is below three completed matches."
    );
  } else if (
    homeRecentCount <
    GOOD_RECENT_SAMPLE
  ) {
    missingOptional.push(
      "Home recent-form sample is below the preferred seven matches."
    );
  }

  if (awayRecentCount < 3) {
    missingCritical.push(
      "Away recent-form sample is below three completed matches."
    );
  } else if (
    awayRecentCount <
    GOOD_RECENT_SAMPLE
  ) {
    missingOptional.push(
      "Away recent-form sample is below the preferred seven matches."
    );
  }

  const homeReliability =
    reliabilityScore(
      intelligence
        .home
        .dataReliability
    );

  const awayReliability =
    reliabilityScore(
      intelligence
        .away
        .dataReliability
    );

  const matchReliability =
    reliabilityScore(
      intelligence
        .evidenceReliability
    );

  addFactor(
    factors,
    {
      key:
        "HOME_DATA_RELIABILITY",

      score:
        homeReliability,

      weight:
        1.1,

      confidence:
        homeReliability,

      availability:
        homeReliability > 0,

      reliability:
        homeReliability,

      freshness:
        85,

      source:
        "intelligence-engine",

      reason:
        `Home evidence reliability is ${homeReliability}%.`,
    }
  );

  addFactor(
    factors,
    {
      key:
        "AWAY_DATA_RELIABILITY",

      score:
        awayReliability,

      weight:
        1.1,

      confidence:
        awayReliability,

      availability:
        awayReliability > 0,

      reliability:
        awayReliability,

      freshness:
        85,

      source:
        "intelligence-engine",

      reason:
        `Away evidence reliability is ${awayReliability}%.`,
    }
  );

  addFactor(
    factors,
    {
      key:
        "MATCH_EVIDENCE_RELIABILITY",

      score:
        matchReliability,

      weight:
        1.45,

      confidence:
        matchReliability,

      availability:
        matchReliability > 0,

      reliability:
        matchReliability,

      freshness:
        85,

      source:
        "intelligence-engine",

      reason:
        `Combined match evidence reliability is ${matchReliability}%.`,
    }
  );

  if (matchReliability < 45) {
    missingCritical.push(
      "Combined match evidence reliability is below 45%."
    );
  } else if (
    matchReliability < 60
  ) {
    warnings.push(
      "Combined evidence reliability is limited."
    );
  }

  const goalEvidenceValues = [
    intelligence
      .home
      .goalsForAverage,

    intelligence
      .home
      .goalsAgainstAverage,

    intelligence
      .away
      .goalsForAverage,

    intelligence
      .away
      .goalsAgainstAverage,

    intelligence
      .home
      .recentGoalsForAverage,

    intelligence
      .home
      .recentGoalsAgainstAverage,

    intelligence
      .away
      .recentGoalsForAverage,

    intelligence
      .away
      .recentGoalsAgainstAverage,
  ];

  const validGoalValues =
    goalEvidenceValues.filter(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );

  const goalEvidenceScore =
    round(
      validGoalValues.length /
      goalEvidenceValues.length *
      100
    );

  addFactor(
    factors,
    {
      key:
        "GOAL_EVIDENCE",

      score:
        goalEvidenceScore,

      weight:
        1.15,

      confidence:
        Math.min(
          goalEvidenceScore,
          matchReliability
        ),

      availability:
        validGoalValues.length >= 6,

      reliability:
        Math.min(
          goalEvidenceScore,
          matchReliability
        ),

      freshness:
        85,

      source:
        "derived",

      reason:
        `${validGoalValues.length} of ${goalEvidenceValues.length} required goal indicators are available.`,
    }
  );

  if (validGoalValues.length < 6) {
    missingCritical.push(
      "Goal evidence is incomplete."
    );
  }

  const latestHome =
    latestCompletedFixtureTime(
      match
        .recentFixtures
        ?.home
    );

  const latestAway =
    latestCompletedFixtureTime(
      match
        .recentFixtures
        ?.away
    );

  const homeFreshness =
    calculateFreshnessScore(
      latestHome,
      safeGeneratedAt
    );

  const awayFreshness =
    calculateFreshnessScore(
      latestAway,
      safeGeneratedAt
    );

  const freshness =
    Math.min(
      homeFreshness,
      awayFreshness
    );

  addFactor(
    factors,
    {
      key:
        "DATA_FRESHNESS",

      score:
        freshness,

      weight:
        1.15,

      confidence:
        freshness,

      availability:
        latestHome > 0 &&
        latestAway > 0,

      reliability:
        freshness,

      freshness,

      source:
        "recent-fixtures",

      reason:
        latestHome > 0 &&
        latestAway > 0
          ? `Recent fixture freshness is rated at ${freshness}%.`
          : "Recent-fixture dates are missing for one or both teams.",
    }
  );

  if (freshness < 35) {
    missingCritical.push(
      "Recent fixture data is stale or undated."
    );
  } else if (
    freshness < 60
  ) {
    warnings.push(
      "Recent fixture data may be stale."
    );
  }

  const score =
    weightedAverage(
      factors,
      (factor) =>
        factor.score
    );

  const weightedReliability =
    weightedAverage(
      factors,
      (factor) =>
        factor.reliability
    );

  const weightedFreshness =
    weightedAverage(
      factors,
      (factor) =>
        factor.freshness
    );

  const uniqueCritical =
    Array.from(
      new Set(
        missingCritical
      )
    );

  const uniqueOptional =
    Array.from(
      new Set(
        missingOptional
      )
    );

  const uniqueWarnings =
    Array.from(
      new Set(
        warnings
      )
    );

  const passedThreshold =
    score >=
    VIP_MINIMUM_SCORE;

  const vipReady =
    passedThreshold &&
    uniqueCritical.length === 0 &&
    matchReliability >= 60 &&
    freshness >= 60;

  if (
    passedThreshold &&
    !vipReady
  ) {
    uniqueWarnings.push(
      "The numeric completeness threshold passed, but one or more VIP safety requirements failed."
    );
  }

  return {
    score,
    level:
      determineLevel(
        score
      ),

    vipReady,

    threshold: {
      vipMinimum:
        VIP_MINIMUM_SCORE,

      passed:
        passedThreshold,
    },

    missingCritical:
      uniqueCritical,

    missingOptional:
      uniqueOptional,

    warnings:
      uniqueWarnings,

    factors,

    summary: {
      availableFactors:
        factors.filter(
          (factor) =>
            factor.availability
        ).length,

      totalFactors:
        factors.length,

      weightedReliability,
      weightedFreshness,
    },
  };
}
