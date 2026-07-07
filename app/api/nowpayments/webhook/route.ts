import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
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
  return 7;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get("x-nowpayments-sig");

    if (!verifyNowPaymentsSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const orderId = body.order_id;
    const status = body.payment_status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const paymentRef = doc(db, "payments", orderId);
    const paymentSnap = await getDoc(paymentRef);

    await setDoc(
      paymentRef,
      {
        nowpayments: body,
        paymentStatus: status,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (!paymentSnap.exists()) {
      return NextResponse.json({ received: true });
    }

    const payment = paymentSnap.data();

    if (status === "finished" || status === "confirmed") {
      const plan = payment.plan || "Weekly";
      const days = payment.days || getPlanDays(plan);

      const expiresAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      await setDoc(
        doc(db, "users", payment.uid),
        {
          email: payment.email,
          isVip: true,
          plan,
          expiresAt,

          vip: true,
          vipStatus: "active",
          membership: plan,
          vipExpireAt: expiresAt,

          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(paymentRef, {
        status: "completed",
        completedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}