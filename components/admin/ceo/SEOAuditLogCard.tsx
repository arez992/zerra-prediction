"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AuditAction =
  | "all"
  | "edit"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish"
  | "rollback";

type AuditLogItem = {
  id: string;
  action: string;
  draftId: string | null;
  draftTitle: string | null;
  canonicalPath: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  performedBy: string | null;
  createdAt: string | null;
  versionId: string | null;
  rollbackFromVersion: string | null;
  rollbackToVersion: string | null;
};

type AuditLogsResponse = {
  success: boolean;
  logs?: AuditLogItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
  error?: string;
};

type Props = {
  title?: string;
  description?: string;
  pageSize?: number;
  showActivityLink?: boolean;
};

const FILTERS: Array<{ label: string; value: AuditAction }> = [
  { label: "All", value: "all" },
  { label: "Edit", value: "edit" },
  { label: "Approve", value: "approve" },
  { label: "Reject", value: "reject" },
  { label: "Publish", value: "publish" },
  { label: "Unpublish", value: "unpublish" },
  { label: "Rollback", value: "rollback" },
];

export default function SEOAuditLogCard({
  title = "SEO Audit Log",
  description = "Track every important SEO page action and status change.",
  pageSize = 20,
  showActivityLink = true,
}: Props) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<AuditAction>("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadLogs = useCallback(
    async ({
      append,
      cursor,
      action,
    }: {
      append: boolean;
      cursor?: string | null;
      action: AuditAction;
    }) => {
      try {
        append ? setLoadingMore(true) : setLoading(true);
        setError("");

        const params = new URLSearchParams({
          limit: String(pageSize),
        });

        if (action !== "all") params.set("action", action);
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(
          `/api/admin/ai-ceo/audit-logs?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        const data = await parseResponse<AuditLogsResponse>(response);

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Unable to load SEO audit logs."
          );
        }

        const incoming = data.logs || [];

        setLogs((current) =>
          append ? mergeLogs(current, incoming) : incoming
        );
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore === true);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load SEO audit logs."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    void loadLogs({
      append: false,
      action: activeFilter,
    });
  }, [activeFilter, loadLogs]);

  const summary = useMemo(() => {
    const counts = new Map<string, number>();

    for (const log of logs) {
      counts.set(log.action, (counts.get(log.action) || 0) + 1);
    }

    return counts;
  }, [logs]);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Governance
          </p>

          <h2 className="mt-3 text-3xl font-black">{title}</h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void loadLogs({
                append: false,
                action: activeFilter,
              })
            }
            disabled={loading || loadingMore}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          {showActivityLink && (
            <Link
              href="/en/admin/activity"
              className="rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-black text-black transition hover:brightness-110"
            >
              Open Full Activity
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;
          const count =
            filter.value === "all"
              ? logs.length
              : summary.get(filter.value) || 0;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              disabled={loading || loadingMore}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                isActive
                  ? "bg-[#D4AF37] text-black"
                  : "border border-white/10 bg-black/25 text-white/60 hover:bg-white/5"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl bg-black/25 p-8 text-center text-sm text-white/45">
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-8 text-center text-sm text-white/45">
          No audit logs found for this filter.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {logs.map((log) => (
            <article
              key={log.id}
              className="rounded-3xl border border-white/10 bg-black/25 p-5"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <ActionBadge action={log.action} />

                    {log.previousStatus && (
                      <StatusBadge>{log.previousStatus}</StatusBadge>
                    )}

                    {log.newStatus && (
                      <StatusBadge>→ {log.newStatus}</StatusBadge>
                    )}
                  </div>

                  <h3 className="mt-3 break-words text-lg font-black">
                    {log.draftTitle || "SEO page activity"}
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-white/45">
                    {formatDate(log.createdAt)}
                    {log.performedBy ? ` by ${log.performedBy}` : ""}
                  </p>

                  {log.canonicalPath && (
                    <p className="mt-2 break-all text-xs text-[#D4AF37]/75">
                      {log.canonicalPath}
                    </p>
                  )}
                </div>

                <div className="grid shrink-0 gap-2 text-xs text-white/45 sm:grid-cols-2 xl:min-w-[320px]">
                  <Detail label="Draft ID" value={log.draftId} />
                  <Detail label="Version" value={log.versionId} />
                  <Detail
                    label="Rollback From"
                    value={log.rollbackFromVersion}
                  />
                  <Detail
                    label="Rollback To"
                    value={log.rollbackToVersion}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {hasMore && nextCursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() =>
              void loadLogs({
                append: true,
                cursor: nextCursor,
                action: activeFilter,
              })
            }
            disabled={loadingMore || loading}
            className="rounded-full border border-[#D4AF37]/40 px-6 py-3 text-sm font-black text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? "Loading More..." : "Load More"}
          </button>
        </div>
      )}
    </section>
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw) {
    throw new Error(
      `The server returned an empty response. HTTP ${response.status}`
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid server response: ${raw.slice(0, 200)}`);
  }
}

function mergeLogs(
  currentLogs: AuditLogItem[],
  incomingLogs: AuditLogItem[]
): AuditLogItem[] {
  const merged = new Map<string, AuditLogItem>();

  for (const log of [...currentLogs, ...incomingLogs]) {
    merged.set(log.id, log);
  }

  return Array.from(merged.values());
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ActionBadge({ action }: { action: string }) {
  const classes: Record<string, string> = {
    edit:
      "border-slate-500/30 bg-slate-500/10 text-slate-300",
    approve:
      "border-green-500/30 bg-green-500/10 text-green-300",
    reject:
      "border-red-500/30 bg-red-500/10 text-red-300",
    publish:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",
    unpublish:
      "border-orange-500/30 bg-orange-500/10 text-orange-300",
    rollback:
      "border-purple-500/30 bg-purple-500/10 text-purple-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
        classes[action] ||
        "border-white/10 bg-white/5 text-white/55"
      }`}
    >
      {action}
    </span>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/55">
      {children}
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30">
        {label}
      </p>

      <p className="mt-1 break-all text-xs text-white/60">
        {value || "—"}
      </p>
    </div>
  );
}
