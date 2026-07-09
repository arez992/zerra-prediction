import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const snap = await adminDb
      .collection("activityLogs")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const logs = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    await adminDb.collection("activityLogs").add({
      type: body.type || "system",
      message: body.message || "Activity recorded",
      actor: body.actor || "admin",
      targetId: body.targetId || null,
      metadata: body.metadata || {},
      createdAt: new Date().toISOString(),
    });

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