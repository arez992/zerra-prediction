import { cookies } from "next/headers";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

export type ServerVipUser = {
  uid: string;
  email: string | null;
  role: "admin" | "user";
  isAdmin: boolean;
  isVip: boolean;
  plan:
    | "Free"
    | "Weekly"
    | "Monthly"
    | "Quarterly";
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

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function normalizePlan(
  value: unknown
): ServerVipUser["plan"] {
  if (
    value === "Weekly" ||
    value === "Monthly" ||
    value === "Quarterly"
  ) {
    return value;
  }

  return "Free";
}

function isActiveVip(
  isVip: unknown,
  expiresAt: string | null
): boolean {
  if (isVip !== true || !expiresAt) {
    return false;
  }

  const expiresAtMs =
    new Date(expiresAt).getTime();

  return (
    Number.isFinite(expiresAtMs) &&
    expiresAtMs > Date.now()
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

    const expiresAt =
      serializeDate(user.expiresAt);

    const isVip =
      isAdmin ||
      isActiveVip(
        user.isVip,
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
        ? normalizePlan(user.plan)
        : isVip
        ? normalizePlan(user.plan)
        : "Free",
      expiresAt:
        isAdmin
          ? expiresAt
          : isVip
          ? expiresAt
          : null,
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