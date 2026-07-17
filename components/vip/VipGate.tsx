"use client";

import Link from "next/link";
import { useVip } from "@/components/providers/VipProvider";

type VipGateProps = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackText?: string;
};

export default function VipGate({
  children,
  fallbackTitle = "Premium VIP Content",
  fallbackText = "Unlock VIP access to view full AI analysis, premium predictions, value bets, and advanced match insights.",
}: VipGateProps) {
  const {
    hasVipAccess,
    loading,
  } = useVip();

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-[#0B1220] p-8 text-center shadow-xl">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#D4AF37]" />

        <p className="mt-4 text-sm font-bold text-white/60">
          Checking VIP access...
        </p>
      </section>
    );
  }

  if (hasVipAccess) {
    return <>{children}</>;
  }

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#0B1220] p-6 text-center shadow-xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37]/10 text-3xl">
        🔒
      </div>

      <h3 className="mt-5 text-2xl font-black text-white">
        {fallbackTitle}
      </h3>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60">
        {fallbackText}
      </p>

      <Link
        href="/en/vip"
        className="mt-6 inline-block rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black"
      >
        Unlock VIP
      </Link>
    </section>
  );
}