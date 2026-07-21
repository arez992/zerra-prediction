import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

const QUEUE_COLLECTION =
  "predictionGenerationQueue";

export type PredictionQueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type PredictionQueueCandidate = {
  fixtureId:
    string;

  date:
    string;

  fixtureDate:
    string | null;

  homeTeam:
    string;

  awayTeam:
    string;

  confidence:
    number;

  risk:
    string;

  pick:
    string;

  qualified:
    boolean;

  consistencyValid:
    boolean;
};

export type PredictionQueueItem = {
  id:
    string;

  fixtureId:
    string;

  date:
    string;

  fixtureDate:
    string | null;

  homeTeam:
    string;

  awayTeam:
    string;

  confidence:
    number;

  risk:
    string;

  pick:
    string;

  qualified:
    boolean;

  consistencyValid:
    boolean;

  status:
    PredictionQueueStatus;

  attempts:
    number;

  lastError:
    string | null;
};

function normalizeText(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeNumber(
  value:
    unknown
): number {
  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function buildQueueDocumentId(
  date:
    string,

  fixtureId:
    string
): string {
  return `${date}-${fixtureId}`;
}

/*
 * Save every strong Cheap Scan candidate.
 *
 * Firestore document ID is deterministic:
 *
 * YYYY-MM-DD-FIXTURE_ID
 *
 * Therefore the same fixture cannot create
 * duplicate queue items during repeated scans.
 */
export async function enqueuePredictionCandidates(
  candidates:
    PredictionQueueCandidate[]
): Promise<{
  requested:
    number;

  queued:
    number;
}> {
  if (
    candidates.length ===
    0
  ) {
    return {
      requested:
        0,

      queued:
        0,
    };
  }

  /*
   * Firestore batch limit is higher than
   * this, but using smaller chunks keeps
   * queue writes controlled.
   */
  const WRITE_BATCH_SIZE =
    200;

  let queued =
    0;

  for (
    let offset =
      0;

    offset <
    candidates.length;

    offset +=
      WRITE_BATCH_SIZE
  ) {
    const chunk =
      candidates.slice(
        offset,
        offset +
          WRITE_BATCH_SIZE
      );

    const batch =
      adminDb.batch();

    for (
      const candidate
      of chunk
    ) {
      const id =
        buildQueueDocumentId(
          candidate.date,
          candidate.fixtureId
        );

      const ref =
        adminDb
          .collection(
            QUEUE_COLLECTION
          )
          .doc(
            id
          );

      /*
       * merge:true is important.
       *
       * A repeated Cheap Scan may update
       * confidence/risk/pick, but must not
       * destroy processing/completed state.
       */
      batch.set(
        ref,
        {
          fixtureId:
            candidate.fixtureId,

          date:
            candidate.date,

          fixtureDate:
            candidate.fixtureDate,

          homeTeam:
            candidate.homeTeam,

          awayTeam:
            candidate.awayTeam,

          confidence:
            candidate.confidence,

          risk:
            candidate.risk,

          pick:
            candidate.pick,

          qualified:
            candidate.qualified,

          consistencyValid:
            candidate
              .consistencyValid,

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

    await batch.commit();

    /*
     * Initialize queue-state fields only
     * for documents that do not already
     * contain a status.
     *
     * We do this separately so a repeated
     * scan never resets completed work
     * back to pending.
     */
    for (
      const candidate
      of chunk
    ) {
      const id =
        buildQueueDocumentId(
          candidate.date,
          candidate.fixtureId
        );

      const ref =
        adminDb
          .collection(
            QUEUE_COLLECTION
          )
          .doc(
            id
          );

      await adminDb.runTransaction(
        async (
          transaction
        ) => {
          const snapshot =
            await transaction.get(
              ref
            );

          if (
            !snapshot.exists
          ) {
            return;
          }

          const data =
            snapshot.data() ||
            {};

          if (
            typeof data.status ===
              "string" &&
            data.status
          ) {
            return;
          }

          transaction.set(
            ref,
            {
              status:
                "pending",

              attempts:
                0,

              lastError:
                null,

              createdAt:
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

          queued +=
            1;
        }
      );
    }
  }

  return {
    requested:
      candidates.length,

    queued,
  };
}

/*
 * Return the next pending items for
 * one controlled processing run.
 *
 * Highest-confidence predictions are
 * processed first.
 */
export async function getPendingPredictionQueue(
  options: {
    date:
      string;

    limit?:
      number;
  }
): Promise<
  PredictionQueueItem[]
> {
  const limit =
    Math.min(
      25,
      Math.max(
        1,
        Math.floor(
          Number(
            options.limit
          ) ||
          25
        )
      )
    );

  const snapshot =
    await adminDb
      .collection(
        QUEUE_COLLECTION
      )
      .where(
        "date",
        "==",
        options.date
      )
      .where(
        "status",
        "==",
        "pending"
      )
      .limit(
        100
      )
      .get();

  return snapshot.docs
    .map(
      (
        document
      ): PredictionQueueItem => {
        const data =
          document.data() ||
          {};

        return {
          id:
            document.id,

          fixtureId:
            normalizeText(
              data.fixtureId
            ),

          date:
            normalizeText(
              data.date
            ),

          fixtureDate:
            normalizeText(
              data.fixtureDate
            ) ||
            null,

          homeTeam:
            normalizeText(
              data.homeTeam
            ),

          awayTeam:
            normalizeText(
              data.awayTeam
            ),

          confidence:
            normalizeNumber(
              data.confidence
            ),

          risk:
            normalizeText(
              data.risk
            ),

          pick:
            normalizeText(
              data.pick
            ),

          qualified:
            data.qualified ===
            true,

          consistencyValid:
            data
              .consistencyValid ===
            true,

          status:
            "pending",

          attempts:
            normalizeNumber(
              data.attempts
            ),

          lastError:
            normalizeText(
              data.lastError
            ) ||
            null,
        };
      }
    )
    .filter(
      (
        item
      ) =>
        Boolean(
          item.fixtureId
        )
    )
    .sort(
      (
        first,
        second
      ) =>
        second.confidence -
        first.confidence
    )
    .slice(
      0,
      limit
    );
}

/*
 * Claim one queue item before processing.
 *
 * Transaction prevents two overlapping
 * cron runs from processing the same
 * pending item simultaneously.
 */
export async function claimPredictionQueueItem(
  queueId:
    string
): Promise<boolean> {
  const ref =
    adminDb
      .collection(
        QUEUE_COLLECTION
      )
      .doc(
        queueId
      );

  return adminDb.runTransaction(
    async (
      transaction
    ) => {
      const snapshot =
        await transaction.get(
          ref
        );

      if (
        !snapshot.exists
      ) {
        return false;
      }

      const data =
        snapshot.data() ||
        {};

      if (
        data.status !==
        "pending"
      ) {
        return false;
      }

      transaction.set(
        ref,
        {
          status:
            "processing",

          attempts:
            FieldValue.increment(
              1
            ),

          processingStartedAt:
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

      return true;
    }
  );
}

export async function completePredictionQueueItem(
  queueId:
    string,

  metadata?: {
    predictionId?:
      string | null;

    finalStatus?:
      string | null;

    publicationDecision?:
      string | null;
  }
): Promise<void> {
  await adminDb
    .collection(
      QUEUE_COLLECTION
    )
    .doc(
      queueId
    )
    .set(
      {
        status:
          "completed",

        predictionId:
          metadata
            ?.predictionId ??
          null,

        finalStatus:
          metadata
            ?.finalStatus ??
          null,

        publicationDecision:
          metadata
            ?.publicationDecision ??
          null,

        lastError:
          null,

        completedAt:
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

/*
 * Failed items are returned to pending
 * for retry until MAX_ATTEMPTS is reached.
 */
export async function failPredictionQueueItem(
  queueId:
    string,

  error:
    string,

  maxAttempts =
    3
): Promise<void> {
  const ref =
    adminDb
      .collection(
        QUEUE_COLLECTION
      )
      .doc(
        queueId
      );

  await adminDb.runTransaction(
    async (
      transaction
    ) => {
      const snapshot =
        await transaction.get(
          ref
        );

      if (
        !snapshot.exists
      ) {
        return;
      }

      const data =
        snapshot.data() ||
        {};

      const attempts =
        normalizeNumber(
          data.attempts
        );

      const permanentFailure =
        attempts >=
        maxAttempts;

      transaction.set(
        ref,
        {
          status:
            permanentFailure
              ? "failed"
              : "pending",

          lastError:
            error,

          failedAt:
            permanentFailure
              ? FieldValue
                  .serverTimestamp()
              : null,

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
  );
}

export async function getPredictionQueueStats(
  date:
    string
): Promise<{
  pending:
    number;

  processing:
    number;

  completed:
    number;

  failed:
    number;

  total:
    number;
}> {
  const snapshot =
    await adminDb
      .collection(
        QUEUE_COLLECTION
      )
      .where(
        "date",
        "==",
        date
      )
      .get();

  let pending =
    0;

  let processing =
    0;

  let completed =
    0;

  let failed =
    0;

  for (
    const document
    of snapshot.docs
  ) {
    const status =
      normalizeText(
        document
          .data()
          .status
      );

    if (
      status ===
      "pending"
    ) {
      pending +=
        1;
    } else if (
      status ===
      "processing"
    ) {
      processing +=
        1;
    } else if (
      status ===
      "completed"
    ) {
      completed +=
        1;
    } else if (
      status ===
      "failed"
    ) {
      failed +=
        1;
    }
  }

  return {
    pending,

    processing,

    completed,

    failed,

    total:
      pending +
      processing +
      completed +
      failed,
  };
}