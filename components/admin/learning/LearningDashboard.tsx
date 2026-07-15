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
    useMemo(
      () =>
        calculateRate(
          summary?.overall.failedRuns ?? 0,
          summary?.overall.totalRuns ?? 0
        ),
      [summary]
    );

  const neutralRate =
    useMemo(
      () =>
        calculateRate(
          summary?.overall.neutralRuns ?? 0,
          summary?.overall.totalRuns ?? 0
        ),
      [summary]
    );

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

  const strategyGroups =
    useMemo(() => {
      const strategies = [
        ...(summary?.byRecommendationType || []),
      ].sort(compareBestFirst);

      if (strategies.length <= 1) {
        return {
          top: strategies,
          bottom: [],
        };
      }

      const topCount =
        Math.min(
          5,
          Math.ceil(
            strategies.length / 2
          )
        );

      const top =
        strategies.slice(
          0,
          topCount
        );

      const topIds =
        new Set(
          top.map(
            (item) =>
              item.recommendationType
          )
        );

      const bottom = [
        ...strategies,
      ]
        .sort(compareWorstFirst)
        .filter(
          (item) =>
            !topIds.has(
              item.recommendationType
            )
        )
        .slice(0, 5);

      return {
        top,
        bottom,
      };
    }, [summary]);

  const latestStrategy =
    useMemo(() => {
      const strategies =
        summary?.byRecommendationType || [];

      return [...strategies]
        .filter(
          (item) =>
            item.lastCompletedAt
        )
        .sort(
          (first, second) =>
            dateValue(
              second.lastCompletedAt
            ) -
            dateValue(
              first.lastCompletedAt
            )
        )[0] ?? null;
    }, [summary]);

  const executiveGuidance =
    useMemo(
      () =>
        buildExecutiveGuidance(
          summary,
          failureRate
        ),
      [summary, failureRate]
    );

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
            Monitor verified learning outcomes,
            strategy quality, and the actions that
            need executive attention.
          </p>
        </div>

        <button
          className="rounded-full border border-yellow-500 px-6 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={loading}
          onClick={() =>
            void loadSummary()
          }
        >
          {loading
            ? "Loading..."
            : "Refresh"}
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
                  summary
                    ?.bestPerformingStrategy
                    ?.recommendationType
                )
          }
          detail={
            summary
              ?.bestPerformingStrategy
              ? `${summary.bestPerformingStrategy.averageScore} score`
              : "No data"
          }
        />

        <MetricCard
          title="Needs Review"
          value={
            loading
              ? null
              : formatStrategy(
                  summary
                    ?.worstPerformingStrategy
                    ?.recommendationType
                )
          }
          detail={
            summary
              ?.worstPerformingStrategy
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

      <div className="mt-8 rounded-2xl border border-[#D4AF37]/25 bg-[#151c2e] p-6">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
          Executive Guidance
        </p>

        <h3 className="mt-3 text-xl font-bold text-white">
          {executiveGuidance.title}
        </h3>

        <p className="mt-2 max-w-4xl text-sm leading-7 text-zinc-400">
          {executiveGuidance.description}
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <StrategyList
          title="Top Strategies"
          subtitle="Best-performing strategies without duplicate entries."
          strategies={
            strategyGroups.top
          }
          loading={loading}
          emptyMessage="No strategy data is available yet."
        />

        <StrategyList
          title="Strategies Needing Review"
          subtitle="Lowest-performing unique strategies that require attention."
          strategies={
            strategyGroups.bottom
          }
          loading={loading}
          emptyMessage={
            strategyGroups.top.length > 0
              ? "More strategy data is required before a separate review list can be produced."
              : "No strategy data is available yet."
          }
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <OutcomeDistribution
          successfulRuns={
            summary?.overall
              .successfulRuns ?? 0
          }
          neutralRuns={
            summary?.overall
              .neutralRuns ?? 0
          }
          failedRuns={
            summary?.overall
              .failedRuns ?? 0
          }
          totalRuns={
            summary?.overall.totalRuns ?? 0
          }
          loading={loading}
        />

        <LatestLearningCard
          strategy={latestStrategy}
          agent={
            topAgent?.[0] ?? null
          }
          generatedAt={
            summary?.generatedAt ?? null
          }
          loading={loading}
        />
      </div>
    </section>
  );
}

function StrategyList({
  title,
  subtitle,
  strategies,
  loading,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  strategies: LearningTypeStats[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
      <h3 className="text-lg font-semibold text-white">
        {title}
      </h3>

      <p className="mt-1 text-sm text-zinc-500">
        {subtitle}
      </p>

      <div className="mt-5 space-y-4">
        {loading ? (
          <LoadingRows />
        ) : strategies.length > 0 ? (
          strategies.map(
            (strategy, index) => (
              <StrategyRow
                key={
                  strategy
                    .recommendationType
                }
                strategy={strategy}
                rank={index + 1}
              />
            )
          )
        ) : (
          <EmptyState
            message={emptyMessage}
          />
        )}
      </div>
    </div>
  );
}

function StrategyRow({
  strategy,
  rank,
}: {
  strategy: LearningTypeStats;
  rank: number;
}) {
  const progress =
    Math.min(
      100,
      Math.max(
        0,
        strategy.averageScore
      )
    );

  const outcome =
    getDominantOutcome(strategy);

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#101624] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-white">
            {rank}.{" "}
            {formatStrategy(
              strategy
                .recommendationType
            )}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {strategy.totalRuns} run(s)
            {" · "}
            {outcome} outcome
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`text-xl font-bold ${scoreTextClass(
              strategy.averageScore
            )}`}
          >
            {strategy.averageScore}
          </p>

          <p className="text-xs text-zinc-500">
            learning score
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${scoreBarClass(
            strategy.averageScore
          )}`}
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

function OutcomeDistribution({
  successfulRuns,
  neutralRuns,
  failedRuns,
  totalRuns,
  loading,
}: {
  successfulRuns: number;
  neutralRuns: number;
  failedRuns: number;
  totalRuns: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
      <h3 className="text-lg font-semibold text-white">
        Outcome Distribution
      </h3>

      <p className="mt-1 text-sm text-zinc-500">
        Percentages and verified run counts.
      </p>

      <div className="mt-6 space-y-5">
        {loading ? (
          <LoadingRows />
        ) : (
          <>
            <OutcomeBar
              label="Success"
              count={successfulRuns}
              total={totalRuns}
              barClass="bg-emerald-500"
              textClass="text-emerald-400"
            />

            <OutcomeBar
              label="Neutral"
              count={neutralRuns}
              total={totalRuns}
              barClass="bg-amber-500"
              textClass="text-amber-400"
            />

            <OutcomeBar
              label="Failure"
              count={failedRuns}
              total={totalRuns}
              barClass="bg-red-500"
              textClass="text-red-400"
            />
          </>
        )}
      </div>
    </div>
  );
}

function OutcomeBar({
  label,
  count,
  total,
  barClass,
  textClass,
}: {
  label: string;
  count: number;
  total: number;
  barClass: string;
  textClass: string;
}) {
  const percentage =
    calculateRate(
      count,
      total
    );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-white">
          {label}
        </span>

        <span
          className={`text-sm font-bold ${textClass}`}
        >
          {count} run(s) ·{" "}
          {percentage}%
        </span>
      </div>

      <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function LatestLearningCard({
  strategy,
  agent,
  generatedAt,
  loading,
}: {
  strategy:
    | LearningTypeStats
    | null;
  agent: string | null;
  generatedAt: string | null;
  loading: boolean;
}) {
  const outcome =
    strategy
      ? getDominantOutcome(
          strategy
        )
      : "No data";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
      <h3 className="text-lg font-semibold text-white">
        Latest Learning
      </h3>

      <div className="mt-5 grid gap-4 rounded-xl border border-zinc-800 bg-[#101624] p-5 sm:grid-cols-2">
        <Detail
          label="Strategy"
          value={
            loading
              ? "Loading..."
              : formatStrategy(
                  strategy
                    ?.recommendationType
                )
          }
        />

        <Detail
          label="Outcome"
          value={
            loading
              ? "Loading..."
              : outcome
          }
        />

        <Detail
          label="Score"
          value={
            loading
              ? "Loading..."
              : strategy
                ? String(
                    strategy
                      .averageScore
                  )
                : "No data"
          }
        />

        <Detail
          label="Agent"
          value={
            loading
              ? "Loading..."
              : agent
                ? agent.toUpperCase()
                : "No data"
          }
        />

        <Detail
          label="Completed"
          value={
            loading
              ? "Loading..."
              : formatDate(
                  strategy
                    ?.lastCompletedAt
                )
          }
        />

        <Detail
          label="Summary Generated"
          value={
            loading
              ? "Loading..."
              : formatDate(
                  generatedAt
                )
          }
        />
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-white">
        {value}
      </p>
    </div>
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
          className="h-24 animate-pulse rounded-xl bg-zinc-800/50"
        />
      ))}
    </>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}

function buildExecutiveGuidance(
  summary: LearningSummary | null,
  failureRate: number
) {
  if (
    !summary ||
    summary.totalRecords === 0
  ) {
    return {
      title:
        "Collect more verified outcomes",
      description:
        "There is not enough learning data yet to recommend a strategy change.",
    };
  }

  if (failureRate >= 50) {
    return {
      title:
        "Review the lowest-scoring strategy before scaling",
      description:
        `The current failure rate is ${failureRate}%. Review ${formatStrategy(
          summary
            .worstPerformingStrategy
            ?.recommendationType
        )} and collect more evidence before expanding automated execution.`,
    };
  }

  if (
    summary.overall.neutralRuns >
    summary.overall.successfulRuns
  ) {
    return {
      title:
        "Measure business impact before declaring success",
      description:
        "Most current outcomes are neutral. Execution is working, but final business impact still needs measurement.",
    };
  }

  return {
    title:
      "Continue the strongest verified strategy",
    description:
      `${formatStrategy(
        summary
          .bestPerformingStrategy
          ?.recommendationType
      )} is currently the strongest strategy. Continue cautiously while preserving human approval.`,
  };
}

function getDominantOutcome(
  strategy: LearningTypeStats
) {
  const outcomes = [
    {
      name: "Success",
      count:
        strategy.successfulRuns,
    },
    {
      name: "Neutral",
      count:
        strategy.neutralRuns,
    },
    {
      name: "Failure",
      count:
        strategy.failedRuns,
    },
  ];

  return outcomes.sort(
    (first, second) =>
      second.count -
      first.count
  )[0]?.name ?? "No data";
}

function scoreTextClass(
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

function scoreBarClass(
  score: number
) {
  if (score >= 80) {
    return "bg-emerald-500";
  }

  if (score >= 50) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

function calculateRate(
  count: number,
  total: number
) {
  if (total <= 0) {
    return 0;
  }

  return Number(
    (
      (count / total) *
      100
    ).toFixed(2)
  );
}

function dateValue(
  value?: string | null
) {
  if (!value) {
    return 0;
  }

  const parsed =
    Date.parse(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function compareBestFirst(
  first: LearningTypeStats,
  second: LearningTypeStats
) {
  if (
    second.successRate !==
    first.successRate
  ) {
    return (
      second.successRate -
      first.successRate
    );
  }

  if (
    second.averageScore !==
    first.averageScore
  ) {
    return (
      second.averageScore -
      first.averageScore
    );
  }

  return (
    second.totalRuns -
    first.totalRuns
  );
}

function compareWorstFirst(
  first: LearningTypeStats,
  second: LearningTypeStats
) {
  if (
    first.successRate !==
    second.successRate
  ) {
    return (
      first.successRate -
      second.successRate
    );
  }

  if (
    first.averageScore !==
    second.averageScore
  ) {
    return (
      first.averageScore -
      second.averageScore
    );
  }

  return (
    second.totalRuns -
    first.totalRuns
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
        part.charAt(0)
          .toUpperCase() +
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

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No data";
  }

  return date.toLocaleString(
    "en",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}