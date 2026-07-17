"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import { getUserVipStatus } from "@/lib/firebaseVip";

import type {
  VipStatus,
} from "@/lib/vip";

import {
  isVipActive,
} from "@/lib/vip";

type VipContextValue = {
  status: VipStatus;
  isVip: boolean;
  isAdmin: boolean;
  hasVipAccess: boolean;
  loading: boolean;
};

const defaultStatus: VipStatus = {
  isVip: false,
  isAdmin: false,
  plan: "Free",
  expiresAt: null,
};

const VipContext =
  createContext<VipContextValue>({
    status: defaultStatus,
    isVip: false,
    isAdmin: false,
    hasVipAccess: false,
    loading: true,
  });

export function VipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] =
    useState<VipStatus>(
      defaultStatus
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          setLoading(true);

          try {
            if (!user) {
              if (active) {
                setStatus(
                  defaultStatus
                );
              }

              return;
            }

            const vipStatus =
              await getUserVipStatus(
                user.uid
              );

            if (active) {
              setStatus(vipStatus);
            }
          } catch (error) {
            console.error(
              "Failed to load VIP provider:",
              error
            );

            if (active) {
              setStatus(
                defaultStatus
              );
            }
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        }
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const hasVipAccess =
    useMemo(
      () => isVipActive(status),
      [status]
    );

  const value =
    useMemo<VipContextValue>(
      () => ({
        status,
        isVip: hasVipAccess,
        isAdmin:
          status.isAdmin,
        hasVipAccess,
        loading,
      }),
      [
        status,
        hasVipAccess,
        loading,
      ]
    );

  return (
    <VipContext.Provider
      value={value}
    >
      {children}
    </VipContext.Provider>
  );
}

export function useVip() {
  return useContext(VipContext);
}