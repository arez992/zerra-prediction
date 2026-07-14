export type VipPlan =
  | "Free"
  | "Monthly"
  | "Quarterly"
  | "Lifetime";

export type VipStatus = {
  isVip: boolean;
  plan: VipPlan;
  expiresAt: string | null;
};

export function isVipActive(
  status?: VipStatus | null
): boolean {
  if (!status?.isVip) {
    return false;
  }

  if (status.plan === "Lifetime") {
    return true;
  }

  if (!status.expiresAt) {
    return false;
  }

  const expiry =
    new Date(status.expiresAt).getTime();

  return (
    Number.isFinite(expiry) &&
    expiry > Date.now()
  );
}

export function getFreePredictionLimit() {
  return 3;
}

export function canViewVipContent(
  status?: VipStatus | null
) {
  return isVipActive(status);
}