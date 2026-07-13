"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardStatus =
  | "ready"
  | "needs_review"
  | "rewrite_required"
  | "approved"
  | "published"
  | "rejected"
  | "failed";

type QualityLabel =
  | "good"
  | "warning"
  | "poor"
  | "passed"
  | "failed"
  | "completed"
  | "required";

type DashboardRow = {
  id: string;
  match: string;
  keyword: string;
  language: "en" | "ku";
  canonicalPath: string;
  draftStatus: string;
  dashboardStatus: DashboardStatus;
  seoScore: number;
  publishScore: number;
  duplicatePercent: number;
  readabilityScore: number;
  keywordCoverageScore: number;
  schemaScore: number;
  internalLinksScore: number;
  quality: {
    readability: QualityLabel;
    keywordCoverage: QualityLabel;
    schema: QualityLabel;
    internalLinks: QualityLabel;
    duplicate: QualityLabel;
    humanReview: QualityLabel;
  };
  recommendation: string;
  updatedAt: string | null;
  createdAt: string | null;
};

type DashboardSummary = {
  total: number;
  ready: number;
  approved: number;
  published: number;
  needsReview: number;
  rewriteRequired: number;
  rejected: number;
  averageSEOScore: number;
  averagePublishScore: number;
};

type DashboardResponse = {
  success: boolean;
  rows?: DashboardRow[];
  count?: number;
  summary?: DashboardSummary;
  checkedAt?: string;
  error?: string;
};

type SortBy =
  | "updatedAt"
  | "seoScore"
  | "publishScore"
  | "duplicatePercent";

type Direction = "asc" | "desc";

const statusOptions: Array<{
  value: "" | DashboardStatus;
  label: string;
}> = [
  { value: "", label: "All statuses" },
  { value: "ready", label: "Ready" },
  { value: "needs_review", label: "Needs review" },
  {
    value: "rewrite_required",
    label: "Rewrite required",
  },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

function statusClasses(status: DashboardStatus) {
  switch (status) {
    case "ready":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    case "approved":
      return "border-sky-400/30 bg-sky-400/10 text-sky-300";
    case "published":
      return "border-violet-400/30 bg-violet-400/10 text-violet-300";
    case "needs_review":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "rewrite_required":
      return "border-orange-400/30 bg-orange-400/10 text-orange-200";
    case "rejected":
      return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    case "failed":
      return "border-red-500/30 bg-red-500/10 text-red-300";
  }
}

function statusLabel(status: DashboardStatus) {
  return status
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function scoreClasses(score: number) {
  if (score >= 80) {
    return "text-emerald-300";
  }

  if (score >= 60) {
    return "text-amber-200";
  }

  return "text-rose-300";
}

function qualityClasses(label: QualityLabel) {
  if (
    label === "good" ||
    label === "passed" ||
    label === "completed"
  ) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  if (
    label === "warning" ||
    label === "required"
  ) {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-rose-400/25 bg-rose-400/10 text-rose-300";
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#101827] p-5 shadow-2xl shadow-black/10">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-[#D4AF37]">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {description}
      </p>
    </div>
  );
}

export default function SEOQualityDashboardPage() {
  const [rows, setRows] = useState<DashboardRow[]>(
    []
  );

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [status, setStatus] = useState<
    "" | DashboardStatus
  >("");

  const [sortBy, setSortBy] =
    useState<SortBy>("updatedAt");

  const [direction, setDirection] =
    useState<Direction>("desc");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState<
    string | null
  >(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (status) {
      params.set("status", status);
    }

    params.set("sortBy", sortBy);
    params.set("direction", direction);

    return params.toString();
  }, [status, sortBy, direction]);

  async function loadDashboard(
    showRefreshState = false
  ) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(
        `/api/admin/ai-ceo/seo-dashboard?${queryString}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      const data =
        (await response.json()) as DashboardResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load SEO quality dashboard."
        );
      }

      setRows(data.rows || []);
      setSummary(data.summary || null);
      setCheckedAt(data.checkedAt || null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load SEO quality dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  return (
    <main className="min-h-screen bg-[#07101E] px-4 py-8 text-white md:px-8 xl:px-10">
      <div className="mx-auto max-w-[1600px]">
        <section className="rounded-[2rem] border border-[#D4AF37]/20 bg-gradient-to-br from-[#101827] to-[#0A1220] p-6 shadow-2xl shadow-black/20 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                Phase 3 · SEO Director Intelligence
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                SEO Quality Dashboard
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 md:text-base">
                Review quality scores, duplicate risk,
                schema readiness, internal links, and
                editorial status across every SEO draft.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="../seo-pages"
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white/75 transition hover:border-[#D4AF37]/45 hover:text-white"
              >
                SEO Drafts
              </Link>

              <button
                type="button"
                onClick={() =>
                  void loadDashboard(true)
                }
                disabled={refreshing}
                className="rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing
                  ? "Refreshing..."
                  : "Refresh Dashboard"}
              </button>
            </div>
          </div>

          {checkedAt && (
            <p className="mt-5 text-xs text-white/35">
              Last checked: {formatDate(checkedAt)}
            </p>
          )}
        </section>

        {error && (
          <div className="mt-6 rounded-3xl border border-rose-400/25 bg-rose-400/10 p-5 text-sm leading-7 text-rose-200">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Drafts"
            value={summary?.total || 0}
            description="All drafts included in the quality dashboard."
          />

          <SummaryCard
            label="Ready"
            value={summary?.ready || 0}
            description="Quality gates and human review are complete."
          />

          <SummaryCard
            label="Needs Review"
            value={summary?.needsReview || 0}
            description="Drafts still requiring editorial checks."
          />

          <SummaryCard
            label="Rewrite Required"
            value={summary?.rewriteRequired || 0}
            description="Drafts blocked by duplicate or quality risk."
          />

          <SummaryCard
            label="Average SEO"
            value={summary?.averageSEOScore || 0}
            description="Average SEO quality score across drafts."
          />

          <SummaryCard
            label="Average Publish"
            value={
              summary?.averagePublishScore || 0
            }
            description="Average publish-readiness score."
          />

          <SummaryCard
            label="Approved"
            value={summary?.approved || 0}
            description="Drafts approved by a human reviewer."
          />

          <SummaryCard
            label="Published"
            value={summary?.published || 0}
            description="Pages currently available publicly."
          />
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#101827] p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Filter Status
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | ""
                      | DashboardStatus
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#D4AF37]/60"
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Sort By
              </span>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as SortBy
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#D4AF37]/60"
              >
                <option value="updatedAt">
                  Last Updated
                </option>
                <option value="seoScore">
                  SEO Score
                </option>
                <option value="publishScore">
                  Publish Score
                </option>
                <option value="duplicatePercent">
                  Duplicate %
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Direction
              </span>

              <select
                value={direction}
                onChange={(event) =>
                  setDirection(
                    event.target.value as Direction
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#D4AF37]/60"
              >
                <option value="desc">
                  Highest first
                </option>
                <option value="asc">
                  Lowest first
                </option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827]">
          {loading ? (
            <div className="p-10 text-center text-sm text-white/45">
              Loading SEO quality dashboard...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-black">
                No dashboard rows found
              </p>

              <p className="mt-2 text-sm text-white/45">
                Change the status filter or create a new
                SEO draft.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full">
                  <thead className="border-b border-white/10 bg-black/20">
                    <tr className="text-left text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      <th className="px-5 py-4">
                        Match
                      </th>
                      <th className="px-4 py-4">
                        SEO
                      </th>
                      <th className="px-4 py-4">
                        Publish
                      </th>
                      <th className="px-4 py-4">
                        Duplicate
                      </th>
                      <th className="px-4 py-4">
                        Readability
                      </th>
                      <th className="px-4 py-4">
                        Schema
                      </th>
                      <th className="px-4 py-4">
                        Links
                      </th>
                      <th className="px-4 py-4">
                        Status
                      </th>
                      <th className="px-4 py-4">
                        Updated
                      </th>
                      <th className="px-5 py-4">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-white/[0.06] align-top last:border-b-0 hover:bg-white/[0.025]"
                      >
                        <td className="max-w-[320px] px-5 py-5">
                          <p className="font-black leading-6">
                            {row.match}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            {row.keyword}
                          </p>

                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/45">
                            {row.recommendation}
                          </p>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`text-xl font-black ${scoreClasses(
                              row.seoScore
                            )}`}
                          >
                            {row.seoScore}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`text-xl font-black ${scoreClasses(
                              row.publishScore
                            )}`}
                          >
                            {row.publishScore}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`text-lg font-black ${
                              row.duplicatePercent <
                              20
                                ? "text-emerald-300"
                                : row.duplicatePercent <
                                  40
                                ? "text-amber-200"
                                : "text-rose-300"
                            }`}
                          >
                            {row.duplicatePercent}%
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${qualityClasses(
                              row.quality
                                .readability
                            )}`}
                          >
                            {
                              row.readabilityScore
                            }
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${qualityClasses(
                              row.quality.schema
                            )}`}
                          >
                            {row.schemaScore}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${qualityClasses(
                              row.quality
                                .internalLinks
                            )}`}
                          >
                            {
                              row.internalLinksScore
                            }
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClasses(
                              row.dashboardStatus
                            )}`}
                          >
                            {statusLabel(
                              row.dashboardStatus
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-5 text-xs text-white/45">
                          {formatDate(
                            row.updatedAt
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <Link
                            href={`../seo-pages/${encodeURIComponent(
                              row.id
                            )}/preview`}
                            className="inline-flex rounded-full border border-[#D4AF37]/35 px-4 py-2 text-xs font-black text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 p-4 xl:hidden">
                {rows.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-3xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black leading-6">
                          {row.match}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          {row.keyword}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(
                          row.dashboardStatus
                        )}`}
                      >
                        {statusLabel(
                          row.dashboardStatus
                        )}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                        <p className="text-xs text-white/35">
                          SEO
                        </p>
                        <p
                          className={`mt-1 text-2xl font-black ${scoreClasses(
                            row.seoScore
                          )}`}
                        >
                          {row.seoScore}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                        <p className="text-xs text-white/35">
                          Publish
                        </p>
                        <p
                          className={`mt-1 text-2xl font-black ${scoreClasses(
                            row.publishScore
                          )}`}
                        >
                          {row.publishScore}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                        <p className="text-xs text-white/35">
                          Duplicate
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {row.duplicatePercent}%
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                        <p className="text-xs text-white/35">
                          Readability
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {row.readabilityScore}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-sm leading-6 text-white/50">
                      {row.recommendation}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-white/35">
                        Updated:{" "}
                        {formatDate(row.updatedAt)}
                      </p>

                      <Link
                        href={`../seo-pages/${encodeURIComponent(
                          row.id
                        )}/preview`}
                        className="rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-black text-black"
                      >
                        Review Draft
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}