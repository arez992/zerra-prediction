"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ShadowMigrationReadiness =
  | "not_ready"
  | "observing"
  | "candidate"
  | "ready";

type ShadowHistoryRecord = {
  id: string;
  runAt: string;
  success: boolean;
  acceptable: boolean | null;
  comparisonStatus:
    | "match"
    | "partial_match"
    | "mismatch"
    | "unavailable"
    | null;
  overallScore: number | null;
  legacyDurationMs: number;
  zaosDurationMs: number;
  mismatches: Array<{
    field: string;
    score: number;
    reason: string;
  }>;
};

type ShadowHistoryStats = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  skippedRuns: number;

  matchedRuns: number;
  partialMatchRuns: number;
  mismatchedRuns: number;
  unavailableRuns: number;

  acceptableRuns: number;
  unacceptableRuns: number;

  averageScore: number | null;
  minimumScore: number | null;
  maximumScore: number | null;

  averageLegacyDurationMs: number | null;
  averageZAOSDurationMs: number | null;

  recentMismatchFields: string[];
  repeatedMismatchFields: string[];

  readiness: ShadowMigrationReadiness;
  readinessReasons: string[];
};

type ShadowHistoryResponse = {
  success: boolean;
  persistenceEnabled: boolean;
  records: ShadowHistoryRecord[];
  stats: ShadowHistoryStats;
  count: number;
  checkedAt: string;
  error?: string;
};

const EMPTY_STATS: ShadowHistoryStats = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  skippedRuns: 0,

  matchedRuns: 0,
  partialMatchRuns: 0,
  mismatchedRuns: 0,
  unavailableRuns: 0,

  acceptableRuns: 0,
  unacceptableRuns: 0,

  averageScore: null,
  minimumScore: null,
  maximumScore: null,

  averageLegacyDurationMs: null,
  averageZAOSDurationMs: null,

  recentMismatchFields: [],
  repeatedMismatchFields: [],

  readiness: "observing",
  readinessReasons: [
    "Shadow history has not been loaded yet.",
  ],
};

export default function CEOShadowHistoryCard() {
  const [records, setRecords] = useState<
    ShadowHistoryRecord[]
  >([]);
  const [stats, setStats] =
    useState<ShadowHistoryStats>(
      EMPTY_STATS
    );
  const [checkedAt, setCheckedAt] =
    useState<string | null>(null);
  const [persistenceEnabled, setPersistenceEnabled] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/admin/ai-ceo/shadow-history?limit=20",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as ShadowHistoryResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load AI CEO shadow history."
        );
      }

      setRecords(data.records || []);
      setStats(data.stats || EMPTY_STATS);
      setCheckedAt(data.checkedAt || null);
      setPersistenceEnabled(
        data.persistenceEnabled === true
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load AI CEO shadow history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const latestRecord =
    records[0] ?? null;

  const scoreTone = useMemo(() => {
    const score = stats.averageScore;

    if (score === null) {
      return "text-white/50";
    }

    if (score >= 95) {
      return "text-green-300";
    }

    if (score >= 85) {
      return "text-[#D4AF37]";
    }

    return "text-red-300";
  }, [stats.averageScore]);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0B1220] p-6 shadow-xl md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            ZAOS Shadow Mode
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            Migration Readiness
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            Legacy AI CEO and ZAOS run in parallel.
            The user-visible legacy result remains unchanged
            while comparison quality is measured.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={loading}
          className="rounded-full border border-[#D4AF37]/40 px-5 py-3 text-sm font-black text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Average Score"
          value={
            stats.averageScore === null
              ? "—"
              : `${stats.averageScore}%`
          }
          valueClassName={scoreTone}
        />

        <Metric
          label="Total Runs"
          value={String(stats.totalRuns)}
        />

        <Metric
          label="Exact Matches"
          value={String(stats.matchedRuns)}
        />

        <Metric
          label="Readiness"
          value={formatReadiness(
            stats.readiness
          )}
          valueClassName={readinessTone(
            stats.readiness
          )}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-black text-white">
            Runtime Performance
          </h3>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <SmallMetric
              label="Legacy Avg"
              value={formatDuration(
                stats.averageLegacyDurationMs
              )}
            />

            <SmallMetric
              label="ZAOS Avg"
              value={formatDuration(
                stats.averageZAOSDurationMs
              )}
            />

            <SmallMetric
              label="Acceptable"
              value={String(
                stats.acceptableRuns
              )}
            />

            <SmallMetric
              label="Unacceptable"
              value={String(
                stats.unacceptableRuns
              )}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-black text-white">
            Readiness Reasons
          </h3>

          <div className="mt-4 space-y-3">
            {stats.readinessReasons.length > 0 ? (
              stats.readinessReasons.map(
                (reason) => (
                  <p
                    key={reason}
                    className="rounded-xl bg-black/20 p-3 text-sm leading-6 text-white/60"
                  >
                    {reason}
                  </p>
                )
              )
            ) : (
              <p className="text-sm text-white/40">
                No readiness notes available.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-black text-white">
            Latest Shadow Run
          </h3>

          <p className="text-xs text-white/40">
            {latestRecord
              ? formatDate(latestRecord.runAt)
              : "No runs yet"}
          </p>
        </div>

        {latestRecord ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SmallMetric
              label="Score"
              value={
                latestRecord.overallScore === null
                  ? "—"
                  : `${latestRecord.overallScore}%`
              }
            />

            <SmallMetric
              label="Status"
              value={formatStatus(
                latestRecord.comparisonStatus
              )}
            />

            <SmallMetric
              label="Legacy"
              value={formatDuration(
                latestRecord.legacyDurationMs
              )}
            />

            <SmallMetric
              label="ZAOS"
              value={formatDuration(
                latestRecord.zaosDurationMs
              )}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/40">
            No persisted shadow comparison is available.
          </p>
        )}
      </div>

      {stats.repeatedMismatchFields.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="font-black text-red-200">
            Repeated Mismatch Fields
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {stats.repeatedMismatchFields.map(
              (field) => (
                <span
                  key={field}
                  className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200"
                >
                  {field}
                </span>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Persistence:{" "}
          {persistenceEnabled
            ? "Enabled"
            : "Disabled"}
        </span>

        <span>
          Last checked:{" "}
          {formatDate(checkedAt)}
        </span>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-black ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}

function formatReadiness(
  readiness: ShadowMigrationReadiness
): string {
  switch (readiness) {
    case "ready":
      return "Ready";

    case "candidate":
      return "Candidate";

    case "not_ready":
      return "Not Ready";

    default:
      return "Observing";
  }
}

function readinessTone(
  readiness: ShadowMigrationReadiness
): string {
  switch (readiness) {
    case "ready":
      return "text-green-300";

    case "candidate":
      return "text-[#D4AF37]";

    case "not_ready":
      return "text-red-300";

    default:
      return "text-blue-300";
  }
}

function formatStatus(
  status: ShadowHistoryRecord["comparisonStatus"]
): string {
  if (!status) {
    return "Unavailable";
  }

  return status
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatDuration(
  value: number | null
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }

  return `${Math.round(value)}ms`;
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}