import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const usersSnap = await adminDb.collection("users").get();
    const paymentsSnap = await adminDb.collection("payments").get();

    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const payments = paymentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const totalUsers = users.length;
    const vipUsers = users.filter((user) => user.isVip === true).length;
    const freeUsers = totalUsers - vipUsers;

    const completedPayments = payments.filter(
      (payment) => payment.status === "completed"
    );

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending"
    );

    const failedPayments = payments.filter(
      (payment) =>
        payment.status === "failed" ||
        payment.paymentStatus === "failed" ||
        payment.paymentStatus === "expired"
    );

    const totalPayments = payments.length;

    const vipConversionRate =
      totalUsers === 0 ? 0 : Number(((vipUsers / totalUsers) * 100).toFixed(1));

    const paymentSuccessRate =
      totalPayments === 0
        ? 0
        : Number(((completedPayments.length / totalPayments) * 100).toFixed(1));

    const revenueByPlan = completedPayments.reduce((acc, payment) => {
      const plan = payment.plan || "Unknown";
      acc[plan] = (acc[plan] || 0) + Number(payment.price || 0);
      return acc;
    }, {} as Record<string, number>);

    const salesByPlan = completedPayments.reduce((acc, payment) => {
      const plan = payment.plan || "Unknown";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      analytics: {
        totalUsers,
        vipUsers,
        freeUsers,
        vipConversionRate,

        totalPayments,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        failedPayments: failedPayments.length,
        paymentSuccessRate,

        revenueByPlan,
        salesByPlan,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}