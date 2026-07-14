import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const defaultSettings = {
  siteName: "ZERRA Prediction",
  heroTitle:
    "Smarter football predictions powered by AI.",
  heroSubtitle:
    "AI-powered football predictions, VIP picks, confidence scores, and premium match analysis.",

  monthlyPrice: 14.99,
  quarterlyPrice: 39.99,
  lifetimePrice: 129,
  currency: "USDT",

  maintenanceMode: false,
  registrationEnabled: true,
  vipEnabled: true,
  paymentsEnabled: true,
  aiEnabled: true,
};

export async function GET() {
  try {
    const ref =
      adminDb
        .collection("settings")
        .doc("site");

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      await ref.set(
        defaultSettings,
        {
          merge: true,
        }
      );

      return NextResponse.json({
        success: true,
        settings:
          defaultSettings,
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...defaultSettings,
        ...snapshot.data(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load settings";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    const settings =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const now =
      new Date().toISOString();

    const ref =
      adminDb
        .collection("settings")
        .doc("site");

    const oldSnapshot =
      await ref.get();

    const oldSettings =
      oldSnapshot.exists
        ? oldSnapshot.data()
        : null;

    await ref.set(
      {
        ...settings,
        updatedAt: now,
        updatedBy:
          admin.email ||
          admin.uid,
      },
      {
        merge: true,
      }
    );

    await adminDb
      .collection(
        "activityLogs"
      )
      .add({
        type: "settings",
        actor:
          admin.email ||
          admin.uid,
        message:
          "Admin updated site settings",
        targetId:
          "settings/site",
        metadata: {
          before: oldSettings,
          after: settings,
        },
        createdAt: now,
      });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update settings";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message ===
          "Unauthorized admin access"
            ? 401
            : 500,
      }
    );
  }
}