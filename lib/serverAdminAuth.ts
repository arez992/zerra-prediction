import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function getServerAdminUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("firebaseSession")?.value;

    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    const userDoc = await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!userDoc.exists) return null;

    const user = userDoc.data();

    if (user?.role !== "admin") return null;

    return {
      uid: decoded.uid,
      email: decoded.email || null,
      role: "admin",
    };
  } catch (error) {
    console.error("Server admin auth failed:", error);
    return null;
  }
}

export async function requireServerAdmin() {
  const admin = await getServerAdminUser();

  if (!admin) {
    throw new Error("Unauthorized admin access");
  }

  return admin;
}