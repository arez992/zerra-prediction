"use client";

type SEOOpportunity = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  risk: "low" | "medium" | "high";
  expectedImpact: string;
  query?: string | null;
  page?: string | null;
  reasons?: string[];
};

type SEODirectorReport = {
  connected: boolean;
  summary: {
    totalQueries: number;
    totalPages: number;
    opportunities: number;
    highPriority: number;
    estimatedQuickWins: number;
  };
  searchPerformance: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
  };
  opportunities: SEOOpportunity[];
  guardrails: {
    peopleFirstContent: boolean;
    preventDuplicatePages: boolean;
    requireHumanApproval: boolean;
    preventScaledContentAbuse: boolean;
  };
  checkedAt: string;
};

type Props = {
  report: SEODirectorReport | null;
  loading: boolean;
  generating: boolean;
  onRefresh: () => void;
  onGenerate: () => void;
};

const priorityClasses = {
  low: "border-white/15 bg-white/5 text-white/60",
  medium:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  high:
    "border-orange-500/30 bg-orange-500/10 text-orange-300",
  critical:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function SEODirectorCard({
  report,
  loading,
  generating,
  onRefresh,
  onGenerate,
}: Props) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Organic Growth Engine
          </p>

          <h2 className="mt-3 text-3xl font-black">
            SEO Director
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">
            Analyze Google Search Console data, detect ranking
            opportunities, improve CTR, refresh existing content,
            and recommend helpful SEO pages.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-black transition hover:border-[#D4AF37]/60 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh SEO"}
          </button>

          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : "Generate SEO Recommendations"}
          </button>
        </div>
      </div>

      {!report ? (
        <div className="mt-8 rounded-3xl bg-black/20 p-8 text-center">
          <div className="text-4xl">🔎</div>

          <p className="mt-4 text-white/50">
            No SEO report loaded yet.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              title="Search Clicks"
              value={report.searchPerformance.clicks}
            />

            <Metric
              title="Impressions"
              value={report.searchPerformance.impressions}
            />

            <Metric
              title="CTR"
              value={`${report.searchPerformance.ctr}%`}
            />

            <Metric
              title="Position"
              value={report.searchPerformance.averagePosition}
            />

            <Metric
              title="Opportunities"
              value={report.summary.opportunities}
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Guardrail
              title="People-First Content"
              active={report.guardrails.peopleFirstContent}
            />

            <Guardrail
              title="Prevent Duplicates"
              active={report.guardrails.preventDuplicatePages}
            />

            <Guardrail
              title="Human Approval"
              active={report.guardrails.requireHumanApproval}
            />

            <Guardrail
              title="Anti-Spam Protection"
              active={report.guardrails.preventScaledContentAbuse}
            />
          </div>

          <div className="mt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-black">
                  SEO Opportunities
                </h3>

                <p className="mt-2 text-sm text-white/40">
                  Quick wins: {report.summary.estimatedQuickWins}
                </p>
              </div>

              <p className="text-xs text-white/35">
                Last checked: {formatDate(report.checkedAt)}
              </p>
            </div>

            {report.opportunities.length === 0 ? (
              <div className="mt-5 rounded-3xl bg-black/20 p-7 text-center text-sm text-white/45">
                No SEO opportunities yet. Search Console needs more
                clicks and impressions before stronger recommendations
                can be generated.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {report.opportunities.slice(0, 10).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl bg-black/25 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
                              priorityClasses[item.priority]
                            }`}
                          >
                            {item.priority}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase text-white/50">
                            {item.type}
                          </span>
                        </div>

                        <h4 className="mt-4 text-lg font-black">
                          {item.title}
                        </h4>

                        <p className="mt-2 leading-7 text-white/60">
                          {item.description}
                        </p>

                        {item.query && (
                          <p className="mt-3 text-sm text-[#D4AF37]">
                            Query: {item.query}
                          </p>
                        )}

                        {item.page && (
                          <p className="mt-3 break-all text-sm text-[#D4AF37]">
                            Page: {item.page}
                          </p>
                        )}
                      </div>

                      <div className="grid min-w-[190px] gap-3">
                        <SmallMetric
                          title="Confidence"
                          value={`${item.confidence}%`}
                        />

                        <SmallMetric
                          title="Risk"
                          value={item.risk}
                        />
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 p-4">
                      <p className="text-xs font-black uppercase text-[#D4AF37]">
                        Expected Impact
                      </p>

                      <p className="mt-2 text-sm text-white/70">
                        {item.expectedImpact}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl bg-black/25 p-5">
      <p className="text-xs uppercase text-white/40">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function SmallMetric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs uppercase text-white/40">
        {title}
      </p>

      <p className="mt-2 text-lg font-black capitalize text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function Guardrail({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-bold text-white/65">
        {active ? "✅" : "❌"} {title}
      </p>
    </div>
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