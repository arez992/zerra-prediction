import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  getPaymentAmount,
  getPaymentStatus,
} from "@/lib/paymentRecords";

import { getServerAdminUser } from "@/lib/serverAdminAuth";
export async function GET() {

  const admin = await getServerAdminUser();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized admin access",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }


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
      (payment) =>
        getPaymentStatus(
          payment
        ) === "completed"
    );

    const pendingPayments = payments.filter(
      (payment) =>
        getPaymentStatus(
          payment
        ) === "pending"
    );

    const failedPayments = payments.filter(
      (payment) =>
        getPaymentStatus(
          payment
        ) === "failed"
    );

    const totalPayments = payments.length;

    const vipConversionRate =
      totalUsers === 0 ? 0 : Number(((vipUsers / totalUsers) * 100).toFixed(1));

    const processedPayments =
      completedPayments.length +
      failedPayments.length;

    const paymentSuccessRate =
      processedPayments === 0
        ? 0
        : Number(
            (
              (
                completedPayments.length /
                processedPayments
              ) *
              100
            ).toFixed(1)
          );

    const revenueByPlan = completedPayments.reduce((acc, payment) => {
      const plan = payment.plan || "Unknown";
      acc[plan] = (acc[plan] || 0) + getPaymentAmount(payment);
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
