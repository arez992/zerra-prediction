import { NextResponse } from "next/server";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const cacheQuery = query(collection(db, "aiAnalysisCache"), limit(100));
    const snapshot = await getDocs(cacheQuery);

    const cacheItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      cacheItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}