import { NextResponse } from "next/server";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { uid, role, isVip, plan, vipExpireAt } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { success: false, error: "Missing user uid" },
        { status: 400 }
      );
    }

    await updateDoc(doc(db, "users", uid), {
      role: role || "user",
      isVip: Boolean(isVip),
      plan: plan || "Free",
      vipExpireAt: vipExpireAt || null,
      updatedAt: serverTimestamp(),
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