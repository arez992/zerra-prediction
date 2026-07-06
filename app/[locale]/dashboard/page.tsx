"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/dashboard/Hero";
import FixturesList from "@/components/dashboard/FixturesList";

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

  const live = fixtures.filter((m: any) =>
    ["1H", "2H", "HT", "ET", "P"].includes(m.fixture.status.short)
  ).length;

  const finished = fixtures.filter((m: any) =>
    ["FT", "AET", "PEN"].includes(m.fixture.status.short)
  ).length;

  const upcoming = fixtures.filter(
    (m: any) => m.fixture.status.short === "NS"
  ).length;

  const stats = [
    { label: "Today's Matches", value: fixtures.length },
    { label: "Live Now", value: live },
    { label: "Finished", value: finished },
    { label: "Upcoming", value: upcoming },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Hero />

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <p className="text-sm text-white/50">{item.label}</p>
            <p className="mt-2 text-3xl font-black text-[#D4AF37]">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-10">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-lg text-white">
            Loading live football fixtures...
          </div>
        ) : (
          <FixturesList fixtures={fixtures} />
        )}
      </div>
    </main>
  );
}
