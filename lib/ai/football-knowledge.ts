import type {
  MatchIntelligenceResult,
  TeamIntelligence,
} from "./intelligence";

import type {
  PredictionMarketProbabilities,
} from "./prediction";

export type FootballKnowledgeSeverity =
  | "info"
  | "warning"
  | "critical";

export type FootballKnowledgeRule =
  | "BALANCED_MATCH"
  | "HIGH_DRAW_PRESSURE"
  | "FALSE_FAVORITE"
  | "HOME_EDGE"
  | "AWAY_EDGE"
  | "ATTACK_VS_WEAK_DEFENSE"
  | "LOW_SCORING_MATCH"
  | "HIGH_SCORING_MATCH"
  | "UNSTABLE_FORM"
  | "MOMENTUM_CONFLICT"
  | "LOW_RELIABILITY"
  | "DOUBLE_CHANCE_HOME"
  | "DOUBLE_CHANCE_AWAY"
  | "AVOID_OVERCONFIDENCE";

export type FootballKnowledgeSignal = {
  rule: FootballKnowledgeRule;
  severity: FootballKnowledgeSeverity;
  score: number;
  message: string;
};

export type FootballKnowledgeResult = {
  signals: FootballKnowledgeSignal[];

  adjustments: {
    homeWin: number;
    draw: number;
    awayWin: number;
    confidence: number;
    risk: number;
  };

  recommendations: {
    preferredOutcome:
      | "Home Win"
      | "Draw"
      | "Away Win"
      | "Home or Draw"
      | "Away or Draw"
      | "No Strong Result";

    avoidStraightWin: boolean;
    doubleChance:
      | "1X"
      | "X2"
      | null;

    goalLean:
      | "Over 2.5"
      | "Under 2.5"
      | "Neutral";
  };

  summary: string[];
};

export type FootballKnowledgeInput = {
  intelligence: MatchIntelligenceResult;
  markets: PredictionMarketProbabilities;
  confidence: number;
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

  return Math.round(
    value * multiplier
  ) / multiplier;
}

function average(
  values: number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    values.length
  );
}

function addSignal(
  signals: FootballKnowledgeSignal[],
  signal: FootballKnowledgeSignal
): void {
  signals.push({
    ...signal,
    score:
      round(
        clamp(
          signal.score,
          0,
          100
        )
      ),
  });
}

function calculateInstability(
  team: TeamIntelligence
): number {
  const consistency =
    average([
      team.attackingConsistency,
      team.defensiveConsistency,
      team.formStability,
    ]);

  const formMomentumGap =
    Math.abs(
      team.formRating -
      team.momentumRating
    );

  const resultSwing =
    Math.abs(
      team.recentWinRate -
      team.winRate
    ) * 100;

  return clamp(
    (
      100 -
      consistency
    ) * 0.55 +
    formMomentumGap * 1.2 +
    resultSwing * 0.45,
    0,
    100
  );
}

function calculateFalseFavoriteRisk(
  favorite:
    TeamIntelligence,
  opponent:
    TeamIntelligence,
  favoriteProbability: number,
  ratingGap: number
): number {
  const probabilityWithoutRatingSupport =
    clamp(
      favoriteProbability -
      50 -
      Math.max(
        0,
        ratingGap
      ) * 1.1,
      0,
      35
    );

  const momentumConflict =
    clamp(
      favorite.formRating -
      favorite.momentumRating,
      0,
      30
    );

  const defensiveWeakness =
    clamp(
      55 -
      favorite.defenseRating,
      0,
      35
    );

  const opponentScoringThreat =
    clamp(
      opponent.attackRating -
      52,
      0,
      35
    );

  const lowReliability =
    (
      1 -
      favorite.dataReliability
    ) * 100;

  return clamp(
    probabilityWithoutRatingSupport * 1.6 +
    momentumConflict * 1.25 +
    defensiveWeakness * 1.1 +
    opponentScoringThreat * 0.85 +
    lowReliability * 0.28,
    0,
    100
  );
}

function buildPreferredOutcome(
  homeWin: number,
  draw: number,
  awayWin: number,
  avoidStraightWin: boolean
): FootballKnowledgeResult["recommendations"]["preferredOutcome"] {
  const outcomes = [
    {
      label:
        "Home Win" as const,

      value:
        homeWin,
    },

    {
      label:
        "Draw" as const,

      value:
        draw,
    },

    {
      label:
        "Away Win" as const,

      value:
        awayWin,
    },
  ].sort(
    (first, second) =>
      second.value -
      first.value
  );

  const leader =
    outcomes[0];

  const second =
    outcomes[1];

  const gap =
    leader.value -
    second.value;

  if (
    avoidStraightWin ||
    gap < 7
  ) {
    if (
      homeWin >= awayWin &&
      homeWin + draw >= 65
    ) {
      return "Home or Draw";
    }

    if (
      awayWin > homeWin &&
      awayWin + draw >= 65
    ) {
      return "Away or Draw";
    }

    return "No Strong Result";
  }

  return leader.label;
}

export function applyFootballKnowledge(
  input: FootballKnowledgeInput
): FootballKnowledgeResult {
  const {
    intelligence,
    markets,
    confidence,
  } = input;

  const signals:
    FootballKnowledgeSignal[] = [];

  let homeAdjustment = 0;
  let drawAdjustment = 0;
  let awayAdjustment = 0;
  let confidenceAdjustment = 0;
  let riskAdjustment = 0;

  const ratingGap =
    intelligence.ratingDifference;

  const absoluteRatingGap =
    Math.abs(
      ratingGap
    );

  const balance =
    intelligence.matchupBalance;

  const drawPressure =
    intelligence.drawPressure;

  const reliability =
    intelligence.evidenceReliability;

  const homeInstability =
    calculateInstability(
      intelligence.home
    );

  const awayInstability =
    calculateInstability(
      intelligence.away
    );

  const averageInstability =
    average([
      homeInstability,
      awayInstability,
    ]);

  if (
    absoluteRatingGap <= 3.5 &&
    balance >= 68
  ) {
    const score =
      average([
        balance,
        100 -
        absoluteRatingGap * 12,
      ]);

    addSignal(
      signals,
      {
        rule:
          "BALANCED_MATCH",

        severity:
          score >= 80
            ? "critical"
            : "warning",

        score,

        message:
          "The teams are closely matched, so a straight-win prediction should be treated cautiously.",
      }
    );

    drawAdjustment += 4.5;
    confidenceAdjustment -= 5;
    riskAdjustment += 8;
  }

  if (
    drawPressure >= 62
  ) {
    addSignal(
      signals,
      {
        rule:
          "HIGH_DRAW_PRESSURE",

        severity:
          drawPressure >= 78
            ? "critical"
            : "warning",

        score:
          drawPressure,

        message:
          "The match shows elevated draw pressure from balance, scoring conditions, and historical result patterns.",
      }
    );

    drawAdjustment +=
      clamp(
        (
          drawPressure -
          55
        ) * 0.16,
        2,
        7
      );

    confidenceAdjustment -= 2;
    riskAdjustment += 5;
  }

  const homeFalseFavoriteRisk =
    calculateFalseFavoriteRisk(
      intelligence.home,
      intelligence.away,
      markets.homeWin,
      ratingGap
    );

  if (
    markets.homeWin >= 48 &&
    homeFalseFavoriteRisk >= 58
  ) {
    addSignal(
      signals,
      {
        rule:
          "FALSE_FAVORITE",

        severity:
          homeFalseFavoriteRisk >= 75
            ? "critical"
            : "warning",

        score:
          homeFalseFavoriteRisk,

        message:
          "The home team may be an unreliable favorite because probability support is stronger than the underlying football evidence.",
      }
    );

    homeAdjustment -= 4;
    drawAdjustment += 2.5;
    awayAdjustment += 1.5;
    confidenceAdjustment -= 5;
    riskAdjustment += 10;
  }

  const awayFalseFavoriteRisk =
    calculateFalseFavoriteRisk(
      intelligence.away,
      intelligence.home,
      markets.awayWin,
      -ratingGap
    );

  if (
    markets.awayWin >= 48 &&
    awayFalseFavoriteRisk >= 58
  ) {
    addSignal(
      signals,
      {
        rule:
          "FALSE_FAVORITE",

        severity:
          awayFalseFavoriteRisk >= 75
            ? "critical"
            : "warning",

        score:
          awayFalseFavoriteRisk,

        message:
          "The away team may be an unreliable favorite because probability support is stronger than the underlying football evidence.",
      }
    );

    awayAdjustment -= 4;
    drawAdjustment += 2.5;
    homeAdjustment += 1.5;
    confidenceAdjustment -= 5;
    riskAdjustment += 10;
  }

  if (
    intelligence.homeEdge >= 63 &&
    intelligence.home.venueRating >= 58
  ) {
    const score =
      average([
        intelligence.homeEdge,
        intelligence.home.venueRating,
      ]);

    addSignal(
      signals,
      {
        rule:
          "HOME_EDGE",

        severity:
          "info",

        score,

        message:
          "The home team has a meaningful venue and home-performance advantage.",
      }
    );

    homeAdjustment += 2.5;
    awayAdjustment -= 1;
  }

  if (
    intelligence.homeEdge <= 39 &&
    intelligence.away.formRating >= 57
  ) {
    const score =
      average([
        100 -
        intelligence.homeEdge,
        intelligence.away.formRating,
      ]);

    addSignal(
      signals,
      {
        rule:
          "AWAY_EDGE",

        severity:
          "info",

        score,

        message:
          "The away team has enough form and matchup strength to reduce the normal home advantage.",
      }
    );

    awayAdjustment += 2.5;
    homeAdjustment -= 1;
  }

  const homeAttackMismatch =
    intelligence.home.attackRating -
    intelligence.away.defenseRating;

  if (
    homeAttackMismatch >= 12
  ) {
    addSignal(
      signals,
      {
        rule:
          "ATTACK_VS_WEAK_DEFENSE",

        severity:
          homeAttackMismatch >= 20
            ? "warning"
            : "info",

        score:
          clamp(
            50 +
            homeAttackMismatch * 2,
            0,
            100
          ),

        message:
          "The home attack has a favorable matchup against the away defense.",
      }
    );

    homeAdjustment += 2;
  }

  const awayAttackMismatch =
    intelligence.away.attackRating -
    intelligence.home.defenseRating;

  if (
    awayAttackMismatch >= 12
  ) {
    addSignal(
      signals,
      {
        rule:
          "ATTACK_VS_WEAK_DEFENSE",

        severity:
          awayAttackMismatch >= 20
            ? "warning"
            : "info",

        score:
          clamp(
            50 +
            awayAttackMismatch * 2,
            0,
            100
          ),

        message:
          "The away attack has a favorable matchup against the home defense.",
      }
    );

    awayAdjustment += 2;
  }

  if (
    intelligence.goalEnvironment <= 42 &&
    markets.under25 >= 58
  ) {
    addSignal(
      signals,
      {
        rule:
          "LOW_SCORING_MATCH",

        severity:
          "info",

        score:
          average([
            100 -
            intelligence.goalEnvironment,
            markets.under25,
          ]),

        message:
          "The match profile favors a controlled or lower-scoring game.",
      }
    );

    drawAdjustment += 2;
    riskAdjustment += 2;
  }

  if (
    intelligence.goalEnvironment >= 65 &&
    markets.over25 >= 60
  ) {
    addSignal(
      signals,
      {
        rule:
          "HIGH_SCORING_MATCH",

        severity:
          "info",

        score:
          average([
            intelligence.goalEnvironment,
            markets.over25,
          ]),

        message:
          "The attacking and goal signals support an open, higher-scoring match.",
      }
    );
  }

  if (
    averageInstability >= 57
  ) {
    addSignal(
      signals,
      {
        rule:
          "UNSTABLE_FORM",

        severity:
          averageInstability >= 72
            ? "critical"
            : "warning",

        score:
          averageInstability,

        message:
          "Recent performance is unstable, reducing confidence in a strong directional prediction.",
      }
    );

    confidenceAdjustment -=
      clamp(
        (
          averageInstability -
          50
        ) * 0.18,
        2,
        7
      );

    riskAdjustment +=
      clamp(
        (
          averageInstability -
          50
        ) * 0.28,
        3,
        12
      );
  }

  const homeMomentumConflict =
    Math.abs(
      intelligence.home.formRating -
      intelligence.home.momentumRating
    );

  const awayMomentumConflict =
    Math.abs(
      intelligence.away.formRating -
      intelligence.away.momentumRating
    );

  const momentumConflict =
    Math.max(
      homeMomentumConflict,
      awayMomentumConflict
    );

  if (
    momentumConflict >= 15
  ) {
    addSignal(
      signals,
      {
        rule:
          "MOMENTUM_CONFLICT",

        severity:
          momentumConflict >= 24
            ? "warning"
            : "info",

        score:
          clamp(
            40 +
            momentumConflict * 2.2,
            0,
            100
          ),

        message:
          "Form and momentum are moving in different directions, which raises uncertainty.",
      }
    );

    confidenceAdjustment -= 3;
    riskAdjustment += 4;
  }

  if (
    reliability < 0.55
  ) {
    const score =
      (
        1 -
        reliability
      ) * 100;

    addSignal(
      signals,
      {
        rule:
          "LOW_RELIABILITY",

        severity:
          reliability < 0.35
            ? "critical"
            : "warning",

        score,

        message:
          "The available sample is limited, so the model should avoid aggressive confidence.",
      }
    );

    confidenceAdjustment -=
      clamp(
        (
          0.6 -
          reliability
        ) * 18,
        2,
        8
      );

    riskAdjustment +=
      clamp(
        (
          0.6 -
          reliability
        ) * 24,
        3,
        10
      );
  }

  const adjustedHome =
    markets.homeWin +
    homeAdjustment;

  const adjustedDraw =
    markets.draw +
    drawAdjustment;

  const adjustedAway =
    markets.awayWin +
    awayAdjustment;

  const leader =
    Math.max(
      adjustedHome,
      adjustedDraw,
      adjustedAway
    );

  const ordered =
    [
      adjustedHome,
      adjustedDraw,
      adjustedAway,
    ].sort(
      (first, second) =>
        second - first
    );

  const finalGap =
    ordered[0] -
    ordered[1];

  const avoidStraightWin =
    (
      drawPressure >= 68 ||
      balance >= 75 ||
      finalGap < 7 ||
      confidence +
      confidenceAdjustment < 56 ||
      averageInstability >= 65 ||
      reliability < 0.45
    ) &&
    leader !== adjustedDraw;

  if (
    avoidStraightWin
  ) {
    addSignal(
      signals,
      {
        rule:
          "AVOID_OVERCONFIDENCE",

        severity:
          "warning",

        score:
          clamp(
            average([
              drawPressure,
              balance,
              100 -
              finalGap * 5,
              100 -
              reliability * 100,
            ]),
            0,
            100
          ),

        message:
          "Football-knowledge safeguards recommend avoiding an overconfident straight-win selection.",
      }
    );

    confidenceAdjustment -= 3;
    riskAdjustment += 5;
  }

  let doubleChance:
    "1X" |
    "X2" |
    null = null;

  if (
    adjustedHome >= adjustedAway &&
    adjustedHome +
    adjustedDraw >= 65 &&
    avoidStraightWin
  ) {
    doubleChance =
      "1X";

    addSignal(
      signals,
      {
        rule:
          "DOUBLE_CHANCE_HOME",

        severity:
          "info",

        score:
          clamp(
            adjustedHome +
            adjustedDraw,
            0,
            100
          ),

        message:
          "The safer football interpretation is Home or Draw rather than a straight home win.",
      }
    );
  }

  if (
    adjustedAway > adjustedHome &&
    adjustedAway +
    adjustedDraw >= 65 &&
    avoidStraightWin
  ) {
    doubleChance =
      "X2";

    addSignal(
      signals,
      {
        rule:
          "DOUBLE_CHANCE_AWAY",

        severity:
          "info",

        score:
          clamp(
            adjustedAway +
            adjustedDraw,
            0,
            100
          ),

        message:
          "The safer football interpretation is Away or Draw rather than a straight away win.",
      }
    );
  }

  const goalLean:
    | "Over 2.5"
    | "Under 2.5"
    | "Neutral" =
    markets.over25 >= 63
      ? "Over 2.5"
      : markets.under25 >= 63
      ? "Under 2.5"
      : "Neutral";

  const preferredOutcome =
    buildPreferredOutcome(
      adjustedHome,
      adjustedDraw,
      adjustedAway,
      avoidStraightWin
    );

  const summary =
    signals
      .sort(
        (first, second) =>
          second.score -
          first.score
      )
      .slice(
        0,
        6
      )
      .map(
        (signal) =>
          signal.message
      );

  if (
    summary.length === 0
  ) {
    summary.push(
      "No major football-knowledge warning was detected for this matchup."
    );
  }

  return {
    signals,

    adjustments: {
      homeWin:
        round(
          homeAdjustment
        ),

      draw:
        round(
          drawAdjustment
        ),

      awayWin:
        round(
          awayAdjustment
        ),

      confidence:
        round(
          confidenceAdjustment
        ),

      risk:
        round(
          riskAdjustment
        ),
    },

    recommendations: {
      preferredOutcome,
      avoidStraightWin,
      doubleChance,
      goalLean,
    },

    summary,
  };
}