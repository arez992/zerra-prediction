import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  getPaymentAmount,
  getPaymentStatus,
} from "@/lib/paymentRecords";

import { getServerAdminUser } from "@/lib/serverAdminAuth";
function toDate(value: any) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

function isToday(date: Date | null) {
  if (!date) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isThisMonth(date: Date | null) {
  if (!date) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

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
    const paymentsSnap = await adminDb.collection("payments").get();
    const usersSnap = await adminDb.collection("users").get();

    const payments = paymentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

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

    const lifetimeRevenue = completedPayments.reduce(
      (total, payment) => total + getPaymentAmount(payment),
      0
    );

    const todayRevenue = completedPayments
      .filter((payment) => isToday(toDate(payment.completedAt || payment.createdAt)))
      .reduce((total, payment) => total + getPaymentAmount(payment), 0);

    const thisMonthRevenue = completedPayments
      .filter((payment) =>
        isThisMonth(toDate(payment.completedAt || payment.createdAt))
      )
      .reduce((total, payment) => total + getPaymentAmount(payment), 0);

    const activeVipUsers = users.filter((user) => user.isVip === true).length;

    const processedPayments =
      completedPayments.length +
      failedPayments.length;

    const successRate =
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

    const planCounts = completedPayments.reduce((acc, payment) => {
      const plan = payment.plan || "Unknown";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const planRevenue = completedPayments.reduce((acc, payment) => {
      const plan = payment.plan || "Unknown";
      acc[plan] = (acc[plan] || 0) + Number(payment.price || 0);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      revenue: {
        todayRevenue,
        thisMonthRevenue,
        lifetimeRevenue,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        failedPayments: failedPayments.length,
        totalPayments: payments.length,
        successRate,
        activeVipUsers,
        totalUsers: users.length,
        planCounts,
        planRevenue,
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
