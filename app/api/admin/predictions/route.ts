import { NextResponse } from "next/server";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const predictionsQuery = query(
      collection(db, "predictionHistory"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(predictionsQuery);

    const predictions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      predictions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}