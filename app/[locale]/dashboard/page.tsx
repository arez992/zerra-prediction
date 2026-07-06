"use client";

import { useEffect, useMemo, useState } from "react";
import Hero from "@/components/dashboard/Hero";
import SearchBox from "@/components/dashboard/SearchBox";
import FixturesList from "@/components/dashboard/FixturesList";

type FilterType = "all" | "live" | "upcoming" | "finished";

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "P"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

export default function DashboardPage() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
    const search = searchTerm.trim().toLowerCase();

    return fixtures.filter((m) => {
      const status = m.fixture.status.short;

      const matchesFilter =
        activeFilter === "live"
          ? LIVE_STATUSES.includes(status)
          : activeFilter === "finished"
          ? FINISHED_STATUSES.includes(status)
          : activeFilter === "upcoming"
          ? status === "NS"
          : true;

      const matchesSearch =
        !search ||
        m.teams.home.name.toLowerCase().includes(search) ||
        m.teams.away.name.toLowerCase().includes(search) ||
        m.league.name.toLowerCase().includes(search) ||
        m.league.country.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [fixtures, activeFilter, searchTerm]);

  const stats = [
    { label: "Today's Matches", value: fixtures.length },
    { label: "Live Now", value: live },
    { label: "Finished", value: finished },
    { label: "Upcoming", value: upcoming },
  ];

  const filters: { label: string; value: FilterType }[] = [
    { label: "All Matches", value: "all" },
    { label: "🔴 Live", value: "live" },
    { label: "⏰ Upcoming", value: "upcoming" },
    { label: "✅ Finished", value: "finished" },
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
        <SearchBox
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <section className="mt-8 rounded-3xl border-2 border-[#D4AF37]/60 bg-[#0B1220] p-4 shadow-xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          Match Filters
        </p>

        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                activeFilter === filter.value
                  ? "bg-[#D4AF37] text-black"
                  : "bg-black/50 text-white hover:bg-white/10"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

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