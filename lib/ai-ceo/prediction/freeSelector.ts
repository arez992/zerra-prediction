import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

const COLLECTION_NAME =
  "predictionHistory";

const DAILY_SELECTION_COLLECTION =
  "aiCeoDailyFreeSelections";

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

  locked: boolean;
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

function asRecord(
  value: unknown
): Record<
  string,
  unknown
> {
  return (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  )
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function getRiskLabel(
  data: Record<
    string,
    unknown
  >
): string {
  const risk =
    asRecord(
      data.risk
    );

  const riskLabel =
    risk.label;

  if (
    typeof riskLabel ===
      "string" &&
    riskLabel.trim()
  ) {
    return riskLabel
      .trim()
      .toLowerCase();
  }

  const prediction =
    asRecord(
      data.prediction
    );

  const predictionRisk =
    prediction.risk;

  if (
    typeof predictionRisk ===
      "string" &&
    predictionRisk.trim()
  ) {
    return predictionRisk
      .trim()
      .toLowerCase();
  }

  const publicPrediction =
    asRecord(
      data.publicPrediction
    );

  const publicRisk =
    publicPrediction.risk;

  return (
    typeof publicRisk ===
      "string"
  )
    ? publicRisk
        .trim()
        .toLowerCase()
    : "";
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

function getConfidence(
  data: Record<
    string,
    unknown
  >
): number {
  const vipPrediction =
    asRecord(
      data.vipPrediction
    );

  const directConfidence =
    vipPrediction.confidence;

  if (
    typeof directConfidence ===
      "number" &&
    Number.isFinite(
      directConfidence
    )
  ) {
    return directConfidence;
  }

  const prediction =
    asRecord(
      data.prediction
    );

  const nestedVip =
    asRecord(
      prediction.vipPrediction
    );

  const primaryPrediction =
    asRecord(
      nestedVip.primaryPrediction
    );

  const primaryConfidence =
    primaryPrediction.confidence;

  if (
    typeof primaryConfidence ===
      "number" &&
    Number.isFinite(
      primaryConfidence
    )
  ) {
    return primaryConfidence;
  }

  const predictionConfidence =
    prediction.confidence;

  return (
    typeof predictionConfidence ===
      "number" &&
    Number.isFinite(
      predictionConfidence
    )
  )
    ? predictionConfidence
    : 0;
}

function uniqueIds(
  values: unknown
): string[] {
  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(
          (
            value
          ) =>
            typeof value ===
              "string"
              ? value.trim()
              : ""
        )
        .filter(
          Boolean
        )
    )
  ).slice(
    0,
    DAILY_FREE_LIMIT
  );
}

/*
 * Daily Free Prediction rule:
 *
 * 1. Exactly one immutable pool per fixture date.
 * 2. Maximum 3 predictions.
 * 3. Only Low Risk predictions can enter the pool.
 * 4. Once 3 IDs are selected, later prediction publishing
 *    MUST NOT replace or rotate those selections.
 * 5. Match settlement/status changes also MUST NOT create
 *    replacement free predictions.
 *
 * The dedicated daily selection document is the lock/source
 * of truth. This makes repeated and overlapping cron runs safe.
 */
export async function selectDailyFreePredictions(
  rawDate: string
): Promise<
  FreeSelectionResult
> {
  const date =
    normalizeDate(
      rawDate
    );

  const selectionRef =
    adminDb
      .collection(
        DAILY_SELECTION_COLLECTION
      )
      .doc(
        date
      );

  /*
   * Recover selections that were already created by the
   * previous implementation before the permanent daily
   * lock document existed.
   */
  const legacySnapshot =
    await adminDb
      .collection(
        COLLECTION_NAME
      )
      .where(
        "freeSelectionDate",
        "==",
        date
      )
      .get();

  const legacySelectedIds =
    legacySnapshot.docs
      .filter(
        (
          document
        ) =>
          document.data()
            .isFree ===
          true
      )
      .map(
        (
          document
        ) =>
          document.id
      )
      .slice(
        0,
        DAILY_FREE_LIMIT
      );

  /*
   * Candidate discovery is intentionally separate from the
   * lock. Only published + Low Risk predictions for this
   * fixture date are eligible for the INITIAL selection.
   */
  const publishedSnapshot =
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

  const candidates =
    publishedSnapshot.docs
      .filter(
        (
          document
        ) => {
          const data =
            document.data();

          return (
            getFixtureDateKey(
              data
            ) ===
              date &&
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
        ) =>
          getConfidence(
            right.data()
          ) -
          getConfidence(
            left.data()
          )
      );

  return adminDb.runTransaction(
    async (
      transaction
    ) => {
      const selectionSnapshot =
        await transaction.get(
          selectionRef
        );

      const storedIds =
        selectionSnapshot.exists
          ? uniqueIds(
              selectionSnapshot
                .data()
                ?.selectedPredictionIds
            )
          : [];

      /*
       * Merge in any already-existing isFree selections once.
       * This preserves the 3 predictions already shown today.
       */
      const currentIds =
        uniqueIds([
          ...storedIds,
          ...legacySelectedIds,
        ]);

      if (
        currentIds.length >=
        DAILY_FREE_LIMIT
      ) {
        if (
          !selectionSnapshot.exists ||
          storedIds.length !==
            currentIds.length
        ) {
          transaction.set(
            selectionRef,
            {
              date,

              selectedPredictionIds:
                currentIds,

              count:
                currentIds.length,

              limit:
                DAILY_FREE_LIMIT,

              locked:
                true,

              selectedBy:
                "ai-ceo",

              updatedAt:
                FieldValue
                  .serverTimestamp(),

              lockedAt:
                FieldValue
                  .serverTimestamp(),
            },
            {
              merge:
                true,
            }
          );
        }

        return {
          date,

          limit:
            DAILY_FREE_LIMIT,

          existingFreeCount:
            currentIds.length,

          selectedCount:
            0,

          selectedPredictionIds:
            currentIds,

          remainingSlots:
            0,

          locked:
            true,
        };
      }

      const remainingSlots =
        DAILY_FREE_LIMIT -
        currentIds.length;

      const newCandidates =
        candidates
          .filter(
            (
              document
            ) =>
              !currentIds.includes(
                document.id
              )
          )
          .slice(
            0,
            remainingSlots
          );

      const newIds =
        newCandidates.map(
          (
            document
          ) =>
            document.id
        );

      const finalIds =
        uniqueIds([
          ...currentIds,
          ...newIds,
        ]);

      for (
        const document
        of newCandidates
      ) {
        transaction.set(
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
          },
          {
            merge:
              true,
          }
        );
      }

      const locked =
        finalIds.length >=
        DAILY_FREE_LIMIT;

      transaction.set(
        selectionRef,
        {
          date,

          selectedPredictionIds:
            finalIds,

          count:
            finalIds.length,

          limit:
            DAILY_FREE_LIMIT,

          locked,

          selectedBy:
            "ai-ceo",

          updatedAt:
            FieldValue
              .serverTimestamp(),

          ...(
            locked
              ? {
                  lockedAt:
                    FieldValue
                      .serverTimestamp(),
                }
              : {}
          ),
        },
        {
          merge:
            true,
        }
      );

      return {
        date,

        limit:
          DAILY_FREE_LIMIT,

        existingFreeCount:
          currentIds.length,

        selectedCount:
          newIds.length,

        selectedPredictionIds:
          finalIds,

        remainingSlots:
          Math.max(
            0,
            DAILY_FREE_LIMIT -
              finalIds.length
          ),

        locked,
      };
    }
  );
}
