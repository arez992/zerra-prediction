"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserVipStatus } from "@/lib/firebaseVip";
import type { VipStatus } from "@/lib/vip";
import { isVipActive } from "@/lib/vip";

type VipContextValue = {
  status: VipStatus;
  isVip: boolean;
  loading: boolean;
};

const defaultStatus: VipStatus = {
  isVip: false,
  plan: "Free",
  expiresAt: null,
};

const VipContext = createContext<VipContextValue>({
  status: defaultStatus,
  isVip: false,
  loading: true,
});

export function VipProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VipStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);

        if (!user) {
          setStatus(defaultStatus);
          return;
        }

        const vipStatus = await getUserVipStatus(user.uid);
        setStatus(vipStatus);
      } catch (error) {
        console.error("Failed to load VIP provider:", error);
        setStatus(defaultStatus);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <VipContext.Provider
      value={{
        status,
        isVip: isVipActive(status),
        loading,
      }}
    >
      {children}
    </VipContext.Provider>
  );
}

export function useVip() {
  return useContext(VipContext);
}