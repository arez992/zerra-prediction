import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type NotificationType = "success" | "warning" | "error" | "info";

function makeNotification(
  type: NotificationType,
  title: string,
  message: string,
  href?: string
) {
  return {
    type,
    title,
    message,
    href: href || null,
  };
}

export async function GET() {
  try {
    const settingsSnap = await adminDb.collection("settings").doc("site").get();
    const paymentsSnap = await adminDb.collection("payments").get();

    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const payments = paymentsSnap.docs.map((doc) => doc.data() as any);

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending"
    ).length;

    const failedPayments = payments.filter(
      (payment) =>
        payment.status === "failed" ||
        payment.paymentStatus === "failed" ||
        payment.paymentStatus === "expired"
    ).length;

    const notifications = [];

    if (pendingPayments > 0) {
      notifications.push(
        makeNotification(
          "warning",
          `${pendingPayments} Pending Payments`,
          "Some payments are waiting for confirmation.",
          "/en/admin/payments"
        )
      );
    }

    if (failedPayments > 0) {
      notifications.push(
        makeNotification(
          "error",
          `${failedPayments} Failed Payments`,
          "Some payments failed or expired.",
          "/en/admin/payments"
        )
      );
    }

    if (settings?.maintenanceMode === true) {
      notifications.push(
        makeNotification(
          "warning",
          "Maintenance Mode Enabled",
          "The public website is currently under maintenance.",
          "/en/admin/settings"
        )
      );
    }

    if (settings?.aiEnabled === false) {
      notifications.push(
        makeNotification(
          "warning",
          "AI Disabled",
          "AI features are currently disabled.",
          "/en/admin/settings"
        )
      );
    }

    if (settings?.paymentsEnabled === false) {
      notifications.push(
        makeNotification(
          "error",
          "Payments Disabled",
          "Users cannot buy VIP while payments are disabled.",
          "/en/admin/settings"
        )
      );
    }

    if (settings?.vipEnabled === false) {
      notifications.push(
        makeNotification(
          "warning",
          "VIP Disabled",
          "VIP features are currently disabled.",
          "/en/admin/settings"
        )
      );
    }

    if (notifications.length === 0) {
      notifications.push(
        makeNotification(
          "success",
          "System Healthy",
          "No important issues found.",
          "/en/admin/health"
        )
      );
    }

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        notifications: [
          makeNotification(
            "error",
            "Notification Check Failed",
            error.message || "Unable to load system notifications."
          ),
        ],
      },
      { status: 500 }
    );
  }
}