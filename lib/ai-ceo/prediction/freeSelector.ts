import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

const COLLECTION_NAME =
  "predictionHistory";

const DAILY_FREE_LIMIT =
  3;

type FreeSelectionResult = {
  date: string;

  limit: number;

  existingFreeCount: number;

  selectedCount: number;

  selectedPredictionIds:
    string[];

  remainingSlots: number;
};

function normalizeDate(
  value: string
): string {
  const date =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      "Free prediction selection date must use YYYY-MM-DD format."
    );
  }

  return date;
}

function getRiskLabel(
  data: Record<
    string,
    unknown
  >
): string {
  const risk =
    data.risk;

  if (
    risk &&
    typeof risk ===
      "object" &&
    !Array.isArray(
      risk
    )
  ) {
    const label =
      (
        risk as Record<
          string,
          unknown
        >
      ).label;

    if (
      typeof label ===
        "string"
    ) {
      return label
        .trim()
        .toLowerCase();
    }
  }

  const prediction =
    data.prediction;

  if (
    prediction &&
    typeof prediction ===
      "object" &&
    !Array.isArray(
      prediction
    )
  ) {
    const value =
      (
        prediction as Record<
          string,
          unknown
        >
      ).risk;

    if (
      typeof value ===
        "string"
    ) {
      return value
        .trim()
        .toLowerCase();
    }
  }

  const publicPrediction =
    data.publicPrediction;

  if (
    publicPrediction &&
    typeof publicPrediction ===
      "object" &&
    !Array.isArray(
      publicPrediction
    )
  ) {
    const value =
      (
        publicPrediction as Record<
          string,
          unknown
        >
      ).risk;

    if (
      typeof value ===
        "string"
    ) {
      return value
        .trim()
        .toLowerCase();
    }
  }

  return "";
}

function getFixtureDateKey(
  data: Record<
    string,
    unknown
  >
): string {
  const fixtureDate =
    data.fixtureDate;

  if (
    typeof fixtureDate ===
      "string" &&
    fixtureDate.length >=
      10
  ) {
    return fixtureDate.slice(
      0,
      10
    );
  }

  return "";
}

export async function selectDailyFreePredictions(
  rawDate: string
): Promise<
  FreeSelectionResult
> {
  const date =
    normalizeDate(
      rawDate
    );

  /*
   * Read published predictions.
   *
   * Filtering by date/risk is
   * intentionally done in memory so
   * this feature does not immediately
   * require another Firestore composite
   * index.
   */
  const snapshot =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .where(
        "status",
        "==",
        "published"
      )
      .get();

  const dailyDocuments =
    snapshot.docs.filter(
      (
        document
      ) => {
        const data =
          document.data();

        return (
          getFixtureDateKey(
            data
          ) === date
        );
      }
    );

  /*
   * Existing selections are counted
   * first. This makes repeated cron runs
   * idempotent.
   */
  const existingFree =
    dailyDocuments.filter(
      (
        document
      ) =>
        document.data()
          .isFree ===
        true
    );

  const existingFreeCount =
    existingFree.length;

  const remainingSlots =
    Math.max(
      0,
      DAILY_FREE_LIMIT -
        existingFreeCount
    );

  if (
    remainingSlots ===
    0
  ) {
    return {
      date,

      limit:
        DAILY_FREE_LIMIT,

      existingFreeCount,

      selectedCount:
        0,

      selectedPredictionIds:
        [],

      remainingSlots:
        0,
    };
  }

  /*
   * Only published + Low Risk
   * predictions are eligible.
   */
  const candidates =
    dailyDocuments
      .filter(
        (
          document
        ) => {
          const data =
            document.data();

          if (
            data.isFree ===
            true
          ) {
            return false;
          }

          return (
            getRiskLabel(
              data
            ) ===
            "low"
          );
        }
      )
      .sort(
        (
          left,
          right
        ) => {
          /*
           * Prefer stronger confidence
           * when available.
           */
          const getConfidence =
            (
              data: Record<
                string,
                unknown
              >
            ): number => {
              const prediction =
                data.prediction;

              if (
                prediction &&
                typeof prediction ===
                  "object" &&
                !Array.isArray(
                  prediction
                )
              ) {
                const primary =
                  (
                    prediction as Record<
                      string,
                      unknown
                    >
                  )
                    .vipPrediction;

                if (
                  primary &&
                  typeof primary ===
                    "object" &&
                  !Array.isArray(
                    primary
                  )
                ) {
                  const primaryPrediction =
                    (
                      primary as Record<
                        string,
                        unknown
                      >
                    )
                      .primaryPrediction;

                  if (
                    primaryPrediction &&
                    typeof primaryPrediction ===
                      "object" &&
                    !Array.isArray(
                      primaryPrediction
                    )
                  ) {
                    const confidence =
                      (
                        primaryPrediction as Record<
                          string,
                          unknown
                        >
                      )
                        .confidence;

                    if (
                      typeof confidence ===
                        "number" &&
                      Number.isFinite(
                        confidence
                      )
                    ) {
                      return confidence;
                    }
                  }
                }
              }

              return 0;
            };

          return (
            getConfidence(
              right.data()
            ) -
            getConfidence(
              left.data()
            )
          );
        }
      )
      .slice(
        0,
        remainingSlots
      );

  if (
    candidates.length ===
    0
  ) {
    return {
      date,

      limit:
        DAILY_FREE_LIMIT,

      existingFreeCount,

      selectedCount:
        0,

      selectedPredictionIds:
        [],

      remainingSlots,
    };
  }

  const batch =
    adminDb.batch();

  for (
    const document
    of candidates
  ) {
    batch.update(
      document.ref,
      {
        isFree:
          true,

        freeSelectionDate:
          date,

        freeSelectedBy:
          "ai-ceo",

        freeSelectedAt:
          FieldValue
            .serverTimestamp(),

        updatedAt:
          FieldValue
            .serverTimestamp(),
      }
    );
  }

  await batch.commit();

  return {
    date,

    limit:
      DAILY_FREE_LIMIT,

    existingFreeCount,

    selectedCount:
      candidates.length,

    selectedPredictionIds:
      candidates.map(
        (
          document
        ) =>
          document.id
      ),

    remainingSlots:
      Math.max(
        0,
        remainingSlots -
          candidates.length
      ),
  };
}