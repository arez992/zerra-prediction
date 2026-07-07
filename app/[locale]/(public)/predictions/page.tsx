import Link from "next/link";
import TopPick from "@/components/predictions/TopPick";
import { calculatePrediction } from "@/lib/ai/prediction";

type AIPick = {
  id: number | string;
  sport: string;
  league: string;
  match: string;
  time: string;
  prediction: string;
  confidence: number;
  risk: "Low" | "Medium" | "High";
  access: "Free" | "VIP";
};

async function getFixtures(): Promise<any[]> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/sports/football/fixtures`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success && Array.isArray(data.fixtures)) {
      return data.fixtures;
    }

    return [];
  } catch {
    return [];
  }
}

function formatTime(date?: string) {
  if (!date) return "TBD";

  return new Date(date).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PredictionsPage() {
  const fixtures = await getFixtures();

  const aiPicks: AIPick[] = fixtures
    .slice(0, 8)
    .map((fixture: any, index: number) => {
      const matchData = {
        fixture,
        statistics: [],
        events: [],
        lineups: [],
      };

      const prediction = calculatePrediction(matchData);

      return {
        id: fixture.fixture.id,
        sport: "Football",
        league: fixture.league.name,
        match: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
        time: formatTime(fixture.fixture.date),
        prediction: prediction.valueBet,
        confidence: prediction.confidence,
        risk: prediction.risk,
        access: index === 0 ? "Free" : "VIP",
      };
    });

  const topPick = aiPicks[0];
  const otherPicks: AIPick[] = aiPicks.slice(1);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
          ZERRA AI
        </p>

        <h1 className="mt-3 text-5xl font-black">
          Today&apos;s AI Predictions
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-white/60">
          Dynamic football predictions generated from live fixtures and the
          ZERRA AI Engine.
        </p>
      </div>

      {topPick ? (
        <TopPick pick={topPick} />
      ) : (
        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center text-white/60">
          No football predictions available right now.
        </div>
      )}

      <section className="mt-12">
        <p className="mb-5 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          More AI Picks
        </p>

        <div className="grid gap-6">
          {otherPicks.map((item: AIPick, index: number) => {
            const isVip = item.access === "VIP";

            return (
              <article
                key={`${item.id}-${index}`}
                className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-xl transition ${
                  isVip
                    ? "border-[#D4AF37]/40 bg-[#0B1220]"
                    : "border-white/10 bg-[#101827] hover:border-[#D4AF37]/50"
                }`}
              >
                {isVip && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-black text-black">
                    🔒 VIP
                  </div>
                )}

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-4 inline-flex rounded-full bg-black/30 px-4 py-2 text-sm font-black text-[#D4AF37]">
                      #{index + 2} AI Pick
                    </div>

                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                      {item.league} • {item.time}
                    </p>

                    <h2 className="mt-2 text-3xl font-black">{item.match}</h2>

                    <p className="mt-3 text-white/60">
                      🤖{" "}
                      {isVip
                        ? "Premium AI Prediction Locked"
                        : item.prediction}
                    </p>

                    {isVip && (
                      <Link
                        href="/en/vip"
                        className="mt-5 inline-block rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black"
                      >
                        Unlock VIP Prediction
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <InfoCard title="Confidence" value={`${item.confidence}%`} />
                    <InfoCard title="Risk" value={item.risk} />
                    <InfoCard title="Access" value={item.access} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/en/dashboard"
          className="rounded-full bg-[#D4AF37] px-8 py-3 font-black text-black"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4 text-center">
      <p className="text-xs uppercase text-white/50">{title}</p>
      <p className="mt-2 text-xl font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}