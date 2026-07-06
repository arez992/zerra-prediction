"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function MatchDetailsPage() {
  const params = useParams();
  const fixtureId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    async function loadMatch() {
      try {
        const res = await fetch(
          `/api/sports/football/match?fixture=${fixtureId}`,
          { cache: "no-store" }
        );

        const data = await res.json();
        setMatch(data);
      } catch (error) {
        console.error("Failed to load match:", error);
      } finally {
        setLoading(false);
      }
    }

    if (fixtureId) loadMatch();
  }, [fixtureId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          Loading match details...
        </div>
      </main>
    );
  }

  if (!match?.fixture) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <Link href="/en/dashboard" className="text-sm font-bold text-[#D4AF37]">
          ← Back to Dashboard
        </Link>

        <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/30 bg-[#0B1220] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#D4AF37]/10 text-4xl">
            ⚠️
          </div>

          <h1 className="mt-6 text-4xl font-black">
            Match Data Unavailable
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Match details are not available right now. This may happen when the
            API daily limit is reached, the match ID has expired, or the data
            provider has not returned details yet.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-6 text-left">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#D4AF37]">
              Premium Preview
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <PreviewCard title="AI Prediction" value="Locked" />
              <PreviewCard title="Match Statistics" value="Waiting API" />
              <PreviewCard title="Lineups & Events" value="Coming Soon" />
            </div>
          </div>

          <Link
            href="/en/vip"
            className="mt-8 inline-block rounded-full bg-[#D4AF37] px-7 py-3 font-black text-black"
          >
            Unlock VIP Analysis
          </Link>
        </section>
      </main>
    );
  }

  const fixture = match.fixture;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white">
      <Link href="/en/dashboard" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Dashboard
      </Link>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-2xl md:p-10">
        <p className="text-center text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
          {fixture.league.name}
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-3 md:items-center">
          <TeamBlock
            logo={fixture.teams.home.logo}
            name={fixture.teams.home.name}
          />

          <div className="text-center">
            <div className="rounded-3xl bg-black/40 p-6">
              <p className="text-6xl font-black text-[#D4AF37]">
                {fixture.goals.home ?? "-"} : {fixture.goals.away ?? "-"}
              </p>
              <p className="mt-3 text-white/50">
                {fixture.fixture.status.long}
              </p>
            </div>
          </div>

          <TeamBlock
            logo={fixture.teams.away.logo}
            name={fixture.teams.away.name}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <PreviewCard title="AI Confidence" value="92%" />
        <PreviewCard title="Best Pick" value="Over 2.5" />
        <PreviewCard title="Risk Level" value="Medium" />
      </section>

      <section className="mt-8 rounded-3xl border border-[#D4AF37]/20 bg-black/20 p-6">
        <h2 className="text-2xl font-black">🤖 AI Match Analysis</h2>
        <p className="mt-3 text-white/60">
          Advanced prediction, statistics, events, lineups, and value-bet
          analysis will appear here when API data is available.
        </p>
      </section>
    </main>
  );
}

function TeamBlock({ logo, name }: { logo: string; name: string }) {
  return (
    <div className="text-center">
      {logo && (
        <img
          src={logo}
          alt={name}
          className="mx-auto h-24 w-24 rounded-full bg-white object-contain p-2"
        />
      )}
      <h2 className="mt-4 text-2xl font-black">{name}</h2>
    </div>
  );
}

function PreviewCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}