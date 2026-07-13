export type GoalsResult = {
  over25: number;
  under25: number;
  btts: number;
  expectedGoals: number;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
};

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

function safeNumber(
  value: unknown,
  fallback: number
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : fallback;
}

export function calculateGoals(
  match: unknown
): GoalsResult {
  const source = match as {
    fixture?: {
      goals?: {
        home?: number | null;
        away?: number | null;
      };
    };
  };

  const observedHomeGoals = safeNumber(
    source?.fixture?.goals?.home,
    1
  );

  const observedAwayGoals = safeNumber(
    source?.fixture?.goals?.away,
    1
  );

  const totalGoals =
    observedHomeGoals +
    observedAwayGoals;

  const homeExpectedGoals = clamp(
    Number(
      (
        1.15 +
        observedHomeGoals * 0.32
      ).toFixed(2)
    ),
    0.2,
    4.5
  );

  const awayExpectedGoals = clamp(
    Number(
      (
        1.05 +
        observedAwayGoals * 0.32
      ).toFixed(2)
    ),
    0.2,
    4.5
  );

  const expectedGoals = Number(
    (
      homeExpectedGoals +
      awayExpectedGoals
    ).toFixed(2)
  );

  const over25 = clamp(
    Math.round(
      42 +
      expectedGoals * 10 +
      (totalGoals >= 3 ? 7 : 0)
    ),
    5,
    95
  );

  const under25 = 100 - over25;

  const btts = clamp(
    Math.round(
      34 +
      Math.min(
        homeExpectedGoals,
        awayExpectedGoals
      ) *
        22 +
      (observedHomeGoals > 0 &&
      observedAwayGoals > 0
        ? 10
        : 0)
    ),
    5,
    95
  );

  return {
    over25,
    under25,
    btts,
    expectedGoals,
    homeExpectedGoals,
    awayExpectedGoals,
  };
}