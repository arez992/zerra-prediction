import { cookies } from "next/headers";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";
import type {
  VipPlan,
} from "@/lib/vip";

export type ServerVipUser = {
  uid: string;
  email: string | null;
  role: "admin" | "user";
  isAdmin: boolean;
  isVip: boolean;
  plan: VipPlan;
  expiresAt: string | null;
};

type TimestampLike = {
  toDate: () => Date;
};

function serializeDate(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate ===
      "function"
  ) {
    return (value as TimestampLike)
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string"
    ? value
    : null;
}

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

function isActiveVip(
  isVip: unknown,
  plan: VipPlan,
  expiresAt: string | null
): boolean {
  if (isVip !== true) {
    return false;
  }

  if (plan === "Lifetime") {
    return true;
  }

  if (!expiresAt) {
    return false;
  }

  const expiry =
    new Date(expiresAt).getTime();

  return (
    Number.isFinite(expiry) &&
    expiry > Date.now()
  );
}

export async function getServerVipUser(): Promise<ServerVipUser | null> {
  try {
    const cookieStore =
      await cookies();

    const sessionCookie =
      cookieStore.get(
        "firebaseSession"
      )?.value;

    if (!sessionCookie) {
      return null;
    }

    const decoded =
      await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );

    const userDocument =
      await adminDb
        .collection("users")
        .doc(decoded.uid)
        .get();

    if (!userDocument.exists) {
      return null;
    }

    const user =
      userDocument.data() || {};

    const isAdmin =
      user.role === "admin";

    const plan =
      normalizePlan(user.plan);

    const expiresAt =
      serializeDate(user.expiresAt);

    const isVip =
      isAdmin ||
      isActiveVip(
        user.isVip,
        plan,
        expiresAt
      );

    return {
      uid: decoded.uid,
      email: decoded.email || null,
      role: isAdmin
        ? "admin"
        : "user",
      isAdmin,
      isVip,
      plan: isAdmin
        ? plan
        : isVip
        ? plan
        : "Free",
      expiresAt:
        plan === "Lifetime"
          ? null
          : expiresAt,
    };
  } catch (error) {
    console.error(
      "Server VIP auth failed:",
      error
    );

    return null;
  }
}

export async function requireServerVipOrAdmin(): Promise<ServerVipUser> {
  const user =
    await getServerVipUser();

  if (!user) {
    throw new Error(
      "Authentication required"
    );
  }

  if (
    !user.isAdmin &&
    !user.isVip
  ) {
    throw new Error(
      "Active VIP access required"
    );
  }

  return user;
}