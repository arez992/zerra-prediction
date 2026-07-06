import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();

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
      const days = payment.days || 7;
      const expireAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      await setDoc(
        doc(db, "users", payment.uid),
        {
          email: payment.email,
          vip: true,
          vipStatus: "active",
          membership: payment.plan,
          vipExpireAt: expireAt,
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