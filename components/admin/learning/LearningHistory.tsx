"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type LearningOutcome =
  | "success"
  | "neutral"
  | "failure";

type LearningRecord = {
  id: string;
  agent: string;
  recommendationType: string;
  outcome: LearningOutcome;
  score: number;
  createdAt: string;
  completedAt: string;
  notes: string[];
  metadata: Record<string, unknown>;
};

type HistoryResponse = {
  success: boolean;
  history: LearningRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  error?: string;
};

export default function LearningHistory() {
  const [records, setRecords] =
    useState<LearningRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [agent, setAgent] =
    useState("all");

  const [outcome, setOutcome] =
    useState("all");

  const [offset, setOffset] =
    useState(0);

  const limit = 20;

  const [pagination, setPagination] =
    useState({
      total: 0,
      hasMore: false,
    });

  const loadHistory =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams();

        params.set(
          "limit",
          String(limit)
        );

        params.set(
          "offset",
          String(offset)
        );

        if (agent !== "all") {
          params.set(
            "agent",
            agent
          );
        }

        if (
          outcome !== "all"
        ) {
          params.set(
            "outcome",
            outcome
          );
        }

        if (
          search.trim()
        ) {
          params.set(
            "strategy",
            search.trim()
          );
        }

        const response =
          await fetch(
            `/api/admin/zaos/learning/history?${params.toString()}`,
            {
              cache:
                "no-store",
              credentials:
                "include",
            }
          );

        const data =
          (await response.json()) as HistoryResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Unable to load learning history."
          );
        }

        setRecords(
          data.history
        );

        setPagination({
          total:
            data.pagination.total,
          hasMore:
            data.pagination.hasMore,
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unknown error."
        );
      } finally {
        setLoading(false);
      }
    }, [
      search,
      outcome,
      agent,
      offset,
    ]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#0f1422] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            ZAOS Learning
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Learning History
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/50">
            Review historical learning records before
            adding the full table, filters, and details drawer.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadHistory()
          }
          disabled={loading}
          className="rounded-full border border-[#D4AF37] px-5 py-2 text-sm font-bold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : "Refresh"}
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Loaded Records"
          value={
            loading
              ? "—"
              : String(
                  records.length
                )
          }
        />

        <SummaryCard
          label="Total Matches"
          value={
            loading
              ? "—"
              : String(
                  pagination.total
                )
          }
        />

        <SummaryCard
          label="Current Offset"
          value={
            loading
              ? "—"
              : String(offset)
          }
        />

        <SummaryCard
          label="More Available"
          value={
            loading
              ? "—"
              : pagination.hasMore
                ? "Yes"
                : "No"
          }
        />
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-zinc-800/50"
                />
              )
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading &&
          !error && (
            <div>
              <p className="text-sm text-white/60">
                Loaded{" "}
                <span className="font-bold text-white">
                  {records.length}
                </span>{" "}
                learning record(s).
              </p>

              {records.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {records.map(
                    (record) => (
                      <div
                        key={
                          record.id
                        }
                        className="rounded-xl border border-zinc-800 bg-[#101624] p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-white">
                              {formatStrategy(
                                record.recommendationType
                              )}
                            </p>

                            <p className="mt-1 text-xs text-white/40">
                              {record.agent.toUpperCase()} ·{" "}
                              {record.outcome}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-xl font-black text-[#D4AF37]">
                              {record.score}
                            </p>

                            <p className="text-xs text-white/40">
                              learning score
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-white/40">
                  No learning records matched the current request.
                </div>
              )}
            </div>
          )}
      </div>

      <div className="hidden">
        <input
          value={search}
          onChange={(event) => {
            setSearch(
              event.target.value
            );
            setOffset(0);
          }}
        />

        <select
          value={agent}
          onChange={(event) => {
            setAgent(
              event.target.value
            );
            setOffset(0);
          }}
        />

        <select
          value={outcome}
          onChange={(event) => {
            setOutcome(
              event.target.value
            );
            setOffset(0);
          }}
        />
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">
        {label}
      </p>

      <p className="mt-4 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function formatStrategy(
  value: string
) {
  return value
    .split("-")
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}