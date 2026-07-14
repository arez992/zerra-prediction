import {
  NextResponse,
} from "next/server";
import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  createNowPaymentsInvoice,
  createOrderId,
  getPlanDays,
  getPlanPrice,
  getVipBillingSettings,
  normalizeLocale,
  normalizePurchasablePlan,
  requireBillingUser,
} from "@/lib/nowPaymentsBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "authentication required"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("required")
  ) {
    return 400;
  }

  if (
    normalized.includes("disabled")
  ) {
    return 503;
  }

  return 500;
}

export async function POST(
  request: Request
) {
  let orderId: string | null = null;

  try {
    const user =
      await requireBillingUser();

    const body =
      (await request.json()) as {
        plan?: unknown;
        locale?: unknown;
      };

    const plan =
      normalizePurchasablePlan(
        body.plan
      );

    if (!plan) {
      throw new Error(
        "Invalid VIP plan"
      );
    }

    const locale =
      normalizeLocale(body.locale);

    const settings =
      await getVipBillingSettings();

    if (!settings.vipEnabled) {
      throw new Error(
        "VIP subscriptions are disabled"
      );
    }

    if (
      !settings.paymentsEnabled
    ) {
      throw new Error(
        "Payments are disabled"
      );
    }

    const price =
      getPlanPrice(
        settings,
        plan
      );

    orderId = createOrderId();

    const paymentRef =
      adminDb
        .collection("payments")
        .doc(orderId);

    await paymentRef.set({
      orderId,
      uid: user.uid,
      email: user.email,
      plan,
      price,
      priceCurrency: "usd",
      payCurrency: "usdttrc20",
      days: getPlanDays(plan),
      status: "pending",
      paymentStatus: "waiting",
      locale,
      createdAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    const invoice =
      await createNowPaymentsInvoice({
        orderId,
        plan,
        price,
        email: user.email,
        locale,
      });

    await paymentRef.set(
      {
        invoiceId:
          invoice.id || null,
        invoiceUrl:
          invoice.invoice_url ||
          null,
        nowpaymentsInvoice:
          invoice,
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    return NextResponse.json(
      {
        success: true,
        orderId,
        ...invoice,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment request failed";

    if (orderId) {
      await adminDb
        .collection("payments")
        .doc(orderId)
        .set(
          {
            status: "failed",
            failureReason: message,
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        )
        .catch(() => undefined);
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(message),
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}