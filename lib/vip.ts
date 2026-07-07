export type VipStatus = {
  isVip: boolean;
  plan: "Free" | "Weekly" | "Monthly" | "Quarterly";
  expiresAt: string | null;
};

export function isVipActive(status?: VipStatus | null) {
  if (!status?.isVip || !status.expiresAt) return false;

  const expiry = new Date(status.expiresAt).getTime();
  return expiry > Date.now();
}

export function getFreePredictionLimit() {
  return 3;
}

export function canViewVipContent(status?: VipStatus | null) {
  return isVipActive(status);
}