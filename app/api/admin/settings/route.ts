import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const defaultSettings = {
  siteName: "ZERRA Prediction",
  heroTitle: "Smarter football predictions powered by AI.",
  heroSubtitle:
    "AI-powered football predictions, VIP picks, confidence scores, and premium match analysis.",

  weeklyPrice: 9,
  monthlyPrice: 19,
  quarterlyPrice: 49,
  currency: "USDT",

  maintenanceMode: false,
  registrationEnabled: true,
  vipEnabled: true,
  paymentsEnabled: true,
  aiEnabled: true,
};

export async function GET() {
  try {
    const ref = adminDb.collection("settings").doc("site");
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set(defaultSettings, { merge: true });

      return NextResponse.json({
        success: true,
        settings: defaultSettings,
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...defaultSettings,
        ...snap.data(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();

    await adminDb.collection("settings").doc("site").set(
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}