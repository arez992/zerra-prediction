import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function getServerAdminUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseToken")?.value;

    if (!token) return null;

    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) return null;

    const user = userDoc.data();

    if (user?.role !== "admin") return null;

    return {
      uid: decoded.uid,
      email: decoded.email,
      role: user.role,
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