"use client";

import Link from "next/link";

import {
  useVip,
} from "@/components/providers/VipProvider";

type PredictionVipActionProps = {
  locale: string;
  fixtureId: string;
  mode?:
    | "button"
    | "notice";
};

export default function PredictionVipAction({
  locale,
  fixtureId,
  mode = "button",
}: PredictionVipActionProps) {
  const {
    isVip,
    loading,
  } =
    useVip();

  const matchUrl =
    `/${locale}/match/${fixtureId}`;

  const vipUrl =
    `/${locale}/vip`;

  if (
    mode === "notice"
  ) {
    if (
      loading
    ) {
      return (
        <div className="rounded-2xl bg-[#f3f7f4] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#839087]">
            Checking VIP Access
          </p>

          <p className="mt-3 text-sm leading-7 text-[#66756c]">
            Verifying your
            membership status...
          </p>
        </div>
      );
    }

    if (
      isVip
    ) {
      return (
        <div className="rounded-2xl bg-[#eaf7ef] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
            VIP Access Active
          </p>

          <p className="mt-3 text-sm leading-7 text-[#536158]">
            Your VIP membership
            is active. Premium
            prediction details
            and full match
            analysis are
            available to you.
          </p>

          <Link
            href={
              matchUrl
            }
            className="mt-4 inline-flex rounded-xl bg-[#139653] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#0d7a40]"
          >
            View Full Analysis
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-2xl bg-[#102117] p-5 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6be39e]">
          VIP Protected
        </p>

        <p className="mt-3 text-sm leading-7 text-white/65">
          Premium prediction
          details are available
          only to active VIP
          members.
        </p>

        <Link
          href={
            vipUrl
          }
          className="mt-4 inline-flex rounded-xl bg-[#f1c84b] px-4 py-2.5 text-xs font-black text-[#102117]"
        >
          Unlock VIP Access
        </Link>
      </div>
    );
  }

  if (
    loading
  ) {
    return (
      <span className="inline-flex rounded-xl bg-[#f3f7f4] px-6 py-3 text-sm font-black text-[#839087]">
        Checking VIP...
      </span>
    );
  }

  if (
    isVip
  ) {
    return (
      <Link
        href={
          matchUrl
        }
        className="inline-flex rounded-xl bg-[#139653] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0d7a40]"
      >
        View Full Analysis
      </Link>
    );
  }

  return (
    <Link
      href={
        vipUrl
      }
      className="inline-flex rounded-xl bg-[#139653] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0d7a40]"
    >
      Unlock VIP Prediction
    </Link>
  );
}