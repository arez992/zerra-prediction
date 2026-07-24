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
    const settingsSnap = await adminDb.collection("settings").doc("site").get();

    const paymentsSnap = await adminDb.collection("payments").get();
    const usersSnap = await adminDb.collection("users").get();
    const cacheSnap = await adminDb.collection("aiCache").get();
    const predictionsSnap = await adminDb.collection("predictionHistory").get();

    const settings = settingsSnap.exists ? settingsSnap.data() : {};

    const payments = paymentsSnap.docs.map((doc) => doc.data());

    const pendingPayments = payments.filter(
      (payment: any) => payment.status === "pending"
    ).length;

    const completedPayments = payments.filter(
      (payment: any) => payment.status === "completed"
    ).length;

    const failedPayments = payments.filter(
      (payment: any) => payment.status === "failed"
    ).length;

    const activeVipUsers = usersSnap.docs.filter(
      (doc) => doc.data()?.isVip === true
    ).length;

    return NextResponse.json({
      success: true,
      health: {
        firebase: "online",
        maintenanceMode: settings?.maintenanceMode === true,
        registrationEnabled: settings?.registrationEnabled !== false,
        paymentsEnabled: settings?.paymentsEnabled !== false,
        vipEnabled: settings?.vipEnabled !== false,
        aiEnabled: settings?.aiEnabled !== false,

        totalUsers: usersSnap.size,
        activeVipUsers,

        totalPayments: paymentsSnap.size,
        pendingPayments,
        completedPayments,
        failedPayments,

        cacheItems: cacheSnap.size,
        predictionHistory: predictionsSnap.size,

        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        health: {
          firebase: "offline",
        },
        error: error.message,
      },
      { status: 500 }
    );
  }
}
