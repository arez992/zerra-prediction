"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type LearningStats = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  neutralRuns: number;
  averageScore: number;
  successRate: number;
  lastCompletedAt: string | null;
};

type LearningTypeStats = {
  recommendationType: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  neutralRuns: number;
  averageScore: number;
  successRate: number;
  lastCompletedAt: string | null;
};

type LearningSummary = {
  generatedAt: string;
  totalRecords: number;
  overall: LearningStats;
  byAgent: Record<string, LearningStats>;
  byRecommendationType: LearningTypeStats[];
  bestPerformingStrategy: LearningTypeStats | null;
  worstPerformingStrategy: LearningTypeStats | null;
};

type SummaryResponse = {
  success: boolean;
  summary?: LearningSummary;
  error?: string;
};

export default function LearningDashboard() {
  const [summary, setSummary] =
    useState<LearningSummary | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadSummary =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/admin/zaos/learning/summary",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as SummaryResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.summary
        ) {
          throw new Error(
            data.error ||
              "Unable to load ZAOS learning summary."
          );
        }

        setSummary(data.summary);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load ZAOS learning summary."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const failureRate =
    useMemo(() => {
      if (
        !summary ||
        summary.overall.totalRuns === 0
      ) {
        return 0;
      }

      return Number(
        (
          (
            summary.overall.failedRuns /
            summary.overall.totalRuns
          ) * 100
        ).toFixed(2)
      );
    }, [summary]);

  const neutralRate =
    useMemo(() => {
      if (
        !summary ||
        summary.overall.totalRuns === 0
      ) {
        return 0;
      }

      return Number(
        (
          (
            summary.overall.neutralRuns /
            summary.overall.totalRuns
          ) * 100
        ).toFixed(2)
      );
    }, [summary]);

  const topAgent =
    useMemo(() => {
      if (!summary) {
        return null;
      }

      return Object.entries(
        summary.byAgent || {}
      ).sort(([, first], [, second]) => {
        if (
          second.successRate !==
          first.successRate
        ) {
          return (
            second.successRate -
            first.successRate
          );
        }

        return (
          second.averageScore -
          first.averageScore
        );
      })[0] ?? null;
    }, [summary]);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#0f1422] p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-500">
            ZAOS Learning
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            Learning Dashboard
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Monitor how ZAOS learns from completed executions,
            business outcomes, and historical recommendations.
          </p>
        </div>

        <button
          className="rounded-full border border-yellow-500 px-6 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={loading}
          onClick={() => void loadSummary()}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Learning"
          value={
            loading
              ? null
              : summary?.totalRecords ?? 0
          }
        />

        <MetricCard
          title="Success Rate"
          value={
            loading
              ? null
              : `${summary?.overall.successRate ?? 0}%`
          }
        />

        <MetricCard
          title="Failure Rate"
          value={
            loading
              ? null
              : `${failureRate}%`
          }
        />

        <MetricCard
          title="Neutral Rate"
          value={
            loading
              ? null
              : `${neutralRate}%`
          }
        />

        <MetricCard
          title="Average Score"
          value={
            loading
              ? null
              : summary?.overall.averageScore ?? 0
          }
        />

        <MetricCard
          title="Best Strategy"
          value={
            loading
              ? null
              : formatStrategy(
                  summary?.bestPerformingStrategy
                    ?.recommendationType
                )
          }
          detail={
            summary?.bestPerformingStrategy
              ? `${summary.bestPerformingStrategy.averageScore} score`
              : "No data"
          }
        />

        <MetricCard
          title="Worst Strategy"
          value={
            loading
              ? null
              : formatStrategy(
                  summary?.worstPerformingStrategy
                    ?.recommendationType
                )
          }
          detail={
            summary?.worstPerformingStrategy
              ? `${summary.worstPerformingStrategy.averageScore} score`
              : "No data"
          }
        />

        <MetricCard
          title="Top Agent"
          value={
            loading
              ? null
              : topAgent?.[0]
                ? topAgent[0].toUpperCase()
                : "No data"
          }
          detail={
            topAgent
              ? `${topAgent[1].averageScore} average score`
              : undefined
          }
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
          <h3 className="text-lg font-semibold text-white">
            Strategy Performance
          </h3>

          <div className="mt-5 space-y-4">
            {loading ? (
              <LoadingRows />
            ) : summary &&
              summary.byRecommendationType.length > 0 ? (
              summary.byRecommendationType.map(
                (strategy) => (
                  <div
                    key={
                      strategy.recommendationType
                    }
                    className="rounded-xl border border-zinc-800 bg-[#101624] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">
                          {formatStrategy(
                            strategy.recommendationType
                          )}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {strategy.totalRuns} run(s)
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-yellow-400">
                          {strategy.averageScore}
                        </p>

                        <p className="text-xs text-zinc-500">
                          average score
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
          <h3 className="text-lg font-semibold text-white">
            Latest Learning
          </h3>

          <div className="mt-5 rounded-xl border border-zinc-800 bg-[#101624] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Last Completed
            </p>

            <p className="mt-3 text-lg font-semibold text-white">
              {loading
                ? "Loading..."
                : formatDate(
                    summary?.overall.lastCompletedAt
                  )}
            </p>

            <p className="mt-5 text-sm text-zinc-400">
              Summary generated:
            </p>

            <p className="mt-1 text-sm text-white">
              {loading
                ? "—"
                : formatDate(
                    summary?.generatedAt
                  )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number | null;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
        {title}
      </p>

      {value === null ? (
        <div className="mt-5 h-10 w-24 animate-pulse rounded bg-zinc-700/40" />
      ) : (
        <p className="mt-5 break-words text-2xl font-bold text-white">
          {value}
        </p>
      )}

      {detail && (
        <p className="mt-3 text-xs text-zinc-500">
          {detail}
        </p>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-xl bg-zinc-800/50"
        />
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
      No learning records are available yet.
    </div>
  );
}

function formatStrategy(
  value?: string | null
) {
  if (!value) {
    return "No data";
  }

  return value
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "No data";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No data";
  }

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}