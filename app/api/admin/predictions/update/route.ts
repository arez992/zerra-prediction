import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { predictionId, action } = await request.json();

    if (!predictionId || !action) {
      return NextResponse.json(
        { success: false, error: "predictionId and action are required" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("predictionHistory").doc(predictionId);

    if (action === "correct") {
      await ref.set(
        {
          correct: true,
          resultChecked: true,
          manuallyChecked: true,
          checkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    if (action === "wrong") {
      await ref.set(
        {
          correct: false,
          resultChecked: true,
          manuallyChecked: true,
          checkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    if (action === "pending") {
      await ref.set(
        {
          correct: null,
          resultChecked: false,
          manuallyChecked: false,
          checkedAt: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    if (action === "delete") {
      await ref.delete();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}