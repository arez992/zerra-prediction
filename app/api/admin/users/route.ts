import { NextResponse } from "next/server";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const usersQuery = query(collection(db, "users"), limit(100));
    const snapshot = await getDocs(usersQuery);

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}