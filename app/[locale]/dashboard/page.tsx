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

        if (data.success) {
          setFixtures(data.fixtures);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadFixtures();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      <Hero />

      <div className="mt-10">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white">
            Loading live football fixtures...
          </div>
        ) : (
          <FixturesList fixtures={fixtures} />
        )}
      </div>
    </main>
  );
}