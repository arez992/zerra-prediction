import Link from "next/link";

async function getMarketScanner() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerra-prediction.vercel.app";

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

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Admin
      </Link>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        AI Scanner
      </p>

      <h1 className="mt-4 text-5xl font-black">AI Market Scanner</h1>

      <p className="mt-4 max-w-3xl text-white/60">
        AI-inspired recommendations based on users, VIP conversion, payments,
        and revenue.
      </p>

      {scanner?.topMarket && (
        <section className="mt-10 rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-8">
          <p className="text-sm uppercase tracking-wider text-[#D4AF37]">
            Best Market
          </p>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div>
              <h2 className="text-4xl font-black">
                {scanner.topMarket.country}
              </h2>

              <p className="mt-4 text-white/60">
                Recommended Action:{" "}
                <span className="font-black text-[#D4AF37]">
                  {scanner.topMarket.action}
                </span>
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 px-8 py-5">
              <p className="text-sm text-white/50">Market Score</p>
              <p className="mt-2 text-5xl font-black text-[#D4AF37]">
                {scanner.topMarket.marketScore}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-6">
        {markets.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#101827] p-8 text-center text-white/60">
            No market data found.
          </div>
        ) : (
          markets.map((market: any) => (
            <article
              key={market.country}
              className="rounded-[2rem] border border-white/10 bg-[#101827] p-6"
            >
              <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
                <Info title="Country" value={market.country} />
                <Info title="Users" value={market.users} />
                <Info title="VIP" value={market.vipUsers} />
                <Info title="Revenue" value={`${market.revenue} USDT`} />
                <Info
                  title="VIP Conversion"
                  value={`${market.vipConversionRate}%`}
                />
                <Info
                  title="Payment Success"
                  value={`${market.paymentSuccessRate}%`}
                />
                <Info title="Score" value={market.marketScore} />
                <Info title="Action" value={market.action} />
              </div>

              <div className="mt-6">
                <p className="text-sm font-bold text-white/50">
                  AI Recommendation
                </p>

                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  {market.reasons.map((reason: string) => (
                    <li key={reason}>✓ {reason}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))
        )}
      </section>

      <p className="mt-8 text-sm text-white/40">
        Countries scanned: {scanner?.scannedCountries ?? 0}
      </p>
    </main>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-xs uppercase text-white/40">{title}</p>
      <p className="mt-1 break-words font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}