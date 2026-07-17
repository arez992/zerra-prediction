export type VipPlan =
  | "Free"
  | "Monthly"
  | "Quarterly"
  | "Lifetime";

export type VipExpiry =
  | string
  | Date
  | {
      toDate?: () => Date;
      seconds?: number;
    }
  | null;

export type VipStatus = {
  isVip: boolean;
  isAdmin: boolean;
  plan: VipPlan;
  expiresAt: VipExpiry;
};

function getExpiryTime(
  expiresAt: VipExpiry
): number | null {
  if (!expiresAt) {
    return null;
  }

  if (expiresAt instanceof Date) {
    const time = expiresAt.getTime();

    return Number.isFinite(time)
      ? time
      : null;
  }

  if (typeof expiresAt === "string") {
    const time = new Date(
      expiresAt
    ).getTime();

    return Number.isFinite(time)
      ? time
      : null;
  }

  if (
    typeof expiresAt === "object" &&
    typeof expiresAt.toDate === "function"
  ) {
    const time = expiresAt
      .toDate()
      .getTime();

    return Number.isFinite(time)
      ? time
      : null;
  }

  if (
    typeof expiresAt === "object" &&
    typeof expiresAt.seconds === "number"
  ) {
    return expiresAt.seconds * 1000;
  }

  return null;
}

export function isVipActive(
  status?: VipStatus | null
): boolean {
  if (!status) {
    return false;
  }

  /*
   * Admin always has access to VIP content.
   */
  if (status.isAdmin) {
    return true;
  }

  if (!status.isVip) {
    return false;
  }

  if (status.plan === "Lifetime") {
    return true;
  }

  const expiry = getExpiryTime(
    status.expiresAt
  );

  /*
   * Backward compatibility:
   * Older VIP users may only have isVip=true
   * without plan or expiresAt.
   */
  if (expiry === null) {
    return true;
  }

  return expiry > Date.now();
}

export function getFreePredictionLimit() {
  return 3;
}

export function canViewVipContent(
  status?: VipStatus | null
) {
  return isVipActive(status);
}