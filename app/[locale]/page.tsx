import Link from "next/link";
import LivePredictions from "@/components/LivePredictions";
import AIAccuracyCard from "@/components/AIAccuracyCard";

async function getFixtures() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/sports/football/fixtures`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success && Array.isArray(data.fixtures)) {
      return data.fixtures.slice(0, 4);
    }

    return [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const fixtures = await getFixtures();

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="relative overflow-hidden px-6 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#d4af3740,transparent_35%),radial-gradient(circle_at_right,#2563eb30,transparent_30%)]" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 py-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#D4AF37]">
              AI-powered football analysis platform
            </div>

            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              Smarter football predictions powered by AI.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-white/70">
              ZERRA analyzes real football fixtures, live trends, confidence
              scores, risk levels, value bets, and premium AI insights.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/en/predictions"
                className="rounded-full bg-white px-6 py-3 font-bold text-black"
              >
                Explore Picks
              </Link>

              <Link
                href="/en/dashboard"
                className="rounded-full border border-white/20 px-6 py-3 font-bold text-white"
              >
                View Live Fixtures
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <p className="text-sm text-white/60">ZERRA AI Signal</p>

            <h3 className="mt-3 text-6xl font-black text-[#D4AF37]">92.4%</h3>

            <p className="mt-4 text-white/70">
              Football confidence based on form, goals, home advantage, risk
              signals, and match context.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-3xl font-black">{fixtures.length}</p>
                <p className="text-sm text-white/50">Live Fixtures</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-3xl font-black">VIP</p>
                <p className="text-sm text-white/50">Premium Picks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AIAccuracyCard />

      <section id="picks" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold text-[#D4AF37]">
              Real football fixtures
            </p>
            <h2 className="text-3xl font-black">Today&apos;s Football Matches</h2>
          </div>

          <span className="rounded-full bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#D4AF37]">
            Live API
          </span>
        </div>

        {fixtures.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center text-white/60">
            No football fixtures available right now.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {fixtures.map((match: any) => (
              <Link
                key={match.fixture.id}
                href={`/en/match/${match.fixture.id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition hover:border-[#D4AF37]/50"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    Football
                  </span>
                  <span className="text-xs text-white/50">
                    {match.league.name}
                  </span>
                </div>

                <h3 className="text-xl font-black">
                  {match.teams.home.name} vs {match.teams.away.name}
                </h3>

                <p className="mt-4 text-sm text-white/50">Status</p>
                <p className="text-lg font-bold text-[#D4AF37]">
                  {match.fixture.status.long}
                </p>

                <div className="mt-5 rounded-2xl bg-black/30 p-4">
                  <p className="text-sm text-white/50">Score</p>
                  <p className="text-3xl font-black">
                    {match.goals.home ?? "-"} : {match.goals.away ?? "-"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <LivePredictions fixtures={fixtures} />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-8 md:p-12">
          <p className="text-[#D4AF37]">VIP Access</p>
          <h2 className="mt-2 text-4xl font-black">
            Unlock premium football predictions.
          </h2>
          <p className="mt-4 max-w-2xl text-white/70">
            Get full AI analysis, confidence scores, VIP picks, value bets, and
            early access using USDT TRC20.
          </p>

          <Link
            href="/en/vip"
            className="mt-8 inline-block rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black"
          >
            Join VIP
          </Link>
        </div>
      </section>
    </main>
  );
}