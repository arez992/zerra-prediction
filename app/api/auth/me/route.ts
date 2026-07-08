import { NextResponse } from "next/server";
import { getServerAdminUser } from "@/lib/serverAdminAuth";

export async function GET() {
  try {
    const admin = await getServerAdminUser();

    if (!admin) {
      return NextResponse.json({
        success: true,
        user: null,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: admin.uid,
        email: admin.email,
        role: admin.role,
        isAdmin: admin.role === "admin",
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      user: null,
    });
  }
}