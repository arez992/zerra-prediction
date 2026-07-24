import "server-only";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  getPaymentStatus,
} from "@/lib/paymentRecords";

import type {
  ExecutionHandler,
} from "../types";

export const paymentAuditExecutor:
  ExecutionHandler =
  async ({ payload }) => {
    const paymentsSnapshot =
      await adminDb
        .collection("payments")
        .get();

    const payments =
      paymentsSnapshot.docs.map(
        (document) =>
          document.data()
      );

    const summary = {
      total: payments.length,
      completed: 0,
      pending: 0,
      failed: 0,
      unknown: 0,
    };

    for (
      const payment of payments
    ) {
      const status =
        getPaymentStatus(
          payment
        );

      if (
        status ===
          "completed"
      ) {
        summary.completed +=
          1;
      } else if (
        status ===
          "pending"
      ) {
        summary.pending +=
          1;
      } else if (
        status ===
          "failed"
      ) {
        summary.failed +=
          1;
      } else {
        summary.unknown +=
          1;
      }
    }

    const processed =
      summary.completed +
      summary.failed;

    const successRate =
      processed === 0
        ? 0
        : Number(
            (
              (
                summary.completed /
                processed
              ) *
              100
            ).toFixed(2)
          );

    return {
      success: true,
      completed: true,
      message:
        "Payment audit completed successfully.",
      data: {
        ...summary,
        successRate,
        originalPayload:
          payload,
      },
    };
  };
