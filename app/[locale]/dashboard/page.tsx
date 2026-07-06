"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFixtures() {
      try {
        const res = await fetch("/api/sports/football/fixtures");
        const data = await res.json();
        if (data.success) setFixtures(data.fixtures);
      } finally {
        setLoading(false);
      }
    }

    loadFixtures();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-14 text-white">
      <div className="mb-10 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-r from-white/10 to-white/5 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
          Live Football Data
        </p>
        <h1 className="mt-4 text-5xl font-black">
          Today's Football Fixtures
        </h1>
        <p className="mt-4 max-w-2xl text-white/60">
          Real-time fixtures powered by API-SPORTS. Live scores, match status,
          leagues, and teams are now connected to ZERRA Prediction.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          Loading today's matches...
        </div>
      ) : (
        <div className="grid gap-5">
          {fixtures.map((match: any) => {
            const isLive = match.fixture.status.short !== "FT" && match.fixture.status.short !== "NS";

            return (
              <div
                key={match.fixture.id}
                className="rounded-3xl border border-white/10 bg-[#111827]/80 p-6 shadow-xl transition hover:border-[#D4AF37]/60 hover:bg-[#162033]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#D4AF37]">
                      {match.league.name}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {match.league.country} • {match.fixture.status.long}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-4 py-1 text-xs font-bold ${
                      isLive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {match.fixture.status.short}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-3 items-center gap-4">
                  <div className="text-left">
                    <p className="text-lg font-black">
                      {match.teams.home.name}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="rounded-2xl bg-black/40 px-6 py-4">
                      <p className="text-3xl font-black text-[#D4AF37]">
                        {match.goals.home ?? "-"} : {match.goals.away ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-black">
                      {match.teams.away.name}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/50">
                  <span>Fixture ID: {match.fixture.id}</span>
                  <span>Season: {match.league.season}</span>
                  <span>Round: {match.league.round || "N/A"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}