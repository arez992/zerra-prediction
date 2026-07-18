import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function getServerAdminUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie =
      cookieStore.get("firebaseSession")?.value;

    if (!sessionCookie) {
      console.error(
        "[SERVER_ADMIN_AUTH] Missing firebaseSession cookie"
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
      console.error(
        "[SERVER_ADMIN_AUTH] verifySessionCookie failed:",
        error
      );

      return null;
    }

    console.log(
      "[SERVER_ADMIN_AUTH] Session verified:",
      {
        uid: decoded.uid,
        email:
          decoded.email || null,
      }
    );

    let userDoc;

    try {
      userDoc = await adminDb
        .collection("users")
        .doc(decoded.uid)
        .get();
    } catch (error) {
      console.error(
        "[SERVER_ADMIN_AUTH] Firestore user lookup failed:",
        error
      );

      return null;
    }

    if (!userDoc.exists) {
      console.error(
        "[SERVER_ADMIN_AUTH] User document does not exist:",
        decoded.uid
      );

      return null;
    }

    const user = userDoc.data();

    console.log(
      "[SERVER_ADMIN_AUTH] User document loaded:",
      {
        uid: decoded.uid,
        role:
          user?.role ?? null,
      }
    );

    if (user?.role !== "admin") {
      console.error(
        "[SERVER_ADMIN_AUTH] User is not admin:",
        {
          uid: decoded.uid,
          role:
            user?.role ?? null,
        }
      );

      return null;
    }

    return {
      uid: decoded.uid,
      email:
        decoded.email || null,
      role: "admin",
    };
  } catch (error) {
    console.error(
      "[SERVER_ADMIN_AUTH] Unexpected failure:",
      error
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