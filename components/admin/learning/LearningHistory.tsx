"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import LearningHistoryTable from "@/components/admin/learning/LearningHistoryTable";
import LearningHistoryDrawer from "@/components/admin/learning/LearningHistoryDrawer";
import type {
  LearningHistoryRecord,
} from "@/components/admin/learning/types";

type HistoryResponse = {
  success: boolean;
  history: LearningHistoryRecord[];
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
    useState<LearningHistoryRecord[]>([]);

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

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState<
    LearningHistoryRecord | null
  >(null);

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
                  : formatOption(option)}
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

      <div className="mt-8">
        <LearningHistoryTable
          records={records}
          loading={loading}
          error={error}
          onView={(record) =>
            setSelectedRecord(record)
          }
        />
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

      <LearningHistoryDrawer
        record={selectedRecord}
        onClose={() =>
          setSelectedRecord(null)
        }
      />
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

function formatOption(value: string) {
  return value
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}