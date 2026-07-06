"use client";

import { useEffect, useMemo, useState } from "react";
import Hero from "@/components/dashboard/Hero";
import FilterBar from "@/components/dashboard/FilterBar";
import FixturesList from "@/components/dashboard/FixturesList";

type FilterType = "all" | "live" | "upcoming" | "finished";

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "P"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

export default function DashboardPage() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    async function loadFixtures() {
      try {
        setLoading(true);

        const res = await fetch("/api/sports/football/fixtures", {
          cache: "no-store",
        });

        const data = await res.json();

        if (data?.success && Array.isArray(data.fixtures)) {
          setFixtures(data.fixtures);
        } else {
          setFixtures([]);
        }
      } catch (error) {
        console.error("Failed to load fixtures:", error);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    }

    loadFixtures();

    const interval = setInterval(loadFixtures, 30000);

    return () => clearInterval(interval);
  }, []);

  const live = fixtures.filter((m) =>
    LIVE_STATUSES.includes(m.fixture.status.short)
  ).length;

  const finished = fixtures.filter((m) =>
    FINISHED_STATUSES.includes(m.fixture.status.short)
  ).length;

  const upcoming = fixtures.filter(
    (m) => m.fixture.status.short === "NS"
  ).length;

  const filteredFixtures = useMemo(() => {
    return fixtures.filter((m) => {
      const status = m.fixture.status.short;

      if (activeFilter === "live") {
        return LIVE_STATUSES.includes(status);
      }

      if (activeFilter === "finished") {
        return FINISHED_STATUSES.includes(status);
      }

      if (activeFilter === "upcoming") {
        return status === "NS";
      }

      return true;
    });
  }, [fixtures, activeFilter]);

  const stats = [
    { label: "Today's Matches", value: fixtures.length },
    { label: "Live Now", value: live },
    { label: "Finished", value: finished },
    { label: "Upcoming", value: upcoming },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <Hero />

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <div className="mt-8">
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-lg text-white">
            Loading live football fixtures...
          </div>
        ) : (
          <FixturesList fixtures={filteredFixtures} />
        )}
      </div>
    </main>
  );
}