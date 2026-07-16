import "server-only";

import type {
  RecommendationImpact,
} from "./types";

export function calculateImpactScore(
  impact: RecommendationImpact
) {
  const expected =
    impact.expectedImpact;

  const actual =
    impact.actualImpact;

  const values = [
    compare(
      expected.revenue,
      actual.revenue
    ),
    compare(
      expected.users,
      actual.users
    ),
    compare(
      expected.seo,
      actual.seo
    ),
    compare(
      expected.vipConversion,
      actual.vipConversion
    ),
    compare(
      expected.predictionAccuracy,
      actual.predictionAccuracy
    ),
  ].filter(
    (
      value
    ): value is number =>
      value !== null
  );

  if (values.length === 0) {
    return 0;
  }

  return Math.round(
    values.reduce(
      (total, value) =>
        total + value,
      0
    ) / values.length
  );
}

function compare(
  expected?: number,
  actual?: number
) {
  if (
    expected === undefined ||
    actual === undefined
  ) {
    return null;
  }

  if (expected === 0) {
    return actual > 0
      ? 100
      : 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (actual / expected) *
          100
      )
    )
  );
}