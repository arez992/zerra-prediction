import { cookies } from "next/headers";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

export async function getServerAdminUser() {
  try {
    const cookieStore = await cookies();

    const sessionCookie =
      cookieStore.get("firebaseSession")?.value;

    if (!sessionCookie) {
      console.error(
        "[ADMIN_AUTH] NO_COOKIE"
      );

      return null;
    }

    let decoded;

    try {
      decoded =
        await adminAuth.verifySessionCookie(
          sessionCookie,
          true
        );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `[ADMIN_AUTH] SESSION_ERROR ${message}`
      );

      return null;
    }

    let userDoc;

    try {
      userDoc = await adminDb
        .collection("users")
        .doc(decoded.uid)
        .get();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(
              (
                error as {
                  code?: unknown;
                }
              ).code
            )
          : "unknown";

      console.error(
        `[FS_ERROR] ${code} ${message}`
      );

      return null;
    }

    if (!userDoc.exists) {
      console.error(
        "[ADMIN_AUTH] USER_NOT_FOUND"
      );

      return null;
    }

    const user = userDoc.data();

    if (user?.role !== "admin") {
      console.error(
        `[ADMIN_AUTH] WRONG_ROLE ${
          user?.role ?? "none"
        }`
      );

      return null;
    }

    return {
      uid: decoded.uid,
      email:
        decoded.email || null,
      role: "admin" as const,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[ADMIN_AUTH] UNKNOWN_ERROR ${message}`
    );

    return null;
  }
}

export async function requireServerAdmin() {
  const admin =
    await getServerAdminUser();

  if (!admin) {
    throw new Error(
      "Unauthorized admin access"
    );
  }

  return admin;
}