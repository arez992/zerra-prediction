"use client";

import Link from "next/link";
import CEOHeader from "@/components/admin/ceo/CEOHeader";
import CEOStats from "@/components/admin/ceo/CEOStats";
import CEORecommendationList from "@/components/admin/ceo/CEORecommendationList";
import CEOMemoryCard from "@/components/admin/ceo/CEOMemoryCard";
import CEOTaskCard from "@/components/admin/ceo/CEOTaskCard";
import SEODirectorCard from "@/components/admin/ceo/SEODirectorCard";
import { useCEO } from "@/hooks/useCEO";

export default function AICEODashboardPage() {
  const {
    recommendations,
    memory,
    tasks,
    seoReport,
    stats,
    loading,
    generating,
    seoLoading,
    seoGenerating,
    activeActionId,
    error,
    message,
    checkedAt,
    loadCEOData,
    loadSEOData,
    generateRecommendations,
    generateSEO,
    approve,
    reject,
    execute,
  } = useCEO();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link
        href="/en/admin"
        className="text-sm font-bold text-[#D4AF37]"
      >
        ← Back to Admin
      </Link>

      <div className="mt-8">
        <CEOHeader
          loading={loading}
          generating={generating}
          onRefresh={() => void loadCEOData()}
          onGenerate={() => void generateRecommendations()}
        />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <div className="mt-8">
        <CEOStats stats={stats} />
      </div>

      <section className="mt-12">
        <SEODirectorCard
          report={seoReport}
          loading={seoLoading}
          generating={seoGenerating}
          onRefresh={() => void loadSEOData()}
          onGenerate={() => void generateSEO()}
        />
      </section>

      <section className="mt-12">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Executive Inbox
            </p>

            <h2 className="mt-3 text-3xl font-black">
              CEO Recommendations
            </h2>
          </div>

          <p className="text-sm text-white/40">
            Last checked: {formatDate(checkedAt)}
          </p>
        </div>

        <CEORecommendationList
          recommendations={recommendations}
          loading={loading}
          activeActionId={activeActionId}
          onApprove={(id) => void approve(id)}
          onReject={(id, reason) => void reject(id, reason)}
          onExecute={(id) => void execute(id)}
        />
      </section>

      <section className="mt-12 grid gap-6 xl:grid-cols-2">
        <CEOMemoryCard
          memories={memory}
          loading={loading}
        />

        <CEOTaskCard
          tasks={tasks}
          loading={loading}
        />
      </section>
    </main>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}