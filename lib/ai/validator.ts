export type ValidationResult = {
  correct:
    boolean | null;

  result:
    string;

  checked:
    boolean;
};

function normalizePick(
  prediction:
    any
): string {
  const primaryPick =
    prediction
      ?.vipPrediction
      ?.primaryPrediction
      ?.pick;

  if (
    typeof primaryPick ===
      "string" &&
    primaryPick.trim()
  ) {
    return primaryPick
      .trim()
      .toLowerCase();
  }

  const finalPrediction =
    prediction
      ?.vipPrediction
      ?.finalPrediction;

  if (
    typeof finalPrediction ===
      "string" &&
    finalPrediction.trim()
  ) {
    return finalPrediction
      .trim()
      .toLowerCase();
  }

  const valueBet =
    prediction
      ?.valueBet;

  if (
    typeof valueBet ===
      "string"
  ) {
    return valueBet
      .trim()
      .toLowerCase();
  }

  return "";
}

export function validatePrediction(
  prediction:
    any,

  fixture:
    any
): ValidationResult {
  const status =
    fixture
      ?.fixture
      ?.status
      ?.short;

  if (
    ![
      "FT",
      "AET",
      "PEN",
    ].includes(
      status
    )
  ) {
    return {
      correct:
        null,

      result:
        "Match not finished yet",

      checked:
        false,
    };
  }

  const homeGoals =
    fixture
      ?.goals
      ?.home;

  const awayGoals =
    fixture
      ?.goals
      ?.away;

  if (
    typeof homeGoals !==
      "number" ||
    typeof awayGoals !==
      "number"
  ) {
    return {
      correct:
        null,

      result:
        "Final score unavailable",

      checked:
        false,
    };
  }

  const pick =
    normalizePick(
      prediction
    );

  const totalGoals =
    homeGoals +
    awayGoals;

  let correct:
    boolean | null =
    null;

  /*
   * No-prediction outcomes are valid
   * model decisions but must not be
   * settled as wins or losses.
   */
  if (
    !pick ||
    pick ===
      "no strong prediction" ||
    pick ===
      "insufficient data" ||
    pick ===
      "no value"
  ) {
    return {
      correct:
        null,

      result:
        `${homeGoals}-${awayGoals}`,

      checked:
        false,
    };
  }

  /*
   * Total Goals
   */
  if (
    pick.includes(
      "over 1.5"
    )
  ) {
    correct =
      totalGoals >
      1.5;
  } else if (
    pick.includes(
      "under 1.5"
    )
  ) {
    correct =
      totalGoals <
      1.5;
  } else if (
    pick.includes(
      "over 2.5"
    )
  ) {
    correct =
      totalGoals >
      2.5;
  } else if (
    pick.includes(
      "under 2.5"
    )
  ) {
    correct =
      totalGoals <
      2.5;
  } else if (
    pick.includes(
      "over 3.5"
    )
  ) {
    correct =
      totalGoals >
      3.5;
  } else if (
    pick.includes(
      "under 3.5"
    )
  ) {
    correct =
      totalGoals <
      3.5;
  }

  /*
   * BTTS
   */
  else if (
    pick.includes(
      "btts yes"
    ) ||
    pick.includes(
      "both teams to score - yes"
    )
  ) {
    correct =
      homeGoals >
        0 &&
      awayGoals >
        0;
  } else if (
    pick.includes(
      "btts no"
    ) ||
    pick.includes(
      "both teams to score - no"
    )
  ) {
    correct =
      homeGoals ===
        0 ||
      awayGoals ===
        0;
  }

  /*
   * Team Total Goals
   */
  else if (
    pick.includes(
      "home team over 0.5"
    )
  ) {
    correct =
      homeGoals >
      0.5;
  } else if (
    pick.includes(
      "home team under 0.5"
    )
  ) {
    correct =
      homeGoals <
      0.5;
  } else if (
    pick.includes(
      "home team over 1.5"
    )
  ) {
    correct =
      homeGoals >
      1.5;
  } else if (
    pick.includes(
      "home team under 1.5"
    )
  ) {
    correct =
      homeGoals <
      1.5;
  } else if (
    pick.includes(
      "away team over 0.5"
    )
  ) {
    correct =
      awayGoals >
      0.5;
  } else if (
    pick.includes(
      "away team under 0.5"
    )
  ) {
    correct =
      awayGoals <
      0.5;
  } else if (
    pick.includes(
      "away team over 1.5"
    )
  ) {
    correct =
      awayGoals >
      1.5;
  } else if (
    pick.includes(
      "away team under 1.5"
    )
  ) {
    correct =
      awayGoals <
      1.5;
  }

  /*
   * Double Chance
   */
  else if (
    pick.includes(
      "double chance 1x"
    ) ||
    pick ===
      "1x"
  ) {
    correct =
      homeGoals >=
      awayGoals;
  } else if (
    pick.includes(
      "double chance x2"
    ) ||
    pick ===
      "x2"
  ) {
    correct =
      awayGoals >=
      homeGoals;
  } else if (
    pick.includes(
      "double chance 12"
    ) ||
    pick ===
      "12"
  ) {
    correct =
      homeGoals !==
      awayGoals;
  }

  /*
   * Legacy 1X2 fallback.
   *
   * Kept only so historical stored
   * predictions can still be settled.
   */
  else if (
    pick ===
      "home win"
  ) {
    correct =
      homeGoals >
      awayGoals;
  } else if (
    pick ===
      "away win"
  ) {
    correct =
      awayGoals >
      homeGoals;
  } else if (
    pick ===
      "draw"
  ) {
    correct =
      homeGoals ===
      awayGoals;
  }

  return {
    correct,

    result:
      `${homeGoals}-${awayGoals}`,

    checked:
      correct !==
      null,
  };
}