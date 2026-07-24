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
  getPaymentStatus,
  timestampLikeToMillis,
  type CanonicalPaymentStatus,
} from "@/lib/paymentRecords";
import {
  getServerAdminUser,
} from "@/lib/serverAdminAuth";

const ALLOWED_MANUAL_STATUSES =
  new Set<CanonicalPaymentStatus>([
    "completed",
    "pending",
    "failed",
  ]);

export async function POST(
  request: Request
) {
  const admin =
    await getServerAdminUser();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Unauthorized admin access",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  try {
    const body =
      (await request.json()) as {
        paymentId?: unknown;
        status?: unknown;
      };

    const paymentId =
      typeof body.paymentId ===
        "string"
        ? body.paymentId.trim()
        : "";

    const status =
      typeof body.status ===
        "string"
        ? body.status
            .trim()
            .toLowerCase() as CanonicalPaymentStatus
        : "unknown";

    if (
      !paymentId ||
      !ALLOWED_MANUAL_STATUSES.has(
        status
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid paymentId and status (completed, pending, or failed) are required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const paymentRef =
      adminDb
        .collection(
          "payments"
        )
        .doc(
          paymentId
        );

    const result =
      await adminDb.runTransaction(
        async (
          transaction
        ) => {
          const paymentSnapshot =
            await transaction.get(
              paymentRef
            );

          if (
            !paymentSnapshot.exists
          ) {
            throw new Error(
              "Payment not found"
            );
          }

          const payment =
            paymentSnapshot.data() ||
            {};

          const previousStatus =
            getPaymentStatus(
              payment
            );

          const update:
            Record<
              string,
              unknown
            > = {
              status,
              manuallyUpdated:
                true,
              manualUpdatedBy:
                admin.email ||
                admin.uid,
              manualUpdatedAt:
                FieldValue.serverTimestamp(),
              updatedAt:
                FieldValue.serverTimestamp(),
            };

          if (
            status === "completed" &&
            previousStatus !==
              "completed"
          ) {
            update.completedAt =
              FieldValue.serverTimestamp();

            const plan =
              normalizePurchasablePlan(
                payment.plan
              );

            if (!plan) {
              throw new Error(
                "Payment has an invalid VIP plan"
              );
            }

            const uid =
              typeof payment.uid ===
                "string"
                ? payment.uid.trim()
                : "";

            if (!uid) {
              throw new Error(
                "Payment user is missing"
              );
            }

            const userRef =
              adminDb
                .collection(
                  "users"
                )
                .doc(
                  uid
                );

            const userSnapshot =
              await transaction.get(
                userRef
              );

            const user =
              userSnapshot.data() ||
              {};

            let expiresAt:
              Timestamp |
              null = null;

            if (
              plan !==
              "Lifetime"
            ) {
              const days =
                getPlanDays(
                  plan
                );

              if (!days) {
                throw new Error(
                  "Invalid plan duration"
                );
              }

              const currentExpiry =
                timestampLikeToMillis(
                  user.expiresAt ??
                    user.vipExpireAt
                );

              const baseTime =
                currentExpiry &&
                currentExpiry >
                  Date.now()
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
                  payment.email ||
                  user.email ||
                  null,
                isVip:
                  true,
                plan,
                expiresAt,
                vipExpireAt:
                  FieldValue.delete(),
                vipActivatedAt:
                  FieldValue.serverTimestamp(),
                lastPaymentId:
                  paymentId,
                totalPayments:
                  FieldValue.increment(
                    1
                  ),
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge:
                  true,
              }
            );
          }

          transaction.set(
            paymentRef,
            update,
            {
              merge:
                true,
            }
          );

          return {
            previousStatus,
            status,
            plan:
              payment.plan ||
              null,
            price:
              payment.price ||
              null,
            email:
              payment.email ||
              null,
            uid:
              payment.uid ||
              null,
          };
        }
      );

    await adminDb
      .collection(
        "activityLogs"
      )
      .add({
        type:
          "payment",
        actor:
          admin.email ||
          admin.uid,
        message:
          `Payment ${paymentId} marked as ${status}`,
        targetId:
          paymentId,
        metadata: {
          previousStatus:
            result.previousStatus,
          status:
            result.status,
          plan:
            result.plan,
          price:
            result.price,
          email:
            result.email,
          uid:
            result.uid,
        },
        createdAt:
          new Date()
            .toISOString(),
      });

    return NextResponse.json(
      {
        success: true,
        paymentId,
        previousStatus:
          result.previousStatus,
        status,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update payment";

    const status =
      message ===
      "Payment not found"
        ? 404
        : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          message,
      },
      {
        status,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
