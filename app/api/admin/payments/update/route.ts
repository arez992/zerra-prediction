import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function getPlanDays(plan: string) {
  if (plan === "Monthly") return 30;
  if (plan === "Quarterly") return 90;
  if (plan === "Lifetime") return 36500;
  return 30;
}

export async function POST(request: Request) {
  try {
    const { paymentId, status } = await request.json();

    if (!paymentId || !status) {
      return NextResponse.json(
        { success: false, error: "paymentId and status are required" },
        { status: 400 }
      );
    }

    const paymentRef = adminDb.collection("payments").doc(paymentId);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const payment = paymentSnap.data() as any;
    const now = new Date().toISOString();

    await paymentRef.set(
      {
        status,
        manuallyUpdated: true,
        updatedAt: now,
      },
      { merge: true }
    );

    if (status === "completed") {
      const days = payment.days || getPlanDays(payment.plan);
      const vipExpireAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      await adminDb.collection("users").doc(payment.uid).set(
        {
          email: payment.email,
          isVip: true,
          plan: payment.plan,
          vipExpireAt,
          lastPaymentId: paymentId,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    await adminDb.collection("activityLogs").add({
      type: "payment",
      actor: "admin",
      message: `Payment ${paymentId} marked as ${status}`,
      targetId: paymentId,
      metadata: {
        status,
        plan: payment.plan || null,
        price: payment.price || null,
        email: payment.email || null,
        uid: payment.uid || null,
      },
      createdAt: now,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}