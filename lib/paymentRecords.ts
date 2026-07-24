export type CanonicalPaymentStatus =
  | "completed"
  | "pending"
  | "failed"
  | "orphaned"
  | "unknown";

type PaymentLike =
  Record<string, unknown>;

function normalizeText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

export function normalizePaymentStatus(
  value: unknown
): CanonicalPaymentStatus {
  const status =
    normalizeText(value);

  if (
    status === "completed" ||
    status === "finished" ||
    status === "confirmed"
  ) {
    return "completed";
  }

  if (
    status === "pending" ||
    status === "waiting" ||
    status === "confirming" ||
    status === "sending" ||
    status === "partially_paid"
  ) {
    return "pending";
  }

  if (
    status === "failed" ||
    status === "expired" ||
    status === "refunded"
  ) {
    return "failed";
  }

  if (
    status === "orphaned"
  ) {
    return "orphaned";
  }

  return "unknown";
}

export function getPaymentStatus(
  payment: PaymentLike
): CanonicalPaymentStatus {
  const canonical =
    normalizePaymentStatus(
      payment.status
    );

  if (
    canonical !== "unknown"
  ) {
    return canonical;
  }

  const providerStatus =
    normalizePaymentStatus(
      payment.paymentStatus
    );

  if (
    providerStatus !== "unknown"
  ) {
    return providerStatus;
  }

  const nowPayments =
    payment.nowpayments &&
    typeof payment.nowpayments ===
      "object" &&
    !Array.isArray(
      payment.nowpayments
    )
      ? payment.nowpayments as Record<
          string,
          unknown
        >
      : {};

  return normalizePaymentStatus(
    nowPayments.payment_status
  );
}

export function getPaymentAmount(
  payment: PaymentLike
): number {
  const nowPayments =
    payment.nowpayments &&
    typeof payment.nowpayments ===
      "object" &&
    !Array.isArray(
      payment.nowpayments
    )
      ? payment.nowpayments as Record<
          string,
          unknown
        >
      : {};

  const candidates = [
    payment.price,
    payment.priceAmount,
    payment.amount,
    nowPayments.price_amount,
  ];

  for (
    const candidate of candidates
  ) {
    if (
      candidate === null ||
      candidate === undefined ||
      candidate === ""
    ) {
      continue;
    }

    const parsed =
      Number(candidate);

    if (
      Number.isFinite(parsed) &&
      parsed >= 0
    ) {
      return parsed;
    }
  }

  return 0;
}

export function timestampLikeToMillis(
  value: unknown
): number | null {
  if (
    value &&
    typeof value === "object"
  ) {
    if (
      "toMillis" in value &&
      typeof (
        value as {
          toMillis?: unknown;
        }
      ).toMillis === "function"
    ) {
      const millis =
        (
          value as {
            toMillis:
              () => number;
          }
        ).toMillis();

      return Number.isFinite(
        millis
      )
        ? millis
        : null;
    }

    if (
      "toDate" in value &&
      typeof (
        value as {
          toDate?: unknown;
        }
      ).toDate === "function"
    ) {
      const date =
        (
          value as {
            toDate:
              () => Date;
          }
        ).toDate();

      return Number.isFinite(
        date.getTime()
      )
        ? date.getTime()
        : null;
    }
  }

  if (
    value instanceof Date
  ) {
    return Number.isFinite(
      value.getTime()
    )
      ? value.getTime()
      : null;
  }

  if (
    typeof value === "string"
  ) {
    const millis =
      new Date(
        value
      ).getTime();

    return Number.isFinite(
      millis
    )
      ? millis
      : null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return null;
}
