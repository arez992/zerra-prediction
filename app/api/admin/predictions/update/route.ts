import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function getActionMessage(predictionId: string, action: string) {
  if (action === "correct") return `Prediction ${predictionId} marked as Correct`;
  if (action === "wrong") return `Prediction ${predictionId} marked as Wrong`;
  if (action === "pending") return `Prediction ${predictionId} reset to Pending`;
  if (action === "delete") return `Prediction ${predictionId} deleted`;
  return `Prediction ${predictionId} updated`;
}

export async function POST(request: Request) {
  try {
    const { predictionId, action } = await request.json();

    if (!predictionId || !action) {
      return NextResponse.json(
        { success: false, error: "predictionId and action are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const ref = adminDb.collection("predictionHistory").doc(predictionId);
    const snap = await ref.get();
    const prediction = snap.exists ? snap.data() : null;

    if (action === "correct") {
      await ref.set(
        {
          correct: true,
          resultChecked: true,
          manuallyChecked: true,
          checkedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    } else if (action === "wrong") {
      await ref.set(
        {
          correct: false,
          resultChecked: true,
          manuallyChecked: true,
          checkedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    } else if (action === "pending") {
      await ref.set(
        {
          correct: null,
          resultChecked: false,
          manuallyChecked: false,
          checkedAt: null,
          updatedAt: now,
        },
        { merge: true }
      );
    } else if (action === "delete") {
      await ref.delete();
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    await adminDb.collection("activityLogs").add({
      type: "prediction",
      actor: "admin",
      message: getActionMessage(predictionId, action),
      targetId: predictionId,
      metadata: {
        action,
        fixtureId: prediction?.fixtureId || null,
        pick: prediction?.prediction?.valueBet || prediction?.pick || null,
        confidence:
          prediction?.prediction?.confidence ?? prediction?.confidence ?? null,
      },
      createdAt: now,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}