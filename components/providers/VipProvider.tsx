"use client";

import { createContext, useContext, useMemo } from "react";
import type { VipStatus } from "@/lib/vip";
import { isVipActive } from "@/lib/vip";

type VipContextValue = {
  status: VipStatus;
  isVip: boolean;
};

const defaultStatus: VipStatus = {
  isVip: false,
  plan: "Free",
  expiresAt: null,
};

const VipContext = createContext<VipContextValue>({
  status: defaultStatus,
  isVip: false,
});

export function VipProvider({
  children,
  status = defaultStatus,
}: {
  children: React.ReactNode;
  status?: VipStatus;
}) {
  const value = useMemo(
    () => ({
      status,
      isVip: isVipActive(status),
    }),
    [status]
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  return useContext(VipContext);
}