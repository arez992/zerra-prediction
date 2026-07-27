import Link from "next/link";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCookieHeader() {
  const store = await cookies();
  return store.toString();
}

async function getDashboard() {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zerraprediction.com";
    const response = await fetch(`${siteUrl}/api/admin/competitor-intelligence`, {
      cache: "no-store",
      headers: { Cookie: await getCookieHeader() },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.success ? data.dashboard : null;
  } catch {
    return null;
  }
}

export default async function CompetitorIntelligencePage() {
  const dashboard = await getDashboard();
  const context = dashboard?.context;
  const gaps = dashboard?.gaps || [];
  const observations = dashboard?.observations || [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">← Back to Admin</Link>
      <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">ZERRA Competitive Intelligence</p>
      <h1 className="mt-4 text-5xl font-black">Competitor Intelligence</h1>
      <p className="mt-4 max-w-4xl leading-7 text-white/55">Monitor competitor SEO and prediction coverage, identify gaps ZERRA has not covered, and feed compact opportunity intelligence directly into AI CEO decision-making.</p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Tracked Competitors" value={context?.trackedCompetitors ?? 0} />
        <Metric title="Open Gaps" value={context?.openGaps ?? 0} />
        <Metric title="High Priority" value={context?.highPriorityGaps ?? 0} />
        <Metric title="Missing Predictions" value={context?.missingPredictions ?? 0} />
        <Metric title="Missing SEO" value={context?.missingSeo ?? 0} />
        <Metric title="Observations" value={observations.length} />
        <Metric title="AI CEO Feed" value={context?.connected ? "Connected" : "Unavailable"} />
        <Metric title="Last Scan" value={formatDate(context?.lastScanAt)} />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <RankCard title="Top Countries" rows={context?.topCountries || []} labelKey="country" />
        <RankCard title="Top Languages" rows={context?.topLanguages || []} labelKey="language" />
        <RankCard title="Top Competitors" rows={context?.topCompetitors || []} labelKey="competitor" />
      </section>

      <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#101827] p-6">
        <h2 className="text-2xl font-black">Opportunity Gaps</h2>
        <div className="mt-6 space-y-3">
          {gaps.length === 0 ? <div className="rounded-2xl bg-black/20 p-8 text-center text-white/40">No competitor gaps detected yet.</div> : gaps.map((gap: any) => (
            <article key={gap.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="font-black text-[#D4AF37]">{gap.competitor}</p><h3 className="mt-2 text-lg font-black">{gap.topic || (gap.fixture_id ? `Fixture ${gap.fixture_id}` : gap.gap_type)}</h3><p className="mt-2 text-sm text-white/45">{gap.reason || "Opportunity detected from competitor coverage."}</p></div>
                <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-xs font-black text-[#D4AF37]">Priority {gap.priority}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#101827] p-6">
        <h2 className="text-2xl font-black">Recent Competitor Observations</h2>
        <div className="mt-6 space-y-3">
          {observations.length === 0 ? <div className="rounded-2xl bg-black/20 p-8 text-center text-white/40">Scanner has not collected observations yet.</div> : observations.map((item: any) => (
            <article key={item.id} className="rounded-2xl bg-black/25 p-5"><p className="font-black text-[#D4AF37]">{item.competitor}</p><p className="mt-2 font-bold">{item.title || item.topic || item.url}</p><p className="mt-2 text-xs text-white/40">{item.content_type}</p></article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-[#101827] p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{title}</p><p className="mt-4 break-words text-2xl font-black text-[#D4AF37]">{value}</p></div>;
}

function RankCard({ title, rows, labelKey }: { title: string; rows: any[]; labelKey: string }) {
  return <div className="rounded-[1.7rem] border border-white/10 bg-[#101827] p-6"><h2 className="font-black">{title}</h2><div className="mt-5 space-y-3">{rows.length === 0 ? <p className="text-sm text-white/35">No data yet.</p> : rows.map((row) => <div key={row[labelKey]} className="flex justify-between rounded-xl bg-black/20 px-4 py-3"><span>{row[labelKey]}</span><strong className="text-[#D4AF37]">{row.count}</strong></div>)}</div></div>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Baghdad", dateStyle: "medium", timeStyle: "short" }).format(date);
}