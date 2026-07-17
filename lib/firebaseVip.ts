import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type {
  VipPlan,
  VipStatus,
} from "@/lib/vip";

function normalizePlan(
  value: unknown
): VipPlan {
  if (
    value === "Monthly" ||
    value === "Quarterly" ||
    value === "Lifetime"
  ) {
    return value;
  }

  return "Free";
}

export async function getUserVipStatus(
  uid: string
): Promise<VipStatus> {
  try {
    const userRef = doc(
      db,
      "users",
      uid
    );

    const snapshot =
      await getDoc(userRef);

    if (!snapshot.exists()) {
      return {
        isVip: false,
        plan: "Free",
        expiresAt: null,
      };
    }

    const data =
      snapshot.data();

    return {
      isVip:
        data.isVip === true,
      plan: normalizePlan(
        data.plan
      ),
      expiresAt:
        data.expiresAt ?? null,
    };
  } catch (error) {
    console.error(
      "Failed to load VIP status:",
      error
    );

    return {
      isVip: false,
      plan: "Free",
      expiresAt: null,
    };
  }
}