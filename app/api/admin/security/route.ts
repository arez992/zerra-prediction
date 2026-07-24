import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

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
    const settingsSnap = await adminDb.collection("settings").doc("site").get();

    const users = usersSnap.docs.map((doc) => doc.data() as any);
    const payments = paymentsSnap.docs.map((doc) => doc.data() as any);
    const settings = settingsSnap.exists ? settingsSnap.data() : {};

    const adminUsers = users.filter((user) => user.role === "admin").length;
    const activeVipUsers = users.filter((user) => user.isVip === true).length;

    const failedPayments = payments.filter(
      (payment) =>
        payment.status === "failed" ||
        payment.paymentStatus === "failed" ||
        payment.paymentStatus === "expired"
    ).length;

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending"
    ).length;

    return NextResponse.json({
      success: true,
      security: {
        adminUsers,
        totalUsers: users.length,
        activeVipUsers,
        failedPayments,
        pendingPayments,
        maintenanceMode: settings?.maintenanceMode === true,
        registrationEnabled: settings?.registrationEnabled !== false,
        paymentsEnabled: settings?.paymentsEnabled !== false,
        aiEnabled: settings?.aiEnabled !== false,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
