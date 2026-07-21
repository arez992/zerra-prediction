"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PredictionActions from "@/components/admin/PredictionActions";
import PredictionGenerator from "@/components/admin/PredictionGenerator";

type PredictionItem = {
  id: string;
  fixtureId?: string | null;
  status?: string | null;

  competition?: {
    name?: string | null;
    country?: string | null;
  };

  teams?: {
    home?: {
      name?: string | null;
    };
    away?: {
      name?: string | null;
    };
  };

  publicPrediction?: {
    overview?: string;
    risk?: string;
    riskScore?: number;
    keyInsights?: string[];
    teaser?: string;
  };

  vipPrediction?: {
    finalPrediction?: string;
    confidence?: number;
    exactScore?: string;
    valueBet?: string;
    reasoning?: string[];
  };

  prediction?: {
    confidence?: number;
    valueBet?: string;
  };

  model?: {
    version?: string;
    dataVersion?: string;
    generatedAt?: string;
  };

  sourceData?: {
    fetchedFromApiFootball?: boolean;
    fetchedAt?: string | null;
    availability?: {
      fixture?: boolean;
      statistics?: boolean;
      events?: boolean;
      lineups?: boolean;
      headToHead?: boolean;
      injuries?: boolean;
      odds?: boolean;
    } | null;
  };

  correct?: boolean | null;
  result?: string | null;
  resultChecked?: boolean;
  rejectionReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PredictionsResponse = {
  success: boolean;
  predictions?: PredictionItem[];
  count?: number;
  error?: string;
};

export default function AdminPredictionsPage() {
  const params = useParams<{
    locale: string;
  }>();

  const locale = params?.locale || "en";

  const [predictions, setPredictions] =
    useState<PredictionItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadPredictions = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/admin/predictions?limit=200",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const raw = await response.text();

        let data: PredictionsResponse;

        try {
          data = raw
            ? (JSON.parse(
                raw
              ) as PredictionsResponse)
            : {
                success: false,
                error:
                  "The server returned an empty response.",
              };
        } catch {
          throw new Error(
            `Invalid server response: ${raw.slice(
              0,
              200
            )}`
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Unable to load predictions."
          );
        }

        setPredictions(
          Array.isArray(
            data.predictions
          )
            ? data.predictions
            : []
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load predictions."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPredictions();
  }, [loadPredictions]);

  const summary = useMemo(() => {
    return predictions.reduce(
      (result, item) => {
        const status =
          item.status || "draft";

        result.total += 1;

        if (status === "draft") {
          result.draft += 1;
        } else if (
          status === "approved"
        ) {
          result.approved += 1;
        } else if (
          status === "published"
        ) {
          result.published += 1;
        } else if (
          status === "rejected"
        ) {
          result.rejected += 1;
        }

        return result;
      },
      {
        total: 0,
        draft: 0,
        approved: 0,
        published: 0,
        rejected: 0,
      }
    );
  }, [predictions]);

  return (
    <main className="min-h-screen bg-[#07101E] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#D4AF37]/20 bg-gradient-to-br from-[#101827] to-[#0A1220] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href={`/${locale}/admin`}
                className="text-sm font-black text-[#D4AF37]"
              >
                ← Back to Admin
              </Link>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                Prediction Operations
              </p>

              <h1 className="mt-3 text-4xl font-black md:text-6xl">
                Prediction Operations
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 md:text-base">
                Generate, review, approve, publish, reject,
                and track prediction results from one
                operational workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadPredictions(true)
              }
              disabled={refreshing}
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh Predictions"}
            </button>
          </div>
        </header>

        <PredictionGenerator
          onGenerated={() =>
            loadPredictions(true)
          }
        />


        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total"
            value={summary.total}
          />

          <SummaryCard
            label="Draft"
            value={summary.draft}
          />

          <SummaryCard
            label="Approved"
            value={summary.approved}
          />

          <SummaryCard
            label="Published"
            value={summary.published}
          />

          <SummaryCard
            label="Rejected"
            value={summary.rejected}
          />
        </section>

        {error && (
          <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8 space-y-6">
          {loading ? (
            <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/50">
              Loading prediction history...
            </div>
          ) : predictions.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/50">
              No prediction history found.
            </div>
          ) : (
            predictions.map((item) => (
              <PredictionCard
                key={item.id}
                item={item}
                onChanged={() =>
                  loadPredictions(true)
                }
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function PredictionCard({
  item,
  onChanged,
}: {
  item: PredictionItem;
  onChanged: () => void | Promise<void>;
}) {
  const homeTeam =
    item.teams?.home?.name ||
    "Home team";

  const awayTeam =
    item.teams?.away?.name ||
    "Away team";

  const confidence =
    item.vipPrediction?.confidence ??
    item.prediction?.confidence ??
    0;

  const pick =
    item.vipPrediction?.valueBet ||
    item.prediction?.valueBet ||
    "No value signal";

  const availability =
    item.sourceData?.availability;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827] shadow-xl">
      <div className="border-b border-white/10 p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={
                  item.status ||
                  "draft"
                }
              />

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase text-white/50">
                Fixture{" "}
                {item.fixtureId ||
                  item.id}
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase text-white/50">
                {item.model?.version ||
                  "Model unknown"}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-black md:text-4xl">
              {homeTeam} vs{" "}
              {awayTeam}
            </h2>

            <p className="mt-3 text-sm text-white/45">
              {item.competition?.name ||
                "Competition unavailable"}
              {item.competition
                ?.country
                ? ` · ${item.competition.country}`
                : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="Confidence"
              value={`${confidence}%`}
            />

            <Metric
              label="Risk"
              value={
                item.publicPrediction
                  ?.risk ||
                "—"
              }
            />

            <Metric
              label="Risk Score"
              value={
                item.publicPrediction
                  ?.riskScore ??
                "—"
              }
            />

            <Metric
              label="Result"
              value={
                item.correct === true
                  ? "Correct"
                  : item.correct === false
                    ? "Wrong"
                    : item.resultChecked
                      ? "Checked"
                      : "Pending"
              }
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-2">
        <PreviewPanel
          eyebrow="Public Layer"
          title="Public Prediction"
          description={
            item.publicPrediction
              ?.overview ||
            "No public prediction overview is available."
          }
          items={
            item.publicPrediction
              ?.keyInsights ||
            []
          }
          footer={
            item.publicPrediction
              ?.teaser ||
            null
          }
        />

        <PreviewPanel
          eyebrow="VIP Layer"
          title="Protected VIP Prediction"
          description={`Final prediction: ${
            item.vipPrediction
              ?.finalPrediction ||
            "—"
          }`}
          items={[
            `Value signal: ${pick}`,

            `Exact score: ${
              item.vipPrediction
                ?.exactScore ||
              "—"
            }`,

            ...(
              item.vipPrediction
                ?.reasoning ||
              []
            ).slice(
              0,
              3
            ),
          ]}
          footer="This section must never be exposed by the public API."
          premium
        />
      </div>

      <div className="grid gap-6 border-t border-white/10 p-6 md:p-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Source Data
          </p>

          <p className="mt-3 text-sm leading-7 text-white/55">
            API-Football:{" "}
            <strong className="text-white">
              {item.sourceData
                ?.fetchedFromApiFootball
                ? "Yes"
                : "No"}
            </strong>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [
                "Fixture",
                availability
                  ?.fixture,
              ],

              [
                "Statistics",
                availability
                  ?.statistics,
              ],

              [
                "Events",
                availability
                  ?.events,
              ],

              [
                "Lineups",
                availability
                  ?.lineups,
              ],

              [
                "H2H",
                availability
                  ?.headToHead,
              ],

              [
                "Injuries",
                availability
                  ?.injuries,
              ],

              [
                "Odds",
                availability
                  ?.odds,
              ],
            ].map(
              ([
                label,
                available,
              ]) => (
                <AvailabilityBadge
                  key={String(
                    label
                  )}
                  label={String(
                    label
                  )}
                  available={
                    available ===
                    true
                  }
                />
              )
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Record Details
          </p>

          <dl className="mt-4 grid gap-3 text-sm">
            <Row
              label="Model"
              value={
                item.model
                  ?.version ||
                "—"
              }
            />

            <Row
              label="Data version"
              value={
                item.model
                  ?.dataVersion ||
                "—"
              }
            />

            <Row
              label="Final result"
              value={
                item.result ||
                "—"
              }
            />

            <Row
              label="Updated"
              value={
                formatDate(
                  item.updatedAt
                ) ||
                "—"
              }
            />
          </dl>

          {item.rejectionReason && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
              Rejection reason:{" "}
              {
                item.rejectionReason
              }
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 p-6 md:p-8">
        <PredictionActions
          predictionId={
            item.id
          }
          status={
            item.status ||
            "draft"
          }
          onChanged={
            onChanged
          }
        />
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#101827] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const className =
    normalized ===
    "published"
      ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
      : normalized ===
          "approved"
        ? "border-green-400/30 bg-green-400/10 text-green-200"
        : normalized ===
            "rejected"
          ? "border-red-400/30 bg-red-400/10 text-red-200"
          : "border-amber-400/30 bg-amber-400/10 text-amber-200";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${className}`}
    >
      {status}
    </span>
  );
}

function PreviewPanel({
  eyebrow,
  title,
  description,
  items,
  footer,
  premium = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  footer: string | null;
  premium?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        premium
          ? "border-[#D4AF37]/25 bg-[#D4AF37]/5"
          : "border-white/10 bg-black/20"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
        {eyebrow}
      </p>

      <h3 className="mt-3 text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-white/55">
        {description}
      </p>

      {items.length >
        0 && (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-white/65">
          {items.map(
            (
              item,
              index
            ) => (
              <li
                key={`${item}-${index}`}
                className="rounded-2xl border border-white/5 bg-black/15 px-4 py-3"
              >
                {item}
              </li>
            )
          )}
        </ul>
      )}

      {footer && (
        <p className="mt-4 text-xs leading-6 text-white/35">
          {footer}
        </p>
      )}
    </div>
  );
}

function AvailabilityBadge({
  label,
  available,
}: {
  label: string;
  available: boolean;
}) {
  return (
    <span
      className={`rounded-xl border px-3 py-2 text-center text-xs font-black ${
        available
          ? "border-green-400/20 bg-green-400/10 text-green-200"
          : "border-white/10 bg-white/5 text-white/30"
      }`}
    >
      {label}
    </span>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
      <dt className="text-white/35">
        {label}
      </dt>

      <dd className="break-all text-right font-bold text-white/75">
        {value}
      </dd>
    </div>
  );
}

function formatDate(
  value?: string | null
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}