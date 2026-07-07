import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { VipStatus } from "@/lib/vip";

export async function getUserVipStatus(uid: string): Promise<VipStatus> {
  try {
    const userRef = doc(db, "users", uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return {
        isVip: false,
        plan: "Free",
        expiresAt: null,
      };
    }

    const data = snapshot.data();

    return {
      isVip: Boolean(data.isVip),
      plan: data.plan || "Free",
      expiresAt: data.expiresAt || null,
    };
  } catch (error) {
    console.error("Failed to load VIP status:", error);

    return {
      isVip: false,
      plan: "Free",
      expiresAt: null,
    };
  }
}