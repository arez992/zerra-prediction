import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

function sortObject(obj: any): any {
  return Object.keys(obj)
    .sort()
    .reduce((result: any, key) => {
      result[key] =
        obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])
          ? sortObject(obj[key])
          : obj[key];
      return result;
    }, {});
}

function verifyNowPaymentsSignature(body: any, signature: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;

  if (!secret || !signature) return false;

  const sortedBody = sortObject(body);

  const hmac = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(sortedBody))
    .digest("hex");

  return hmac === signature;
}

function getPlanDays(plan: string) {
  if (plan === "Monthly") return 30;
  if (plan === "Quarterly") return 90;
  if (plan === "Lifetime") return 36500;
  return 30;
}

function isPaidStatus(status: string) {
  return ["finished", "confirmed"].includes(status);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get("x-nowpayments-sig");

    if (!verifyNowPaymentsSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const orderId = body.order_id;
    const paymentStatus = body.payment_status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const paymentRef = doc(db, "payments", orderId);
    const paymentSnap = await getDoc(paymentRef);

    await setDoc(
      paymentRef,
      {
        nowpayments: body,
        paymentStatus,
        nowpaymentsUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (!paymentSnap.exists()) {
      return NextResponse.json({ received: true });
    }

    const payment = paymentSnap.data();

    if (payment.status === "completed") {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    if (isPaidStatus(paymentStatus)) {
      const plan = payment.plan || "Monthly";
      const days = payment.days || getPlanDays(plan);

      const vipExpireAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      await setDoc(
        doc(db, "users", payment.uid),
        {
          email: payment.email,
          isVip: true,
          plan,
          vipExpireAt,
          vipActivatedAt: serverTimestamp(),
          lastPaymentId: orderId,
          totalPayments: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(paymentRef, {
        status: "completed",
        completedAt: serverTimestamp(),
        confirmedAt: serverTimestamp(),
        paidAmount: body.actually_paid || body.pay_amount || null,
        payCurrency: body.pay_currency || null,
        paymentId: body.payment_id || null,
        updatedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}