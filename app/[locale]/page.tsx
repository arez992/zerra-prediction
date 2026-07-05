import Link from "next/link";

const picks = [
  { sport: "Football", league: "Premier League", match: "Man City vs Arsenal", pick: "Over 1.5 Goals", confidence: "92%" },
  { sport: "Basketball", league: "NBA", match: "Lakers vs Celtics", pick: "Home Win", confidence: "88%" },
  { sport: "Tennis", league: "ATP", match: "Alcaraz vs Sinner", pick: "Over 21.5 Games", confidence: "84%" },
  { sport: "MMA", league: "UFC", match: "Main Event", pick: "Fight Goes Distance", confidence: "79%" },
];

const sports = ["Football", "Basketball", "Tennis", "MMA", "Boxing", "Esports", "Hockey", "Volleyball"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="relative overflow-hidden px-6 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#d4af3740,transparent_35%),radial-gradient(circle_at_right,#2563eb30,transparent_30%)]" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
          <div>
            <h1 className="text-xl font-black tracking-wider text-[#D4AF37]">ZERRA</h1>
            <p className="text-xs text-white/60">AI Multi-Sport Predictions</p>
          </div>

          <div className="hidden gap-6 text-sm text-white/70 md:flex">
            <Link href="#">Predictions</Link>
            <Link href="#">Live</Link>
            <Link href="#">Sports</Link>
            <Link href="#">VIP</Link>
          </div>

          <Link href="/en/vip" className="rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-bold text-black">
            Go VIP
          </Link>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#D4AF37]">
              AI-powered sports analysis platform
            </div>

            <h2 className="text-5xl font-black leading-tight md:text-7xl">
              Smarter predictions for every major sport.
            </h2>

            <p className="mt-6 max-w-2xl text-lg text-white/70">
              ZERRA Prediction analyzes multi-sport data, live trends, confidence scores,
              and premium insights for smarter sports forecasting.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="#picks" className="rounded-full bg-white px-6 py-3 font-bold text-black">
                Explore Picks
              </Link>
              <Link href="/en/vip" className="rounded-full border border-white/20 px-6 py-3 font-bold text-white">
                View VIP Plans
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <p className="text-sm text-white/60">Live AI Signal</p>
            <h3 className="mt-3 text-6xl font-black text-[#D4AF37]">92.4%</h3>
            <p className="mt-4 text-white/70">
              Cross-sport confidence based on form, trends, injuries, H2H and recent performance.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-3xl font-black">10+</p>
                <p className="text-sm text-white/50">Sports</p>
              </div>
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-3xl font-black">4</p>
                <p className="text-sm text-white/50">Languages</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="picks" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold text-[#D4AF37]">Premium analytics</p>
            <h2 className="text-3xl font-black">Today’s Multi-Sport Picks</h2>
          </div>
          <span className="rounded-full bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#D4AF37]">Free + VIP</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {picks.map((item) => (
            <div key={item.match} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition hover:border-[#D4AF37]/50">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{item.sport}</span>
                <span className="text-xs text-white/50">{item.league}</span>
              </div>
              <h3 className="text-xl font-black">{item.match}</h3>
              <p className="mt-4 text-sm text-white/50">AI Best Pick</p>
              <p className="text-lg font-bold text-[#D4AF37]">{item.pick}</p>
              <div className="mt-5 rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Confidence</p>
                <p className="text-3xl font-black">{item.confidence}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="mb-8 text-3xl font-black">Popular Sports</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {sports.map((sport) => (
            <div key={sport} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 font-bold">
              {sport}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-8 md:p-12">
          <p className="text-[#D4AF37]">VIP Access</p>
          <h2 className="mt-2 text-4xl font-black">Unlock premium predictions.</h2>
          <p className="mt-4 max-w-2xl text-white/70">
            Get full AI analysis, confidence scores, VIP picks, and early access using USDT TRC20.
          </p>
          <Link href="/en/vip" className="mt-8 inline-block rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black">
            Join VIP
          </Link>
        </div>
      </section>
    </main>
  );
}