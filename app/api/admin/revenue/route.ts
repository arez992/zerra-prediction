import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
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
      (payment) => payment.status === "completed"
    );

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending"
    );

    const lifetimeRevenue = completedPayments.reduce(
      (total, payment) => total + Number(payment.price || 0),
      0
    );

    const activeVipUsers = users.filter((user) => user.isVip === true).length;

    const planCounts = completedPayments.reduce(
      (acc, payment) => {
        const plan = payment.plan || "Unknown";
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      revenue: {
        lifetimeRevenue,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        totalPayments: payments.length,
        activeVipUsers,
        totalUsers: users.length,
        planCounts,
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