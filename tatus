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

export async function POST(request: Request) {
  const { token } = await request.json();

  const response = NextResponse.json({ success: true });

  response.cookies.set("firebaseToken", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("firebaseToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}