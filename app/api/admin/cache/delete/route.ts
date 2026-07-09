import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { cacheId } = await request.json();

    if (!cacheId) {
      return NextResponse.json(
        {
          success: false,
          error: "cacheId is required",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const ref = adminDb.collection("aiCache").doc(cacheId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Cache not found",
        },
        { status: 404 }
      );
    }

    const cacheData = snap.data();

    await ref.delete();

    await adminDb.collection("activityLogs").add({
      type: "cache",
      actor: "admin",
      message: `AI cache deleted: ${cacheId}`,
      targetId: cacheId,
      metadata: {
        bestPick: cacheData?.analysis?.bestPick || null,
        risk: cacheData?.analysis?.riskNote || null,
      },
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
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