"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Hero from "@/components/dashboard/Hero";
import SearchBox from "@/components/dashboard/SearchBox";
import DateSelector from "@/components/dashboard/DateSelector";
import FixturesList from "@/components/dashboard/FixturesList";
import { useVip } from "@/components/providers/VipProvider";
import { useDashboardPredictions } from "@/hooks/useDashboardPredictions";

type FilterType =
  | "all"
  | "live"
  | "upcoming"
  | "finished";

const LIVE_STATUSES = [
  "1H",
  "2H",
  "HT",
  "ET",
  "P",
];

const FINISHED_STATUSES = [
  "FT",
  "AET",
  "PEN",
];

function getToday() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

export default function DashboardPage() {
  const {
    isVip,
    loading: vipLoading,
  } = useVip();

  const [fixtures, setFixtures] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<FilterType>("all");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedLeague,
    setSelectedLeague,
  ] = useState("all");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(getToday());

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadFixtures() {
      try {
        setLoading(true);

        const response =
          await fetch(
            `/api/sports/football/fixtures?date=${selectedDate}`,
            {
              cache: "no-store",
              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          throw new Error(
            "Fixture request failed"
          );
        }

        const data =
          await response.json();

        if (
          data?.success &&
          Array.isArray(
            data.fixtures
          )
        ) {
          setFixtures(
            data.fixtures
          );
        } else {
          setFixtures([]);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Failed to load fixtures:",
          error
        );

        setFixtures([]);
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(false);
        }
      }
    }

    loadFixtures();

    const interval =
      window.setInterval(
        loadFixtures,
        300000
      );

    return () => {
      controller.abort();
      window.clearInterval(
        interval
      );
    };
  }, [selectedDate]);

  const leagues = useMemo(() => {
    const unique =
      new Set<string>();

    fixtures.forEach(
      (match) => {
        if (
          match?.league?.name
        ) {
          unique.add(
            match.league.name
          );
        }
      }
    );

    return Array.from(
      unique
    ).sort();
  }, [fixtures]);

  const live = useMemo(
    () =>
      fixtures.filter(
        (match) =>
          LIVE_STATUSES.includes(
            match.fixture.status
              .short
          )
      ).length,
    [fixtures]
  );

  const finished = useMemo(
    () =>
      fixtures.filter(
        (match) =>
          FINISHED_STATUSES.includes(
            match.fixture.status
              .short
          )
      ).length,
    [fixtures]
  );

  const upcoming = useMemo(
    () =>
      fixtures.filter(
        (match) =>
          match.fixture.status
            .short === "NS"
      ).length,
    [fixtures]
  );

  const filteredFixtures =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return fixtures.filter(
        (match) => {
          const status =
            match.fixture.status
              .short;

          const matchesFilter =
            activeFilter ===
            "live"
              ? LIVE_STATUSES.includes(
                  status
                )
              : activeFilter ===
                "finished"
              ? FINISHED_STATUSES.includes(
                  status
                )
              : activeFilter ===
                "upcoming"
              ? status === "NS"
              : true;

          const matchesLeague =
            selectedLeague ===
              "all" ||
            match.league.name ===
              selectedLeague;

          const country =
            match.league
              .country ?? "";

          const matchesSearch =
            !search ||
            match.teams.home.name
              .toLowerCase()
              .includes(search) ||
            match.teams.away.name
              .toLowerCase()
              .includes(search) ||
            match.league.name
              .toLowerCase()
              .includes(search) ||
            country
              .toLowerCase()
              .includes(search);

          return (
            matchesFilter &&
            matchesLeague &&
            matchesSearch
          );
        }
      );
    }, [
      fixtures,
      activeFilter,
      searchTerm,
      selectedLeague,
    ]);

  const fixtureIds =
    useMemo(
      () =>
        filteredFixtures
          .map((match) =>
            Number(
              match.fixture.id
            )
          )
          .filter(
            (id) =>
              Number.isInteger(
                id
              ) && id > 0
          ),
      [filteredFixtures]
    );

  const {
    predictions,
    loadingIds:
      loadingPredictionIds,
    errorIds:
      predictionErrorIds,
  } =
    useDashboardPredictions({
      fixtureIds,
      enabled:
        !vipLoading &&
        isVip,
    });

  const stats = [
    {
      label: "Today's Matches",
      value: fixtures.length,
    },
    {
      label: "Live Now",
      value: live,
    },
    {
      label: "Finished",
      value: finished,
    },
    {
      label: "Upcoming",
      value: upcoming,
    },
  ];

  const filters: {
    label: string;
    value: FilterType;
  }[] = [
    {
      label: "All Matches",
      value: "all",
    },
    {
      label: "🔴 Live",
      value: "live",
    },
    {
      label: "⏰ Upcoming",
      value: "upcoming",
    },
    {
      label: "✅ Finished",
      value: "finished",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <Hero />

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(
          (item) => (
            <div
              key={
                item.label
              }
              className="rounded-3xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-sm text-white/50">
                {item.label}
              </p>

              <p className="mt-2 text-3xl font-black text-[#D4AF37]">
                {item.value}
              </p>
            </div>
          )
        )}
      </section>

      <div className="mt-8">
        <DateSelector
          selectedDate={
            selectedDate
          }
          onDateChange={
            setSelectedDate
          }
        />
      </div>

      <div className="mt-8">
        <SearchBox
          searchTerm={
            searchTerm
          }
          onSearchChange={
            setSearchTerm
          }
        />
      </div>

      <section className="mt-8 rounded-3xl border-2 border-[#D4AF37]/60 bg-[#0B1220] p-4 shadow-xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          League Filter
        </p>

        <select
          value={
            selectedLeague
          }
          onChange={(event) =>
            setSelectedLeague(
              event.target.value
            )
          }
          className="w-full rounded-2xl bg-black/50 px-5 py-4 text-sm font-black text-white outline-none"
        >
          <option value="all">
            🌍 All Leagues
          </option>

          {leagues.map(
            (league) => (
              <option
                key={league}
                value={league}
              >
                {league}
              </option>
            )
          )}
        </select>
      </section>

      <section className="mt-8 rounded-3xl border-2 border-[#D4AF37]/60 bg-[#0B1220] p-4 shadow-xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          Match Filters
        </p>

        <div className="flex flex-wrap gap-3">
          {filters.map(
            (filter) => (
              <button
                key={
                  filter.value
                }
                type="button"
                onClick={() =>
                  setActiveFilter(
                    filter.value
                  )
                }
                className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                  activeFilter ===
                  filter.value
                    ? "bg-[#D4AF37] text-black"
                    : "bg-black/50 text-white hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            )
          )}
        </div>
      </section>

      <div className="mt-10">
        {loading ||
        vipLoading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-lg text-white">
            Loading live football fixtures...
          </div>
        ) : (
          <FixturesList
            fixtures={
              filteredFixtures
            }
            isVip={isVip}
            predictions={
              predictions
            }
            loadingPredictionIds={
              loadingPredictionIds
            }
            predictionErrorIds={
              predictionErrorIds
            }
          />
        )}
      </div>
    </main>
  );
}