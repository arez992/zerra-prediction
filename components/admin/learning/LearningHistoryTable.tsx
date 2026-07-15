"use client";

import type {
  LearningHistoryRecord,
  LearningOutcome,
} from "@/components/admin/learning/types";

type LearningHistoryTableProps = {
  records: LearningHistoryRecord[];
  loading: boolean;
  error: string;
};

export default function LearningHistoryTable({
  records,
  loading,
  error,
}: LearningHistoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#151c2e]">
      {loading && (
        <div className="space-y-3 p-6">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
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
                {records.map((record) => (
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
                        outcome={record.outcome}
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
                ))}
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

function scoreClass(score: number) {
  if (score >= 80) {
    return "text-emerald-400";
  }

  if (score >= 50) {
    return "text-amber-400";
  }

  return "text-red-400";
}

function formatStrategy(value: string) {
  return value
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No date";
  }

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}