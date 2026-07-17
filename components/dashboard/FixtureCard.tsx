"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import type { PredictionResult } from "@/lib/ai/prediction";

type FixtureCardProps = {
  match: any;
  isVip: boolean;
  prediction?: PredictionResult | null;
  predictionLoading?: boolean;
  predictionError?: boolean;
};

function getStatusStyle(short: string) {
  if (["1H", "2H", "HT", "ET", "P"].includes(short)) {
    return "bg-red-500/20 text-red-400";
  }

  if (["FT", "AET", "PEN"].includes(short)) {
    return "bg-white/10 text-white/60";
  }

  return "bg-green-500/20 text-green-400";
}

function normalizePercent(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsedValue)));
}

export default function FixtureCard({
  match,
  isVip,
  prediction,
  predictionLoading = false,
  predictionError = false,
}: FixtureCardProps) {
  const params = useParams<{ locale?: string }>();

  const locale =
    typeof params?.locale === "string" && params.locale.length > 0
      ? params.locale
      : "en";

  const fixtureId = Number(match?.fixture?.id);

  const matchHref = Number.isFinite(fixtureId)
    ? `/${locale}/match/${fixtureId}`
    : `/${locale}/dashboard`;

  const statusShort = String(match?.fixture?.status?.short ?? "NS");
  const statusLong = String(
    match?.fixture?.status?.long ?? "Not Started"
  );

  const confidence = normalizePercent(prediction?.confidence);
  const homePercent = normalizePercent(prediction?.homeWin);
  const drawPercent = normalizePercent(prediction?.draw);
  const awayPercent = normalizePercent(prediction?.awayWin);

  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#101827]/90 p-5 shadow-xl transition hover:border-[#D4AF37]/60 hover:bg-[#141f33] md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {match?.league?.logo ? (
            <img
              src={match.league.logo}
              alt={match?.league?.name ?? "League"}
              className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-1"
              loading="lazy"
            />
          ) : null}

          <div className="min-w-0">
            <p className="truncate font-black text-[#D4AF37]">
              {match?.league?.name ?? "Unknown League"}
            </p>

            <p className="truncate text-xs text-white/45">
              {match?.league?.country ?? "Unknown Country"}
              {" • "}
              {statusLong}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-4 py-1 text-xs font-black ${getStatusStyle(
            statusShort
          )}`}
        >
          {statusShort}
        </span>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3 md:items-center">
        <div className="flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
          {match?.teams?.home?.logo ? (
            <img
              src={match.teams.home.logo}
              alt={match?.teams?.home?.name ?? "Home Team"}
              className="h-14 w-14 shrink-0 rounded-full bg-white object-contain p-1"
              loading="lazy"
            />
          ) : null}

          <p className="max-w-[160px] text-xl font-black leading-tight text-white md:max-w-none">
            {match?.teams?.home?.name ?? "Home Team"}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[180px] rounded-3xl bg-black/40 px-4 py-5 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-black leading-none text-[#D4AF37]">
              {match?.goals?.home ?? "-"}
            </span>

            <span className="text-3xl font-black leading-none text-[#D4AF37]">
              :
            </span>

            <span className="text-5xl font-black leading-none text-[#D4AF37]">
              {match?.goals?.away ?? "-"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:flex-row md:justify-end md:text-right">
          <p className="max-w-[160px] text-xl font-black leading-tight text-white md:max-w-none">
            {match?.teams?.away?.name ?? "Away Team"}
          </p>

          {match?.teams?.away?.logo ? (
            <img
              src={match.teams.away.logo}
              alt={match?.teams?.away?.name ?? "Away Team"}
              className="h-14 w-14 shrink-0 rounded-full bg-white object-contain p-1"
              loading="lazy"
            />
          ) : null}
        </div>
      </div>

      {isVip ? (
        predictionLoading ? (
          <PredictionLoading />
        ) : predictionError ? (
          <PredictionError />
        ) : prediction ? (
          <div className="mt-7 rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-white">
                🤖 AI Prediction Signal
              </p>

              <p className="font-black text-[#D4AF37]">
                {confidence}%
              </p>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <PredictionBar
                label="Home Win"
                value={homePercent}
              />

              <PredictionBar
                label="Draw"
                value={drawPercent}
              />

              <PredictionBar
                label="Away Win"
                value={awayPercent}
              />
            </div>
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-5 text-center">
            <p className="font-black text-[#D4AF37]">
              AI prediction is not available
            </p>

            <p className="mt-1 text-sm text-white/50">
              Complete team data may not be available yet.
            </p>
          </div>
        )
      ) : (
        <div className="mt-7 rounded-2xl border border-[#D4AF37]/20 bg-black/30 p-5 text-center">
          <p className="text-lg font-black text-[#D4AF37]">
            🔒 VIP Prediction
          </p>

          <p className="mt-1 text-sm text-white/50">
            Upgrade to VIP to unlock the AI prediction signal.
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Link
          href={matchHref}
          className="inline-flex items-center justify-center rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:bg-[#e4c45a]"
        >
          View Match Analysis
        </Link>
      </div>
    </article>
  );
}

function PredictionLoading() {
  return (
    <div className="mt-7 rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-5">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-44 rounded bg-white/10" />
        <div className="h-2 rounded bg-white/10" />
        <div className="h-2 rounded bg-white/10" />
        <div className="h-2 rounded bg-white/10" />
      </div>
    </div>
  );
}

function PredictionError() {
  return (
    <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-500/5 p-5 text-center">
      <p className="font-black text-red-300">
        Prediction could not be loaded
      </p>

      <p className="mt-1 text-sm text-white/50">
        Open the match page or try again shortly.
      </p>
    </div>
  );
}

function PredictionBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-white/60">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#D4AF37] transition-[width] duration-500"
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}