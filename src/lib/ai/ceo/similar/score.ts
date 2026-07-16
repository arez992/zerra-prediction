import "server-only";

import type {
  SimilarDecisionMatch,
  SimilarDecisionSummary,
} from "./types";

function clampScore(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(value)
    )
  );
}

function average(
  values: number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  return Number(
    (
      values.reduce(
        (total, value) =>
          total + value,
        0
      ) / values.length
    ).toFixed(2)
  );
}

function getValidNumbers(
  values: Array<
    number | null | undefined
  >
): number[] {
  return values.filter(
    (
      value
    ): value is number =>
      typeof value === "number" &&
      Number.isFinite(value)
  );
}

function getWeightedOutcomeScore(
  matches: SimilarDecisionMatch[]
): number {
  if (matches.length === 0) {
    return 0;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const match of matches) {
    const weight =
      Math.max(
        1,
        match.similarityScore
      );

    let outcomeScore = 50;

    switch (
      match.candidate.outcome
    ) {
      case "success":
        outcomeScore = 100;
        break;

      case "failure":
        outcomeScore = 0;
        break;

      case "neutral":
        outcomeScore = 50;
        break;

      case "unknown":
      default:
        outcomeScore = 40;
        break;
    }

    weightedTotal +=
      outcomeScore * weight;

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return clampScore(
    weightedTotal /
      totalWeight
  );
}

function determineRecommendedAction(
  matches: SimilarDecisionMatch[],
  averageSimilarity: number,
  averageImpactScore: number,
  averageROI: number
): SimilarDecisionSummary["recommendedAction"] {
  if (matches.length === 0) {
    return "insufficient-history";
  }

  const successfulMatches =
    matches.filter(
      (match) =>
        match.candidate.outcome ===
        "success"
    ).length;

  const failedMatches =
    matches.filter(
      (match) =>
        match.candidate.outcome ===
        "failure"
    ).length;

  const strongestMatch =
    matches[0] || null;

  const outcomeScore =
    getWeightedOutcomeScore(
      matches
    );

  const strongFailure =
    strongestMatch !== null &&
    strongestMatch.similarityScore >=
      70 &&
    strongestMatch.candidate
      .outcome === "failure";

  const strongSuccess =
    strongestMatch !== null &&
    strongestMatch.similarityScore >=
      70 &&
    strongestMatch.candidate
      .outcome === "success";

  if (
    strongFailure ||
    (
      failedMatches >
        successfulMatches &&
      outcomeScore < 40
    ) ||
    averageROI < -5
  ) {
    return "avoid";
  }

  if (
    strongSuccess &&
    averageSimilarity >= 60 &&
    outcomeScore >= 70 &&
    (
      averageImpactScore >= 60 ||
      averageROI > 0
    )
  ) {
    return "proceed";
  }

  return "review";
}

export function summarizeSimilarDecisions(
  matches: SimilarDecisionMatch[]
): SimilarDecisionSummary {
  const sortedMatches = [
    ...matches,
  ].sort(
    (left, right) =>
      right.similarityScore -
      left.similarityScore
  );

  const successfulMatches =
    sortedMatches.filter(
      (match) =>
        match.candidate.outcome ===
        "success"
    ).length;

  const failedMatches =
    sortedMatches.filter(
      (match) =>
        match.candidate.outcome ===
        "failure"
    ).length;

  const neutralMatches =
    sortedMatches.filter(
      (match) =>
        match.candidate.outcome ===
          "neutral" ||
        match.candidate.outcome ===
          "unknown"
    ).length;

  const averageSimilarity =
    average(
      sortedMatches.map(
        (match) =>
          match.similarityScore
      )
    );

  const averageImpactScore =
    average(
      getValidNumbers(
        sortedMatches.map(
          (match) =>
            match.candidate
              .impactScore
        )
      )
    );

  const averageROI =
    average(
      getValidNumbers(
        sortedMatches.map(
          (match) =>
            match.candidate.roi
        )
      )
    );

  return {
    totalMatches:
      sortedMatches.length,

    successfulMatches,

    failedMatches,

    neutralMatches,

    averageSimilarity,

    averageImpactScore,

    averageROI,

    strongestMatch:
      sortedMatches[0] ||
      null,

    recommendedAction:
      determineRecommendedAction(
        sortedMatches,
        averageSimilarity,
        averageImpactScore,
        averageROI
      ),
  };
}

export function calculateDecisionHistoryScore(
  matches: SimilarDecisionMatch[]
): number {
  if (matches.length === 0) {
    return 0;
  }

  const summary =
    summarizeSimilarDecisions(
      matches
    );

  const outcomeScore =
    getWeightedOutcomeScore(
      matches
    );

  const impactScore =
    summary.averageImpactScore;

  const roiScore =
    clampScore(
      50 +
        summary.averageROI
    );

  return clampScore(
    summary.averageSimilarity *
      0.35 +
      outcomeScore *
        0.35 +
      impactScore *
        0.2 +
      roiScore *
        0.1
  );
}