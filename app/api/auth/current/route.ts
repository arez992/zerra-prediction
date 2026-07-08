import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseToken")?.value;

    if (!token) {
      return NextResponse.json({
        success: true,
        user: null,
      });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const user = userDoc.exists ? userDoc.data() : null;

    return NextResponse.json({
      success: true,
      user: {
        uid: decoded.uid,
        email: decoded.email || user?.email || "",
        role: user?.role || "user",
        isAdmin: user?.role === "admin",
        isVip: user?.isVip === true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      user: null,
      error: error.message,
    });
  }
}