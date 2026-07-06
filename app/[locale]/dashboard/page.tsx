"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/dashboard/Hero";
import DashboardStats from "@/components/dashboard/DashboardStats";
import FixturesList from "@/components/dashboard/FixturesList";

export default function DashboardPage() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFixtures() {
      try {
        const res = await fetch("/api/sports/football/fixtures");
        const data = await res.json();

        if (data.success) {
          setFixtures(data.fixtures);
        }
      } catch (error) {
        console.error("Failed to load fixtures:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFixtures();
  }, []);

  const live = fixtures.filter((match: any) =>
    ["1H", "2H", "HT", "ET", "P"].includes(match.fixture.status.short)
  ).length;

  const finished = fixtures.filter((match: any) =>
    ["FT", "AET", "PEN"].includes(match.fixture.status.short)
  ).length;

  const upcoming = fixtures.filter(
    (match: any) => match.fixture.status.short === "NS"
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Hero />

      <div className="mt-8">
        <DashboardStats
          total={fixtures.length}
          live={live}
          finished={finished}
          upcoming={upcoming}
        />
      </div>

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