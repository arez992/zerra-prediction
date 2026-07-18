import type {
  MatchIntelligenceResult,
} from "./intelligence";

import type {
  DataCompletenessResult,
} from "./data-completeness";

import type {
  GoalsResult,
} from "./goals";

export type PerformanceFactorKey =
  | "RECENT_FORM"
  | "ATTACK_STRENGTH"
  | "DEFENSE_STRENGTH"
  | "HOME_AWAY_STRENGTH"
  | "GOAL_SIGNAL"
  | "HEAD_TO_HEAD"
  | "INJURIES"
  | "LINEUPS"
  | "FATIGUE"
  | "COMPETITION_CONTEXT"
  | "DATA_QUALITY"
  | "MODEL_UNCERTAINTY";

export type PerformanceFactorSource =
  | "intelligence-engine"
  | "goal-model"
  | "recent-fixtures"
  | "team-season-statistics"
  | "head-to-head"
  | "injuries"
  | "lineups"
  | "fixture"
  | "data-completeness"
  | "derived";

export type PerformanceFactor = {
  key: PerformanceFactorKey;

  /*
   * Directional score:
   *
   * 0   = strong away advantage
   * 50  = neutral
   * 100 = strong home advantage
   */
  score: number;

  /*
   * Relative importance before
   * availability normalization.
   */
  weight: number;

  /*
   * Confidence in this factor's signal.
   */
  confidence: number;

  /*
   * Reliability of the source data.
   */
  reliability: number;

  /*
   * Whether this factor has enough
   * real evidence to participate.
   */
  availability: boolean;

  reason: string;
  source: PerformanceFactorSource;
};

export type PerformanceFactorSummary = {
  factors: PerformanceFactor[];

  availableFactors: number;
  totalFactors: number;

  /*
   * Final home-vs-away directional score.
   *
   * 50 = balanced
   * >50 = home advantage
   * <50 = away advantage
   */
  weightedScore: number;

  weightedConfidence: number;
  weightedReliability: number;

  uncertainty: number;
};

export type BuildPerformanceFactorsInput = {
  match: unknown;

  intelligence:
    MatchIntelligenceResult;

  goals:
    GoalsResult;

  dataCompleteness:
    DataCompletenessResult;
};

type RecentFixtureLike = {
  fixture?: {
    date?: string;
    timestamp?: number;

    status?: {
      short?: string;
    };
  };

  teams?: {
    home?: {
      id?: number;
    };

    away?: {
      id?: number;
    };
  };

  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type MatchLike = {
  fixture?: {
    fixture?: {
      date?: string;
      timestamp?: number;
    };

    league?: {
      id?: number;
      name?: string;
      country?: string;
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

  recentFixtures?: {
    home?: RecentFixtureLike[];
    away?: RecentFixtureLike[];
  };

  headToHead?: unknown[];
  injuries?: unknown[];
  lineups?: unknown[];

  teamSeasonStatistics?: {
    home?: unknown;
    away?: unknown;
  };
};

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

  return (
    Math.round(
      value *
      multiplier
    ) /
    multiplier
  );
}

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

function asMatchLike(
  match: unknown
): MatchLike {
  return isRecord(match)
    ? match as MatchLike
    : {};
}

function safeArray(
  value: unknown
): unknown[] {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function normalizeDirectionalScore(
  homeValue: number,
  awayValue: number
): number {
  const safeHome =
    Math.max(
      0,
      homeValue
    );

  const safeAway =
    Math.max(
      0,
      awayValue
    );

  const total =
    safeHome +
    safeAway;

  if (
    total <= 0
  ) {
    return 50;
  }

  return clamp(
    round(
      (
        safeHome /
        total
      ) *
      100
    ),
    0,
    100
  );
}

function addFactor(
  factors:
    PerformanceFactor[],
  factor:
    PerformanceFactor
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

    weight:
      round(
        Math.max(
          0,
          factor.weight
        ),
        2
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
  });
}

function weightedAverage(
  factors:
    PerformanceFactor[],
  selector: (
    factor:
      PerformanceFactor
  ) => number
): number {
  const available =
    factors.filter(
      (
        factor
      ) =>
        factor
          .availability &&
        factor.weight > 0
    );

  const totalWeight =
    available.reduce(
      (
        sum,
        factor
      ) =>
        sum +
        factor.weight,
      0
    );

  if (
    totalWeight <= 0
  ) {
    return 0;
  }

  return round(
    available.reduce(
      (
        sum,
        factor
      ) =>
        sum +
        selector(
          factor
        ) *
        factor.weight,
      0
    ) /
    totalWeight
  );
}

function completedFixtureCount(
  fixtures:
    RecentFixtureLike[]
    | undefined
): number {
  if (
    !Array.isArray(
      fixtures
    )
  ) {
    return 0;
  }

  return fixtures.filter(
    (
      fixture
    ) => {
      const status =
        String(
          fixture
            .fixture
            ?.status
            ?.short ||
          ""
        )
          .trim()
          .toUpperCase();

      return (
        status === "FT" ||
        status === "AET" ||
        status === "PEN"
      );
    }
  ).length;
}

function buildRecentFormFactor(
  intelligence:
    MatchIntelligenceResult,
  match:
    MatchLike
): PerformanceFactor {
  const homeCount =
    completedFixtureCount(
      match
        .recentFixtures
        ?.home
    );

  const awayCount =
    completedFixtureCount(
      match
        .recentFixtures
        ?.away
    );

  const sampleSize =
    Math.min(
      homeCount,
      awayCount
    );

  const availability =
    sampleSize >= 3;

  const reliability =
    clamp(
      (
        sampleSize /
        8
      ) *
      100,
      30,
      100
    );

  return {
    key:
      "RECENT_FORM",

    score:
      normalizeDirectionalScore(
        intelligence
          .home
          .formRating,
        intelligence
          .away
          .formRating
      ),

    weight:
      1.5,

    confidence:
      availability
        ? reliability
        : 25,

    reliability:
      availability
        ? reliability
        : 20,

    availability,

    source:
      "recent-fixtures",

    reason:
      availability
        ? `Recent-form comparison uses ${sampleSize} or more completed matches per team.`
        : "Recent-form sample is too small for full factor weighting.",
  };
}

function buildAttackFactor(
  intelligence:
    MatchIntelligenceResult
): PerformanceFactor {
  const reliability =
    clamp(
      intelligence
        .evidenceReliability *
      100,
      0,
      100
    );

  return {
    key:
      "ATTACK_STRENGTH",

    score:
      normalizeDirectionalScore(
        intelligence
          .home
          .attackRating,
        intelligence
          .away
          .attackRating
      ),

    weight:
      1.45,

    confidence:
      reliability,

    reliability,

    availability:
      reliability > 0,

    source:
      "intelligence-engine",

    reason:
      `Home attack rating is ${intelligence.home.attackRating} and away attack rating is ${intelligence.away.attackRating}.`,
  };
}

function buildDefenseFactor(
  intelligence:
    MatchIntelligenceResult
): PerformanceFactor {
  const reliability =
    clamp(
      intelligence
        .evidenceReliability *
      100,
      0,
      100
    );

  /*
   * A higher defense rating is better.
   */
  return {
    key:
      "DEFENSE_STRENGTH",

    score:
      normalizeDirectionalScore(
        intelligence
          .home
          .defenseRating,
        intelligence
          .away
          .defenseRating
      ),

    weight:
      1.35,

    confidence:
      reliability,

    reliability,

    availability:
      reliability > 0,

    source:
      "intelligence-engine",

    reason:
      `Home defense rating is ${intelligence.home.defenseRating} and away defense rating is ${intelligence.away.defenseRating}.`,
  };
}

function buildVenueFactor(
  intelligence:
    MatchIntelligenceResult
): PerformanceFactor {
  const reliability =
    clamp(
      intelligence
        .evidenceReliability *
      100,
      0,
      100
    );

  return {
    key:
      "HOME_AWAY_STRENGTH",

    score:
      normalizeDirectionalScore(
        intelligence
          .home
          .venueRating,
        intelligence
          .away
          .venueRating
      ),

    weight:
      1.25,

    confidence:
      reliability,

    reliability,

    availability:
      reliability > 0,

    source:
      "team-season-statistics",

    reason:
      `Venue-adjusted ratings are ${intelligence.home.venueRating} for the home team and ${intelligence.away.venueRating} for the away team.`,
  };
}

function buildGoalFactor(
  goals:
    GoalsResult,
  dataCompleteness:
    DataCompletenessResult
): PerformanceFactor {
  const totalExpectedGoals =
    goals.homeExpectedGoals +
    goals.awayExpectedGoals;

  const availability =
    totalExpectedGoals > 0;

  const directionalScore =
    normalizeDirectionalScore(
      goals.homeExpectedGoals,
      goals.awayExpectedGoals
    );

  const reliability =
    clamp(
      dataCompleteness
        .summary
        .weightedReliability,
      0,
      100
    );

  return {
    key:
      "GOAL_SIGNAL",

    score:
      directionalScore,

    weight:
      1.55,

    confidence:
      reliability,

    reliability,

    availability,

    source:
      "goal-model",

    reason:
      `Expected goals are ${goals.homeExpectedGoals} for the home team and ${goals.awayExpectedGoals} for the away team.`,
  };
}

function buildHeadToHeadFactor(
  match:
    MatchLike
): PerformanceFactor {
  const matches =
    safeArray(
      match.headToHead
    );

  const availability =
    matches.length >= 3;

  return {
    key:
      "HEAD_TO_HEAD",

    score:
      50,

    weight:
      0.55,

    confidence:
      availability
        ? Math.min(
            80,
            matches.length *
              10
          )
        : 0,

    reliability:
      availability
        ? 60
        : 0,

    availability,

    source:
      "head-to-head",

    reason:
      availability
        ? `${matches.length} head-to-head records are available. The factor is kept low-weight to avoid historical overfitting.`
        : "Head-to-head data is unavailable or insufficient.",
  };
}

function buildInjuryFactor(
  match:
    MatchLike
): PerformanceFactor {
  const injuries =
    safeArray(
      match.injuries
    );

  const availability =
    injuries.length > 0;

  /*
   * Current pipeline does not yet
   * classify injury impact by team
   * and player importance.
   *
   * Until that exists, the factor
   * must remain neutral rather than
   * inventing an advantage.
   */
  return {
    key:
      "INJURIES",

    score:
      50,

    weight:
      0.8,

    confidence:
      availability
        ? 40
        : 0,

    reliability:
      availability
        ? 40
        : 0,

    availability,

    source:
      "injuries",

    reason:
      availability
        ? "Injury data exists, but player-impact weighting is not yet available, so the factor remains neutral."
        : "No usable injury evidence is available.",
  };
}

function buildLineupFactor(
  match:
    MatchLike
): PerformanceFactor {
  const lineups =
    safeArray(
      match.lineups
    );

  const availability =
    lineups.length > 0;

  return {
    key:
      "LINEUPS",

    score:
      50,

    weight:
      0.85,

    confidence:
      availability
        ? 45
        : 0,

    reliability:
      availability
        ? 45
        : 0,

    availability,

    source:
      "lineups",

    reason:
      availability
        ? "Lineup data is available, but player-strength comparison is not yet integrated, so the factor remains neutral."
        : "Confirmed lineup evidence is unavailable.",
  };
}

function buildFatigueFactor(
  match:
    MatchLike
): PerformanceFactor {
  const homeRecent =
    match
      .recentFixtures
      ?.home;

  const awayRecent =
    match
      .recentFixtures
      ?.away;

  const availability =
    Array.isArray(
      homeRecent
    ) &&
    Array.isArray(
      awayRecent
    ) &&
    homeRecent.length > 0 &&
    awayRecent.length > 0;

  /*
   * Fatigue scoring will later use
   * rest days and fixture density.
   *
   * For now we expose availability
   * without creating a fake advantage.
   */
  return {
    key:
      "FATIGUE",

    score:
      50,

    weight:
      0.65,

    confidence:
      availability
        ? 35
        : 0,

    reliability:
      availability
        ? 35
        : 0,

    availability,

    source:
      "recent-fixtures",

    reason:
      availability
        ? "Recent fixtures exist, but full rest-day and fixture-density weighting is not yet active."
        : "Recent fixture evidence is insufficient for fatigue analysis.",
  };
}

function buildCompetitionContextFactor(
  match:
    MatchLike
): PerformanceFactor {
  const league =
    match
      .fixture
      ?.league;

  const availability =
    Boolean(
      league?.id ||
      league?.name
    );

  return {
    key:
      "COMPETITION_CONTEXT",

    score:
      50,

    weight:
      0.45,

    confidence:
      availability
        ? 30
        : 0,

    reliability:
      availability
        ? 50
        : 0,

    availability,

    source:
      "fixture",

    reason:
      availability
        ? `Competition context is available for ${league?.name || "the current competition"}, but competition-strength adjustments are not yet active.`
        : "Competition context is unavailable.",
  };
}

function buildDataQualityFactor(
  dataCompleteness:
    DataCompletenessResult
): PerformanceFactor {
  const availability =
    dataCompleteness
      .score > 0;

  return {
    key:
      "DATA_QUALITY",

    /*
     * Data quality is not a home/away
     * directional factor.
     *
     * Keep it neutral and use it through
     * confidence/reliability instead.
     */
    score:
      50,

    weight:
      0.5,

    confidence:
      dataCompleteness
        .score,

    reliability:
      dataCompleteness
        .summary
        .weightedReliability,

    availability,

    source:
      "data-completeness",

    reason:
      `Data completeness is ${dataCompleteness.score}/100 with weighted reliability of ${dataCompleteness.summary.weightedReliability}%.`,
  };
}

function buildUncertaintyFactor(
  intelligence:
    MatchIntelligenceResult,
  dataCompleteness:
    DataCompletenessResult
): PerformanceFactor {
  const evidenceReliability =
    clamp(
      intelligence
        .evidenceReliability *
      100,
      0,
      100
    );

  const uncertainty =
    clamp(
      100 -
      (
        evidenceReliability *
          0.55 +
        dataCompleteness
          .score *
          0.25 +
        dataCompleteness
          .summary
          .weightedFreshness *
          0.2
      ),
      0,
      100
    );

  return {
    key:
      "MODEL_UNCERTAINTY",

    /*
     * Uncertainty is neutral
     * directionally.
     */
    score:
      50,

    weight:
      0.6,

    confidence:
      100 -
      uncertainty,

    reliability:
      100 -
      uncertainty,

    availability:
      true,

    source:
      "derived",

    reason:
      `Estimated model uncertainty is ${round(
        uncertainty
      )}%.`,
  };
}

export function buildPerformanceFactors(
  input:
    BuildPerformanceFactorsInput
): PerformanceFactorSummary {
  const match =
    asMatchLike(
      input.match
    );

  const factors:
    PerformanceFactor[] = [];

  addFactor(
    factors,
    buildRecentFormFactor(
      input.intelligence,
      match
    )
  );

  addFactor(
    factors,
    buildAttackFactor(
      input.intelligence
    )
  );

  addFactor(
    factors,
    buildDefenseFactor(
      input.intelligence
    )
  );

  addFactor(
    factors,
    buildVenueFactor(
      input.intelligence
    )
  );

  addFactor(
    factors,
    buildGoalFactor(
      input.goals,
      input.dataCompleteness
    )
  );

  addFactor(
    factors,
    buildHeadToHeadFactor(
      match
    )
  );

  addFactor(
    factors,
    buildInjuryFactor(
      match
    )
  );

  addFactor(
    factors,
    buildLineupFactor(
      match
    )
  );

  addFactor(
    factors,
    buildFatigueFactor(
      match
    )
  );

  addFactor(
    factors,
    buildCompetitionContextFactor(
      match
    )
  );

  addFactor(
    factors,
    buildDataQualityFactor(
      input.dataCompleteness
    )
  );

  addFactor(
    factors,
    buildUncertaintyFactor(
      input.intelligence,
      input.dataCompleteness
    )
  );

  const weightedScore =
    weightedAverage(
      factors,
      (
        factor
      ) =>
        factor.score
    );

  const weightedConfidence =
    weightedAverage(
      factors,
      (
        factor
      ) =>
        factor.confidence
    );

  const weightedReliability =
    weightedAverage(
      factors,
      (
        factor
      ) =>
        factor.reliability
    );

  const uncertainty =
    round(
      clamp(
        100 -
        (
          weightedConfidence *
            0.55 +
          weightedReliability *
            0.45
        ),
        0,
        100
      )
    );

  return {
    factors,

    availableFactors:
      factors.filter(
        (
          factor
        ) =>
          factor.availability
      ).length,

    totalFactors:
      factors.length,

    weightedScore,

    weightedConfidence,

    weightedReliability,

    uncertainty,
  };
}