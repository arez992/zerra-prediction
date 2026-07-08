import { NextResponse } from "next/server";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

async function countCollection(name: string) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.size;
}

export async function GET() {
  try {
    const vipUsersQuery = query(
      collection(db, "users"),
      where("isVip", "==", true)
    );

    const vipUsersSnap = await getDocs(vipUsersQuery);

    const [payments, predictions, aiCache] = await Promise.all([
      countCollection("payments"),
      countCollection("predictionHistory"),
      countCollection("aiAnalysisCache"),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        vipUsers: vipUsersSnap.size,
        payments,
        predictions,
        aiCache,
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