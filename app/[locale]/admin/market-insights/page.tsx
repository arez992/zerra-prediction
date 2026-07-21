import Link from "next/link";

async function getMarketInsights() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/market-insights`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.insights;

    return null;
  } catch {
    return null;
  }
}

export default async function MarketInsightsPage() {
  const insights = await getMarketInsights();
  const countries = insights?.countries || [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†گ Back to Admin
      </Link>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        ZERRA Market AI
      </p>

      <h1 className="mt-4 text-5xl font-black">Market Insights</h1>

      <p className="mt-4 max-w-3xl text-white/60">
        Review market strengths, weaknesses, opportunities, risks, and
        recommendations using real Firestore user and payment data.
      </p>

      {insights?.topCountry && (
        <section className="mt-10 rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-8 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Top Market Insight
          </p>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-4xl font-black">
                {insights.topCountry.country}
              </h2>

              <p className="mt-3 text-white/60">
                Recommended action:{" "}
                <span className="font-black text-[#D4AF37]">
                  {insights.topCountry.action}
                </span>
              </p>

              <p className="mt-4 max-w-3xl leading-7 text-white/70">
                {insights.topCountry.recommendation}
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 px-8 py-5">
              <p className="text-sm text-white/50">Insight Score</p>
              <p className="mt-2 text-5xl font-black text-[#D4AF37]">
                {insights.topCountry.score}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-6">
        {countries.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/60">
            No market insight data found.
          </div>
        ) : (
          countries.map((country: any) => (
            <article
              key={country.country}
              className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                    Country
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {country.country}
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[650px]">
                  <Metric title="Users" value={country.users} />
                  <Metric title="VIP Users" value={country.vipUsers} />
                  <Metric
                    title="VIP Conversion"
                    value={`${country.vipConversionRate}%`}
                  />
                  <Metric
                    title="Payment Success"
                    value={`${country.paymentSuccessRate}%`}
                  />
                  <Metric
                    title="Revenue"
                    value={`${country.revenue} USDT`}
                  />
                  <Metric
                    title="Completed"
                    value={country.completedPayments}
                  />
                  <Metric
                    title="Pending"
                    value={country.pendingPayments}
                  />
                  <Metric
                    title="Failed"
                    value={country.failedPayments}
                  />
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <InsightBox
                  title="Strengths"
                  items={country.strengths}
                  emptyText="No major strengths detected yet."
                />

                <InsightBox
                  title="Weaknesses"
                  items={country.weaknesses}
                  emptyText="No major weaknesses detected."
                />

                <InsightBox
                  title="Opportunities"
                  items={country.opportunities}
                  emptyText="No opportunities detected yet."
                />

                <InsightBox
                  title="Risks"
                  items={country.risks}
                  emptyText="No major risks detected."
                />
              </div>

              <div className="mt-8 rounded-3xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-white/50">
                      Recommendation
                    </p>

                    <p className="mt-2 max-w-4xl leading-7 text-white/80">
                      {country.recommendation}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Badge label={country.action} />
                    <span className="rounded-full bg-black/30 px-4 py-2 text-sm font-black text-[#D4AF37]">
                      Score {country.score}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-black text-white/70">
                  External Data Sources
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ExternalSignal
                    title="Google Trends"
                    value={country.externalSignals?.googleTrendsScore}
                  />
                  <ExternalSignal
                    title="TikTok Interest"
                    value={country.externalSignals?.tiktokInterestScore}
                  />
                  <ExternalSignal
                    title="Football Popularity"
                    value={country.externalSignals?.footballPopularityScore}
                  />
                  <ExternalSignal
                    title="Betting Interest"
                    value={country.externalSignals?.bettingInterestScore}
                  />
                  <ExternalSignal
                    title="CPC Score"
                    value={country.externalSignals?.cpcScore}
                  />
                  <ExternalSignal
                    title="Competition Score"
                    value={country.externalSignals?.competitionScore}
                  />
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#101827] p-6">
        <h2 className="text-2xl font-black">Data Sources</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SourceCard
            title="Firestore Users"
            active={insights?.dataSources?.firestoreUsers === true}
          />
          <SourceCard
            title="Firestore Payments"
            active={insights?.dataSources?.firestorePayments === true}
          />
          <SourceCard
            title="Google Trends"
            active={insights?.dataSources?.googleTrends === true}
          />
          <SourceCard
            title="TikTok"
            active={insights?.dataSources?.tiktok === true}
          />
          <SourceCard
            title="Advertising Data"
            active={insights?.dataSources?.advertisingData === true}
          />
        </div>
      </section>

      <p className="mt-6 text-sm text-white/40">
        Countries scanned: {insights?.scannedCountries ?? 0} آ· Last checked:{" "}
        {formatDate(insights?.checkedAt)}
      </p>
    </main>
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
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs uppercase text-white/40">{title}</p>
      <p className="mt-2 break-words text-xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function InsightBox({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl bg-black/30 p-6">
      <h3 className="text-xl font-black text-white">{title}</h3>

      {items?.length ? (
        <ul className="mt-4 space-y-3 text-sm leading-6 text-white/70">
          {items.map((item) => (
            <li key={item}>âœ“ {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-white/40">{emptyText}</p>
      )}
    </section>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 text-sm font-black text-[#D4AF37]">
      {label}
    </span>
  );
}

function ExternalSignal({
  title,
  value,
}: {
  title: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 font-black text-[#D4AF37]">
        {value === null || value === undefined ? "Not connected" : value}
      </p>
    </div>
  );
}

function SourceCard({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-white/60">{title}</p>
      <p
        className={`mt-2 font-black ${
          active ? "text-green-300" : "text-yellow-300"
        }`}
      >
        {active ? "Connected" : "Not Connected"}
      </p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "â€”";

  return new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
