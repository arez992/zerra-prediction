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

const AGENT_OPTIONS = [
  "all",
  "ceo",
  "seo",
  "prediction",
  "marketing",
  "finance",
  "cto",
  "risk",
] as const;

const OUTCOME_OPTIONS = [
  "all",
  "success",
  "neutral",
  "failure",
] as const;

export default function LearningHistory() {
  const [records, setRecords] =
    useState<LearningRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [searchInput, setSearchInput] =
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

        if (outcome !== "all") {
          params.set(
            "outcome",
            outcome
          );
        }

        if (search.trim()) {
          params.set(
            "strategy",
            search.trim()
          );
        }

        const response =
          await fetch(
            `/api/admin/zaos/learning/history?${params.toString()}`,
            {
              cache: "no-store",
              credentials: "include",
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

  function applySearch() {
    setOffset(0);
    setSearch(
      searchInput.trim()
    );
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setAgent("all");
    setOutcome("all");
    setOffset(0);
  }

  const currentPage =
    Math.floor(offset / limit) + 1;

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
            Search, filter, and review verified learning
            outcomes across every ZAOS director.
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

      <div className="mt-8 grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
        <div className="flex rounded-2xl border border-zinc-800 bg-[#151c2e] p-2">
          <input
            value={searchInput}
            onChange={(event) =>
              setSearchInput(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                applySearch();
              }
            }}
            placeholder="Search strategy..."
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/30"
          />

          <button
            type="button"
            onClick={applySearch}
            className="rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-black text-black"
          >
            Search
          </button>
        </div>

        <select
          value={agent}
          onChange={(event) => {
            setAgent(
              event.target.value
            );
            setOffset(0);
          }}
          className="rounded-2xl border border-zinc-800 bg-[#151c2e] px-4 py-3 text-sm text-white outline-none"
        >
          {AGENT_OPTIONS.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option === "all"
                  ? "All Agents"
                  : option.toUpperCase()}
              </option>
            )
          )}
        </select>

        <select
          value={outcome}
          onChange={(event) => {
            setOutcome(
              event.target.value
            );
            setOffset(0);
          }}
          className="rounded-2xl border border-zinc-800 bg-[#151c2e] px-4 py-3 text-sm text-white outline-none"
        >
          {OUTCOME_OPTIONS.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option === "all"
                  ? "All Outcomes"
                  : formatStrategy(option)}
              </option>
            )
          )}
        </select>

        <button
          type="button"
          onClick={clearFilters}
          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-white/60 transition hover:border-white/25 hover:text-white"
        >
          Clear
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
          label="Current Page"
          value={
            loading
              ? "—"
              : String(currentPage)
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

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-[#151c2e]">
        {loading && (
          <div className="space-y-3 p-6">
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
          <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-zinc-800 bg-[#101624]">
                  <tr>
                    <TableHead>
                      Strategy
                    </TableHead>
                    <TableHead>
                      Agent
                    </TableHead>
                    <TableHead>
                      Outcome
                    </TableHead>
                    <TableHead>
                      Score
                    </TableHead>
                    <TableHead>
                      Completed
                    </TableHead>
                  </tr>
                </thead>

                <tbody>
                  {records.map(
                    (record) => (
                      <tr
                        key={record.id}
                        className="border-b border-zinc-800/80 last:border-b-0"
                      >
                        <TableCell>
                          <p className="font-semibold text-white">
                            {formatStrategy(
                              record.recommendationType
                            )}
                          </p>

                          <p className="mt-1 max-w-md truncate text-xs text-white/35">
                            {record.notes?.[0] ||
                              "No notes"}
                          </p>
                        </TableCell>

                        <TableCell>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/70">
                            {record.agent.toUpperCase()}
                          </span>
                        </TableCell>

                        <TableCell>
                          <OutcomeBadge
                            outcome={
                              record.outcome
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <span
                            className={`text-lg font-black ${scoreClass(
                              record.score
                            )}`}
                          >
                            {record.score}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-white/55">
                            {formatDate(
                              record.completedAt
                            )}
                          </span>
                        </TableCell>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

        {!loading &&
          !error &&
          records.length === 0 && (
            <div className="p-8 text-center text-sm text-white/40">
              No learning records matched the current filters.
            </div>
          )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/40">
          Showing {records.length} of{" "}
          {pagination.total} record(s)
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={
              loading ||
              offset === 0
            }
            onClick={() =>
              setOffset(
                Math.max(
                  0,
                  offset - limit
                )
              )
            }
            className="rounded-full border border-white/10 px-5 py-2 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>

          <button
            type="button"
            disabled={
              loading ||
              !pagination.hasMore
            }
            onClick={() =>
              setOffset(
                offset + limit
              )
            }
            className="rounded-full border border-[#D4AF37] px-5 py-2 text-sm font-bold text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
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

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/35">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-5 py-4 align-middle">
      {children}
    </td>
  );
}

function OutcomeBadge({
  outcome,
}: {
  outcome: LearningOutcome;
}) {
  const classes =
    outcome === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : outcome === "neutral"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.15em] ${classes}`}
    >
      {outcome}
    </span>
  );
}

function scoreClass(
  score: number
) {
  if (score >= 80) {
    return "text-emerald-400";
  }

  if (score >= 50) {
    return "text-amber-400";
  }

  return "text-red-400";
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

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No date";
  }

  return date.toLocaleString(
    "en",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}