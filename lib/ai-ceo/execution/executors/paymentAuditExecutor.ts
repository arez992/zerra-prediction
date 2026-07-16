import "server-only";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import type {
  ExecutionHandler,
} from "../types";

function normalizeStatus(
  value: unknown
): string {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
}

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
      const nowPayments =
        payment.nowpayments &&
        typeof payment.nowpayments ===
          "object"
          ? (
              payment.nowpayments as Record<
                string,
                unknown
              >
            )
          : {};

      const status =
        normalizeStatus(
          payment.status ||
            payment.paymentStatus ||
            nowPayments.payment_status
        );

      if (
        status === "completed" ||
        status === "finished" ||
        status === "confirmed"
      ) {
        summary.completed += 1;
      } else if (
        status === "pending" ||
        status === "waiting" ||
        status === "confirming"
      ) {
        summary.pending += 1;
      } else if (
        status === "failed" ||
        status === "expired" ||
        status === "refunded"
      ) {
        summary.failed += 1;
      } else {
        summary.unknown += 1;
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