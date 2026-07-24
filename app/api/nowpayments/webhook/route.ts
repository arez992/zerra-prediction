import crypto from "crypto";
import {
  NextResponse,
} from "next/server";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  getPlanDays,
  normalizePurchasablePlan,
} from "@/lib/nowPaymentsBilling";
import {
  normalizePaymentStatus,
  timestampLikeToMillis,
} from "@/lib/paymentRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function sortObject(
  value: unknown
): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return value;
  }

  return Object.keys(
    value as Record<string, unknown>
  )
    .sort()
    .reduce(
      (
        result: Record<
          string,
          unknown
        >,
        key
      ) => {
        result[key] = sortObject(
          (
            value as Record<
              string,
              unknown
            >
          )[key]
        );

        return result;
      },
      {}
    );
}

function verifySignature(
  body: unknown,
  signature: string | null
): boolean {
  const secret =
    process.env.NOWPAYMENTS_IPN_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha512", secret)
    .update(
      JSON.stringify(
        sortObject(body)
      )
    )
    .digest("hex");

  const expectedBuffer =
    Buffer.from(expected, "hex");

  const signatureBuffer =
    Buffer.from(signature, "hex");

  return (
    expectedBuffer.length ===
      signatureBuffer.length &&
    crypto.timingSafeEqual(
      expectedBuffer,
      signatureBuffer
    )
  );
}

function isPaidStatus(
  value: unknown
): boolean {
  return (
    value === "finished" ||
    value === "confirmed"
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const signature =
      request.headers.get(
        "x-nowpayments-sig"
      );

    if (
      !verifySignature(
        body,
        signature
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid signature",
        },
        {
          status: 401,
        }
      );
    }

    const orderId =
      typeof body.order_id === "string"
        ? body.order_id.trim()
        : "";

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing order_id",
        },
        {
          status: 400,
        }
      );
    }

    const paymentStatus =
      typeof body.payment_status ===
      "string"
        ? body.payment_status
        : "unknown";

    const canonicalProviderStatus =
      normalizePaymentStatus(
        paymentStatus
      );

    const paymentRef =
      adminDb
        .collection("payments")
        .doc(orderId);

    await adminDb.runTransaction(
      async (transaction) => {
        const paymentSnapshot =
          await transaction.get(
            paymentRef
          );

        if (
          !paymentSnapshot.exists
        ) {
          transaction.set(
            paymentRef,
            {
              orderId,
              status: "orphaned",
              paymentStatus,
              nowpayments: body,
              nowpaymentsUpdatedAt:
                FieldValue.serverTimestamp(),
              updatedAt:
                FieldValue.serverTimestamp(),
            }
          );

          return;
        }

        const payment =
          paymentSnapshot.data() || {};

        const alreadyCompleted =
          payment.status ===
          "completed";

        const statusUpdate:
          Record<
            string,
            unknown
          > = {
            paymentStatus,
            nowpayments:
              body,
            nowpaymentsUpdatedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          };

        if (
          !alreadyCompleted &&
          canonicalProviderStatus ===
            "pending"
        ) {
          statusUpdate.status =
            "pending";
        }

        if (
          !alreadyCompleted &&
          canonicalProviderStatus ===
            "failed"
        ) {
          statusUpdate.status =
            "failed";
          statusUpdate.failedAt =
            FieldValue.serverTimestamp();
        }

        transaction.set(
          paymentRef,
          statusUpdate,
          {
            merge:
              true,
          }
        );

        if (
          alreadyCompleted
        ) {
          return;
        }

        if (
          !isPaidStatus(
            paymentStatus
          )
        ) {
          return;
        }

        const plan =
          normalizePurchasablePlan(
            payment.plan
          );

        if (!plan) {
          throw new Error(
            "Invalid payment plan"
          );
        }

        const uid =
          typeof payment.uid ===
            "string"
            ? payment.uid
            : "";

        if (!uid) {
          throw new Error(
            "Payment user is missing"
          );
        }

        const userRef =
          adminDb
            .collection("users")
            .doc(uid);

        const userSnapshot =
          await transaction.get(
            userRef
          );

        const user =
          userSnapshot.data() || {};

        let expiresAt:
          | Timestamp
          | null = null;

        if (
          plan !== "Lifetime"
        ) {
          const days =
            getPlanDays(plan);

          if (!days) {
            throw new Error(
              "Invalid plan duration"
            );
          }

          const currentExpiry =
            timestampLikeToMillis(
              user.expiresAt
            );

          const baseTime =
            currentExpiry &&
            currentExpiry > Date.now()
              ? currentExpiry
              : Date.now();

          expiresAt =
            Timestamp.fromMillis(
              baseTime +
                days *
                  24 *
                  60 *
                  60 *
                  1000
            );
        }

        transaction.set(
          userRef,
          {
            email:
              payment.email || null,
            isVip: true,
            plan,
            expiresAt,
            vipExpireAt:
              FieldValue.delete(),
            vipActivatedAt:
              FieldValue.serverTimestamp(),
            lastPaymentId:
              orderId,
            totalPayments:
              FieldValue.increment(1),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        transaction.set(
          paymentRef,
          {
            status: "completed",
            completedAt:
              FieldValue.serverTimestamp(),
            confirmedAt:
              FieldValue.serverTimestamp(),
            paidAmount:
              body.actually_paid ||
              body.pay_amount ||
              null,
            payCurrency:
              body.pay_currency ||
              null,
            paymentId:
              body.payment_id ||
              null,
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      }
    );

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Webhook processing failed";

    console.error(
      "[NOWPAYMENTS_WEBHOOK_ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
