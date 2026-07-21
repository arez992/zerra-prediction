import Link from "next/link";

async function getMarketIntelligence() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/market-intelligence`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.intelligence;

    return null;
  } catch {
    return null;
  }
}

export default async function MarketIntelligencePage() {
  const intelligence = await getMarketIntelligence();
  const countries = intelligence?.countries || [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†گ Back to Admin
      </Link>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        ZERRA Intelligence
      </p>

      <h1 className="mt-4 text-5xl font-black">Market Intelligence</h1>

      <p className="mt-4 max-w-3xl text-white/60">
        Compare countries by users, VIP conversion, payment performance,
        revenue, and business opportunity score.
      </p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value={intelligence?.totals?.users ?? 0}
        />

        <StatCard
          title="VIP Users"
          value={intelligence?.totals?.vipUsers ?? 0}
        />

        <StatCard
          title="Completed Payments"
          value={intelligence?.totals?.completedPayments ?? 0}
        />

        <StatCard
          title="Total Revenue"
          value={`${intelligence?.totals?.revenue ?? 0} USDT`}
        />
      </section>

      {intelligence?.topCountry && (
        <section className="mt-10 rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-8 shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#D4AF37]">
            Top Opportunity
          </p>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-4xl font-black">
                {intelligence.topCountry.country}
              </h2>

              <p className="mt-3 text-white/60">
                Recommended action:{" "}
                <span className="font-black text-[#D4AF37]">
                  {intelligence.topCountry.recommendation}
                </span>
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 px-8 py-5">
              <p className="text-sm text-white/50">Opportunity Score</p>
              <p className="mt-2 text-5xl font-black text-[#D4AF37]">
                {intelligence.topCountry.opportunityScore}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827] shadow-xl">
        <div className="border-b border-white/10 p-6">
          <h2 className="text-2xl font-black">Country Performance</h2>
        </div>

        {countries.length === 0 ? (
          <div className="p-10 text-center text-white/60">
            No country data found. Add a country field to user profiles or
            payment records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-black/30 text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-6 py-4">Country</th>
                  <th className="px-6 py-4">Users</th>
                  <th className="px-6 py-4">VIP</th>
                  <th className="px-6 py-4">VIP Conversion</th>
                  <th className="px-6 py-4">Completed</th>
                  <th className="px-6 py-4">Pending</th>
                  <th className="px-6 py-4">Failed</th>
                  <th className="px-6 py-4">Payment Success</th>
                  <th className="px-6 py-4">Revenue</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Recommendation</th>
                </tr>
              </thead>

              <tbody>
                {countries.map((country: any) => (
                  <tr
                    key={country.country}
                    className="border-t border-white/10 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-5 font-black text-white">
                      {country.country}
                    </td>

                    <td className="px-6 py-5 text-white/70">
                      {country.users}
                    </td>

                    <td className="px-6 py-5 text-white/70">
                      {country.vipUsers}
                    </td>

                    <td className="px-6 py-5 text-white/70">
                      {country.vipConversionRate}%
                    </td>

                    <td className="px-6 py-5 text-white/70">
                      {country.completedPayments}
                    </td>

                    <td className="px-6 py-5 text-white/70">
                      {country.pendingPayments}
                    </td>

                    <td className="px-6 py-5 text-white/70">
                      {country.failedPayments}
                    </td>

                    <td className="px-6 py-5 text-white/70">
                      {country.paymentSuccessRate}%
                    </td>

                    <td className="px-6 py-5 font-black text-[#D4AF37]">
                      {country.revenue} USDT
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-full bg-[#D4AF37]/10 px-3 py-2 font-black text-[#D4AF37]">
                        {country.opportunityScore}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <RecommendationBadge
                        recommendation={country.recommendation}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 text-sm text-white/40">
        Last checked: {formatDate(intelligence?.checkedAt)}
      </p>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-3 text-4xl font-black text-[#D4AF37]">{value}</p>
    </article>
  );
}

function RecommendationBadge({
  recommendation,
}: {
  recommendation: "Expand" | "Test" | "Monitor";
}) {
  const classes = {
    Expand: "border-green-500/30 bg-green-500/10 text-green-300",
    Test: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    Monitor: "border-white/10 bg-white/5 text-white/60",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-2 text-xs font-black uppercase ${classes[recommendation]}`}
    >
      {recommendation}
    </span>
  );
}

function formatDate(value?: string) {
  if (!value) return "â€”";

  return new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
