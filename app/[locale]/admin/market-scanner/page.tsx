import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getMarketScanner() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/market-scanner`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.scanner;

    return null;
  } catch {
    return null;
  }
}

export default async function MarketScannerPage() {
  const scanner = await getMarketScanner();
  const markets = scanner?.markets || [];
  const topQueries = scanner?.topQueries || [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        → Back to Admin
      </Link>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        Google + Business Intelligence
      </p>

      <h1 className="mt-4 text-5xl font-black">AI Market Scanner</h1>

      <p className="mt-4 max-w-4xl text-white/60">
        Compare countries using Google Analytics traffic, Google Search
        Console visibility, registered users, VIP conversion, payments,
        revenue, and sponsor success estimates.
      </p>

      <section className="mt-8 flex flex-wrap gap-3">
        <SourceBadge
          title="Firestore Users"
          active={scanner?.dataSources?.firestoreUsers === true}
        />
        <SourceBadge
          title="Firestore Payments"
          active={scanner?.dataSources?.firestorePayments === true}
        />
        <SourceBadge
          title="Google Analytics"
          active={scanner?.dataSources?.googleAnalytics === true}
        />
        <SourceBadge
          title="Search Console"
          active={scanner?.dataSources?.searchConsole === true}
        />
        <SourceBadge
          title="Google Ads"
          active={scanner?.dataSources?.googleAds === true}
        />
      </section>

      {scanner?.topMarket && (
        <section className="mt-10 rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-8 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Best Current Market
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <div>
              <h2 className="text-4xl font-black">
                {scanner.topMarket.country}
              </h2>

              <p className="mt-3 text-white/60">
                Recommended action:{" "}
                <span className="font-black text-[#D4AF37]">
                  {scanner.topMarket.action}
                </span>
              </p>
            </div>

            <ScoreCard
              title="Market Score"
              value={scanner.topMarket.marketScore}
            />

            <ScoreCard
              title="Sponsor Success"
              value={`${scanner.topMarket.sponsorSuccessEstimate}%`}
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniMetric
              title="Google Active Users"
              value={scanner.topMarket.googleActiveUsers}
            />
            <MiniMetric
              title="Search Impressions"
              value={scanner.topMarket.searchImpressions}
            />
            <MiniMetric
              title="Registered Users"
              value={scanner.topMarket.users}
            />
            <MiniMetric
              title="VIP Conversion"
              value={`${scanner.topMarket.vipConversionRate}%`}
            />
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-6">
        {markets.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/60">
            No market data found.
          </div>
        ) : (
          markets.map((market: any) => (
            <article
              key={market.country}
              className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-[220px]">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                    Country
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {market.country}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <ActionBadge action={market.action} />

                    <span className="rounded-full bg-black/30 px-4 py-2 text-sm font-black text-[#D4AF37]">
                      Score {market.marketScore}
                    </span>

                    <span className="rounded-full bg-black/30 px-4 py-2 text-sm font-black text-white/70">
                      Sponsor {market.sponsorSuccessEstimate}%
                    </span>
                  </div>
                </div>

                <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    title="Google Active Users"
                    value={market.googleActiveUsers}
                  />
                  <Metric
                    title="Search Clicks"
                    value={market.searchClicks}
                  />
                  <Metric
                    title="Search Impressions"
                    value={market.searchImpressions}
                  />
                  <Metric
                    title="Search CTR"
                    value={`${market.searchCtr}%`}
                  />
                  <Metric
                    title="Search Position"
                    value={market.searchPosition || "—"}
                  />
                  <Metric title="Registered Users" value={market.users} />
                  <Metric title="VIP Users" value={market.vipUsers} />
                  <Metric
                    title="VIP Conversion"
                    value={`${market.vipConversionRate}%`}
                  />
                  <Metric
                    title="Payment Success"
                    value={`${market.paymentSuccessRate}%`}
                  />
                  <Metric
                    title="Completed Payments"
                    value={market.completedPayments}
                  />
                  <Metric
                    title="Pending Payments"
                    value={market.pendingPayments}
                  />
                  <Metric
                    title="Revenue"
                    value={`${market.revenue} USDT`}
                  />
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ScoreBreakdown
                  title="Traffic Score"
                  value={market.trafficScore}
                  max={20}
                />
                <ScoreBreakdown
                  title="Search Score"
                  value={market.searchScore}
                  max={20}
                />
                <ScoreBreakdown
                  title="Business Score"
                  value={market.businessScore}
                  max={60}
                />
                <ScoreBreakdown
                  title="Total Market Score"
                  value={market.marketScore}
                  max={100}
                />
              </div>

              <section className="mt-8 rounded-3xl bg-black/30 p-6">
                <p className="text-sm font-black text-white/60">
                  AI Recommendation
                </p>

                {market.reasons?.length ? (
                  <ul className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-2">
                    {market.reasons.map((reason: string) => (
                      <li key={reason}>✓ {reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-white/40">
                    No recommendation available yet.
                  </p>
                )}
              </section>
            </article>
          ))
        )}
      </section>

      <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
        <h2 className="text-2xl font-black">Top Google Search Queries</h2>

        <p className="mt-2 text-white/50">
          Queries where ZERRA appeared in Google Search results.
        </p>

        {topQueries.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-black/20 p-6 text-center text-sm text-white/40">
            Search Console has not collected query data yet.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {topQueries.map((item: any) => (
              <div
                key={item.query}
                className="rounded-2xl bg-black/30 p-4"
              >
                <p className="font-black text-[#D4AF37]">
                  {item.query}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white/50 sm:grid-cols-4">
                  <span>
                    Clicks:{" "}
                    <strong className="text-white">
                      {item.clicks ?? 0}
                    </strong>
                  </span>

                  <span>
                    Impressions:{" "}
                    <strong className="text-white">
                      {item.impressions ?? 0}
                    </strong>
                  </span>

                  <span>
                    CTR:{" "}
                    <strong className="text-white">
                      {item.ctr ?? 0}%
                    </strong>
                  </span>

                  <span>
                    Position:{" "}
                    <strong className="text-white">
                      {item.position ?? 0}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {scanner?.notice && (
        <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-6">
          <h2 className="text-lg font-black text-[#D4AF37]">
            Google Data Notice
          </h2>

          <p className="mt-3 leading-7 text-white/60">
            {scanner.notice}
          </p>
        </section>
      )}

      <p className="mt-8 text-sm text-white/40">
        Countries scanned: {scanner?.scannedCountries ?? 0} آ· Last checked:{" "}
        {formatDate(scanner?.checkedAt)}
      </p>
    </main>
  );
}

function SourceBadge({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-black uppercase ${
        active
          ? "border-green-500/30 bg-green-500/10 text-green-300"
          : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      }`}
    >
      {title}: {active ? "Connected" : "Not Connected"}
    </span>
  );
}

function ScoreCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl bg-black/30 px-8 py-5">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-5xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs uppercase text-white/40">{title}</p>
      <p className="mt-2 text-2xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
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

function ScoreBreakdown({
  title,
  value,
  max,
}: {
  title: string;
  value: number;
  max: number;
}) {
  const percentage = Math.min(
    100,
    Math.max(0, (Number(value || 0) / max) * 100)
  );

  return (
    <div className="rounded-3xl bg-black/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/50">{title}</p>

        <p className="font-black text-[#D4AF37]">
          {value}/{max}
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#D4AF37]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ActionBadge({
  action,
}: {
  action: "Expand" | "Test" | "Monitor" | "Pause";
}) {
  const classes = {
    Expand: "border-green-500/30 bg-green-500/10 text-green-300",
    Test: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    Monitor: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    Pause: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <span
      className={`rounded-full border px-4 py-2 text-sm font-black ${classes[action]}`}
    >
      {action}
    </span>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
