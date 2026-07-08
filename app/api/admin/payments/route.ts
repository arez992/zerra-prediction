import { NextResponse } from "next/server";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const paymentsQuery = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(paymentsQuery);

    const payments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}