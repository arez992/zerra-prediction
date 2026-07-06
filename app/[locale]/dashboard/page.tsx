"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [fixtures, setFixtures] = useState([]);
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

  if (loading) {
    return (
      <div className="p-8 text-center text-xl">
        Loading today's matches...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">
        Today's Football Fixtures
      </h1>

      <div className="grid gap-5">
        {fixtures.map((match: any) => (
          <div
            key={match.fixture.id}
            className="rounded-xl border p-5 shadow"
          >
            <div className="text-gray-500 text-sm">
              {match.league.name}
            </div>

            <div className="flex justify-between items-center mt-3">
              <span className="font-semibold">
                {match.teams.home.name}
              </span>

              <span className="font-bold">
                {match.goals.home ?? "-"} :
                {match.goals.away ?? "-"}
              </span>

              <span className="font-semibold">
                {match.teams.away.name}
              </span>
            </div>

            <div className="mt-3 text-sm text-gray-500">
              {match.fixture.status.long}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}