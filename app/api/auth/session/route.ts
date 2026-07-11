import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body?.idToken;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase ID token is required",
        },
        { status: 400 }
      );
    }

    await adminAuth.verifyIdToken(idToken);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN,
    });

    const cookieStore = await cookies();

    cookieStore.set("firebaseSession", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN / 1000,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Session creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to create session",
      },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.set("firebaseSession", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({
    success: true,
  });
}