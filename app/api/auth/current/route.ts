import { NextResponse } from "next/server";
import { getServerAdminUser } from "@/lib/serverAdminAuth";

export async function GET() {
  try {
    const admin = await getServerAdminUser();

    return NextResponse.json({
      success: true,
      user: admin
        ? {
            uid: admin.uid,
            email: admin.email,
            role: admin.role,
            isAdmin: admin.role === "admin",
          }
        : null,
    });
  } catch {
    return NextResponse.json({
      success: true,
      user: null,
    });
  }
}