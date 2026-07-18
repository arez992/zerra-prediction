"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  useVip,
} from "@/components/providers/VipProvider";

import {
  useDashboardPredictions,
} from "@/hooks/useDashboardPredictions";

type FilterType =
  | "all"
  | "live"
  | "upcoming"
  | "finished";

type SortType =
  | "time"
  | "confidence";

type LeagueItem = {
  key: string;
  name: string;
  count: number;
};

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

function formatDateValue(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatDateValue(
    new Date()
  );
}

function getTomorrow() {
  const date =
    new Date();

  date.setDate(
    date.getDate() + 1
  );

  return formatDateValue(
    date
  );
}

function formatMatchTime(
  value?: string
): string {
  if (!value) {
    return "TBD";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "TBD";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(date);
}

function normalizeLeagueKey(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\u00c0-\u024f]+/g,
      ""
    );
}

function getGoalPrediction(
  prediction: any
) {
  if (!prediction) {
    return null;
  }

  const over25 =
    Number(
      prediction.over25 ??
        0
    );

  const under25 =
    Number(
      prediction.under25 ??
        0
    );

  if (
    over25 >=
    under25
  ) {
    return {
      label:
        "Over 2.5 Goals",

      confidence:
        over25,
    };
  }

  return {
    label:
      "Under 2.5 Goals",

    confidence:
      under25,
  };
}

export default function DashboardPage() {
  const params =
    useParams<{
      locale: string;
    }>();

  const locale =
    params?.locale ||
    "en";

  const {
    isVip,
    loading:
      vipLoading,
  } =
    useVip();

  const [
    fixtures,
    setFixtures,
  ] =
    useState<any[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<FilterType>(
      "all"
    );

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    selectedLeague,
    setSelectedLeague,
  ] =
    useState(
      "all"
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      getToday()
    );

  const [
    sortType,
    setSortType,
  ] =
    useState<SortType>(
      "time"
    );

  const [
    showAllLeagues,
    setShowAllLeagues,
  ] =
    useState(
      false
    );

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadFixtures() {
      try {
        setLoading(
          true
        );

        const response =
          await fetch(
            `/api/sports/football/fixtures?date=${selectedDate}`,
            {
              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        if (
          !response.ok
        ) {
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
          setFixtures(
            []
          );
        }
      } catch (
        error
      ) {
        if (
          error instanceof
            Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Failed to load fixtures:",
          error
        );

        setFixtures(
          []
        );
      } finally {
        if (
          !controller
            .signal
            .aborted
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void loadFixtures();

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
  }, [
    selectedDate,
  ]);

  const leagues =
    useMemo<
      LeagueItem[]
    >(
      () => {
        const map =
          new Map<
            string,
            LeagueItem
          >();

        fixtures.forEach(
          (
            match
          ) => {
            const rawName =
              String(
                match
                  ?.league
                  ?.name ||
                  ""
              ).trim();

            if (
              !rawName
            ) {
              return;
            }

            const key =
              normalizeLeagueKey(
                rawName
              );

            const current =
              map.get(
                key
              );

            if (
              current
            ) {
              current.count +=
                1;

              return;
            }

            map.set(
              key,
              {
                key,
                name:
                  rawName,
                count:
                  1,
              }
            );
          }
        );

        return Array.from(
          map.values()
        ).sort(
          (
            first,
            second
          ) => {
            if (
              second.count !==
              first.count
            ) {
              return (
                second.count -
                first.count
              );
            }

            return first.name.localeCompare(
              second.name
            );
          }
        );
      },
      [
        fixtures,
      ]
    );

  const visibleLeagues =
    showAllLeagues
      ? leagues
      : leagues.slice(
          0,
          10
        );

  const live =
    useMemo(
      () =>
        fixtures.filter(
          (
            match
          ) =>
            LIVE_STATUSES.includes(
              match
                ?.fixture
                ?.status
                ?.short
            )
        ).length,
      [
        fixtures,
      ]
    );

  const finished =
    useMemo(
      () =>
        fixtures.filter(
          (
            match
          ) =>
            FINISHED_STATUSES.includes(
              match
                ?.fixture
                ?.status
                ?.short
            )
        ).length,
      [
        fixtures,
      ]
    );

  const upcoming =
    useMemo(
      () =>
        fixtures.filter(
          (
            match
          ) =>
            match
              ?.fixture
              ?.status
              ?.short ===
            "NS"
        ).length,
      [
        fixtures,
      ]
    );

  const filteredFixtures =
    useMemo(
      () => {
        const search =
          searchTerm
            .trim()
            .toLowerCase();

        return fixtures.filter(
          (
            match
          ) => {
            const status =
              match
                ?.fixture
                ?.status
                ?.short;

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
                    ? status ===
                      "NS"
                    : true;

            const leagueName =
              String(
                match
                  ?.league
                  ?.name ||
                  ""
              );

            const leagueKey =
              normalizeLeagueKey(
                leagueName
              );

            const matchesLeague =
              selectedLeague ===
                "all" ||
              leagueKey ===
                selectedLeague;

            const country =
              String(
                match
                  ?.league
                  ?.country ||
                  ""
              );

            const home =
              String(
                match
                  ?.teams
                  ?.home
                  ?.name ||
                  ""
              );

            const away =
              String(
                match
                  ?.teams
                  ?.away
                  ?.name ||
                  ""
              );

            const matchesSearch =
              !search ||
              home
                .toLowerCase()
                .includes(
                  search
                ) ||
              away
                .toLowerCase()
                .includes(
                  search
                ) ||
              leagueName
                .toLowerCase()
                .includes(
                  search
                ) ||
              country
                .toLowerCase()
                .includes(
                  search
                );

            return (
              matchesFilter &&
              matchesLeague &&
              matchesSearch
            );
          }
        );
      },
      [
        fixtures,
        activeFilter,
        searchTerm,
        selectedLeague,
      ]
    );

  const fixtureIds =
    useMemo(
      () =>
        filteredFixtures
          .map(
            (
              match
            ) =>
              Number(
                match
                  ?.fixture
                  ?.id
              )
          )
          .filter(
            (
              id
            ) =>
              Number.isInteger(
                id
              ) &&
              id >
                0
          ),
      [
        filteredFixtures,
      ]
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

  const sortedFixtures =
    useMemo(
      () => {
        const items =
          [
            ...filteredFixtures,
          ];

        if (
          sortType ===
            "confidence" &&
          isVip
        ) {
          items.sort(
            (
              first,
              second
            ) => {
              const firstPrediction =
                predictions[
                  Number(
                    first
                      ?.fixture
                      ?.id
                  )
                ];

              const secondPrediction =
                predictions[
                  Number(
                    second
                      ?.fixture
                      ?.id
                  )
                ];

              return (
                Number(
                  secondPrediction
                    ?.confidence ??
                    0
                ) -
                Number(
                  firstPrediction
                    ?.confidence ??
                    0
                )
              );
            }
          );

          return items;
        }

        items.sort(
          (
            first,
            second
          ) =>
            new Date(
              first
                ?.fixture
                ?.date ??
                0
            ).getTime() -
            new Date(
              second
                ?.fixture
                ?.date ??
                0
            ).getTime()
        );

        return items;
      },
      [
        filteredFixtures,
        predictions,
        sortType,
        isVip,
      ]
    );

  const loadedPredictions =
    useMemo(
      () =>
        Object.values(
          predictions
        ).filter(
          Boolean
        ),
      [
        predictions,
      ]
    );

  const averageConfidence =
    useMemo(
      () => {
        if (
          loadedPredictions.length ===
          0
        ) {
          return null;
        }

        return Math.round(
          loadedPredictions.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item
                  ?.confidence ??
                  0
              ),
            0
          ) /
            loadedPredictions.length
        );
      },
      [
        loadedPredictions,
      ]
    );

  const filters: {
    label: string;
    value: FilterType;
    count: number;
  }[] = [
    {
      label:
        "All Matches",
      value:
        "all",
      count:
        fixtures.length,
    },
    {
      label:
        "Live",
      value:
        "live",
      count:
        live,
    },
    {
      label:
        "Upcoming",
      value:
        "upcoming",
      count:
        upcoming,
    },
    {
      label:
        "Finished",
      value:
        "finished",
      count:
        finished,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#102117]">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_290px]">
        <aside className="hidden border-r border-[#e1e9e3] bg-white lg:block">
          <div className="sticky top-[76px] max-h-[calc(100vh-76px)] overflow-y-auto px-5 py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a978e]">
              Predictions
            </p>

            <div className="mt-4 grid gap-1.5">
              {filters.map(
                (
                  filter
                ) => (
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
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                      activeFilter ===
                      filter.value
                        ? "bg-[#e8f6ed] text-[#08763b]"
                        : "text-[#506056] hover:bg-[#f5f8f6]"
                    }`}
                  >
                    <span>
                      {
                        filter.label
                      }
                    </span>

                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px]">
                      {
                        filter.count
                      }
                    </span>
                  </button>
                )
              )}
            </div>

            <div className="mt-7 border-t border-[#e7eee9] pt-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a978e]">
                Filter by Competition
              </p>

              <div className="mt-3 grid gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLeague(
                      "all"
                    )
                  }
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-bold ${
                    selectedLeague ===
                    "all"
                      ? "bg-[#e8f6ed] text-[#08763b]"
                      : "text-[#5f6d64] hover:bg-[#f5f8f6]"
                  }`}
                >
                  <span>
                    All Competitions
                  </span>

                  <span className="text-[10px]">
                    {
                      fixtures.length
                    }
                  </span>
                </button>

                {visibleLeagues.map(
                  (
                    league
                  ) => (
                    <button
                      key={
                        league.key
                      }
                      type="button"
                      onClick={() =>
                        setSelectedLeague(
                          league.key
                        )
                      }
                      className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-bold ${
                        selectedLeague ===
                        league.key
                          ? "bg-[#e8f6ed] text-[#08763b]"
                          : "text-[#5f6d64] hover:bg-[#f5f8f6]"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {
                          league.name
                        }
                      </span>

                      <span className="ml-3 shrink-0 text-[10px]">
                        {
                          league.count
                        }
                      </span>
                    </button>
                  )
                )}

                {leagues.length >
                  10 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllLeagues(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="mt-1 rounded-xl px-4 py-2.5 text-left text-xs font-black text-[#139653] transition hover:bg-[#eaf7ef]"
                  >
                    {showAllLeagues
                      ? "Show Less ↑"
                      : `More Competitions (${leagues.length - 10}) ↓`}
                  </button>
                )}
              </div>
            </div>

            {!isVip && (
              <div className="mt-7 rounded-2xl border border-[#dce8df] bg-[#fbfdfb] p-5">
                <p className="text-sm font-black">
                  Upgrade to VIP
                </p>

                <p className="mt-2 text-xs leading-6 text-[#66756c]">
                  Unlock full AI
                  predictions,
                  confidence signals,
                  exact-score
                  estimates, and
                  premium analysis.
                </p>

                <Link
                  href={`/${locale}/vip`}
                  className="mt-5 flex justify-center rounded-xl bg-[#139653] px-4 py-3 text-xs font-black text-white transition hover:bg-[#0d7a40]"
                >
                  View VIP Plans →
                </Link>
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 px-4 py-8 md:px-7 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#139653]">
              ZERRA Predictions
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              All Predictions
            </h1>

            <p className="mt-2 text-sm text-[#66756c]">
              AI-powered
              predictions for real
              upcoming football
              matches.
            </p>
          </div>

          <div className="mt-7 rounded-2xl border border-[#dce8df] bg-white p-3 shadow-[0_4px_20px_rgba(20,70,40,0.03)]">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {filters.map(
                  (
                    filter
                  ) => (
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
                      className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeFilter ===
                        filter.value
                          ? "bg-[#139653] text-white shadow-sm"
                          : "bg-[#f7faf8] text-[#506056] hover:bg-[#eaf7ef]"
                      }`}
                    >
                      {
                        filter.label
                      }

                      <span className="ml-2 opacity-60">
                        {
                          filter.count
                        }
                      </span>
                    </button>
                  )
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      getToday()
                    )
                  }
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    selectedDate ===
                    getToday()
                      ? "bg-[#e8f6ed] text-[#08763b]"
                      : "bg-[#f7faf8] text-[#66756c]"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      getTomorrow()
                    )
                  }
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    selectedDate ===
                    getTomorrow()
                      ? "bg-[#e8f6ed] text-[#08763b]"
                      : "bg-[#f7faf8] text-[#66756c]"
                  }`}
                >
                  Tomorrow
                </button>

                <input
                  type="date"
                  value={
                    selectedDate
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedDate(
                      event
                        .target
                        .value
                    )
                  }
                  className="rounded-xl border border-[#dce8df] bg-white px-4 py-2.5 text-sm font-bold text-[#506056] outline-none focus:border-[#139653]"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_200px]">
            <input
              type="search"
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event
                    .target
                    .value
                )
              }
              placeholder="Search matches, teams or competitions..."
              className="rounded-xl border border-[#dce8df] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#139653]"
            />

            <select
              value={
                selectedLeague
              }
              onChange={(
                event
              ) =>
                setSelectedLeague(
                  event
                    .target
                    .value
                )
              }
              className="rounded-xl border border-[#dce8df] bg-white px-4 py-3 text-sm font-bold text-[#506056] outline-none"
            >
              <option value="all">
                All Competitions
              </option>

              {leagues.map(
                (
                  league
                ) => (
                  <option
                    key={
                      league.key
                    }
                    value={
                      league.key
                    }
                  >
                    {
                      league.name
                    }
                  </option>
                )
              )}
            </select>

            <select
              value={
                sortType
              }
              onChange={(
                event
              ) =>
                setSortType(
                  event
                    .target
                    .value as
                    SortType
                )
              }
              className="rounded-xl border border-[#dce8df] bg-white px-4 py-3 text-sm font-bold text-[#506056] outline-none"
            >
              <option value="time">
                Sort by Match Time
              </option>

              <option
                value="confidence"
                disabled={
                  !isVip
                }
              >
                Sort by Confidence
              </option>
            </select>
          </div>

          <div className="mt-6">
            {loading ||
            vipLoading ? (
              <div className="rounded-2xl border border-[#dce8df] bg-white p-12 text-center">
                <p className="font-black">
                  Loading football
                  fixtures...
                </p>
              </div>
            ) : sortedFixtures.length ===
              0 ? (
              <div className="rounded-2xl border border-dashed border-[#cfdcd2] bg-white p-12 text-center">
                <p className="text-xl font-black">
                  No matches found
                </p>

                <p className="mt-2 text-sm text-[#66756c]">
                  Try another date,
                  competition, or
                  filter.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-[0_6px_30px_rgba(20,70,40,0.04)]">
                <div className="hidden grid-cols-[1.8fr_0.55fr_1.05fr_0.6fr_0.4fr] gap-5 border-b border-[#e7eee9] bg-[#f7faf8] px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#89968d] xl:grid">
                  <span>
                    Match
                  </span>

                  <span>
                    Time
                  </span>

                  <span>
                    Prediction
                  </span>

                  <span>
                    Confidence
                  </span>

                  <span>
                    Access
                  </span>
                </div>

                <div className="divide-y divide-[#e7eee9]">
                  {sortedFixtures.map(
                    (
                      match
                    ) => {
                      const fixtureId =
                        Number(
                          match
                            ?.fixture
                            ?.id
                        );

                      const prediction =
                        predictions[
                          fixtureId
                        ];

                      const goalPrediction =
                        getGoalPrediction(
                          prediction
                        );

                      return (
                        <PredictionRow
                          key={
                            fixtureId
                          }
                          match={
                            match
                          }
                          locale={
                            locale
                          }
                          isVip={
                            isVip
                          }
                          prediction={
                            prediction
                          }
                          goalPrediction={
                            goalPrediction
                          }
                          loadingPrediction={
                            loadingPredictionIds.has(
                              fixtureId
                            )
                          }
                          predictionError={
                            predictionErrorIds.has(
                              fixtureId
                            )
                          }
                        />
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="mt-5 text-sm text-[#7d8b82]">
            Showing{" "}
            <strong className="text-[#102117]">
              {
                sortedFixtures.length
              }
            </strong>{" "}
            filtered matches from{" "}
            <strong className="text-[#102117]">
              {
                fixtures.length
              }
            </strong>{" "}
            total.
          </p>
        </section>

        <aside className="hidden border-l border-[#e1e9e3] bg-[#fbfdfb] xl:block">
          <div className="sticky top-[76px] max-h-[calc(100vh-76px)] overflow-y-auto px-5 py-8">
            <div className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-[0_6px_25px_rgba(20,70,40,0.03)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#839188]">
                Prediction Performance
              </p>

              <div className="mt-6 flex justify-center">
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-[11px] border-[#e8f6ed]">
                  <div className="text-center">
                    <p className="text-3xl font-black text-[#139653]">
                      {averageConfidence !==
                      null
                        ? `${averageConfidence}%`
                        : "—"}
                    </p>

                    <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-[#89968d]">
                      Avg Confidence
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-2.5">
                <SideStat
                  label="Matches"
                  value={
                    fixtures.length
                  }
                />

                <SideStat
                  label="Live"
                  value={
                    live
                  }
                />

                <SideStat
                  label="Upcoming"
                  value={
                    upcoming
                  }
                />

                <SideStat
                  label="AI Predictions"
                  value={
                    loadedPredictions.length
                  }
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#dce8df] bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#839188]">
                How We Predict
              </p>

              <div className="mt-5 grid gap-5">
                <FeatureItem
                  title="Advanced AI"
                  description="ZERRA evaluates football data through its prediction and intelligence engine."
                />

                <FeatureItem
                  title="Real-time Data"
                  description="Fixtures and competition information come from the live football data pipeline."
                />

                <FeatureItem
                  title="Confidence Analysis"
                  description="Confidence reflects model evidence, reliability, uncertainty, and data quality."
                />
              </div>
            </div>

            {!isVip && (
              <div className="mt-5 rounded-2xl bg-[#102117] p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#f3c84b]">
                  ZERRA VIP
                </p>

                <h3 className="mt-3 text-2xl font-black">
                  Unlock VIP
                  Predictions
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/65">
                  Access full AI
                  predictions,
                  confidence signals,
                  exact scores, and
                  premium match
                  intelligence.
                </p>

                <Link
                  href={`/${locale}/vip`}
                  className="mt-5 flex justify-center rounded-xl bg-[#f1c84b] px-4 py-3 text-sm font-black text-[#102117]"
                >
                  Upgrade to VIP →
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function PredictionRow({
  match,
  locale,
  isVip,
  prediction,
  goalPrediction,
  loadingPrediction,
  predictionError,
}: {
  match: any;
  locale: string;
  isVip: boolean;
  prediction: any;
  goalPrediction: {
    label: string;
    confidence: number;
  } | null;
  loadingPrediction: boolean;
  predictionError: boolean;
}) {
  const fixtureId =
    Number(
      match
        ?.fixture
        ?.id
    );

  const home =
    match
      ?.teams
      ?.home;

  const away =
    match
      ?.teams
      ?.away;

  const league =
    match
      ?.league
      ?.name ||
    "Football";

  return (
    <Link
      href={`/${locale}/match/${fixtureId}`}
      className="grid gap-5 px-5 py-5 transition hover:bg-[#fbfdfb] xl:grid-cols-[1.8fr_0.55fr_1.05fr_0.6fr_0.4fr] xl:items-center xl:gap-5"
    >
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#139653]">
          {league}
        </p>

        <div className="mt-3 grid grid-cols-[40px_minmax(0,1fr)_28px_40px] items-center gap-3">
          <TeamLogo
            logo={
              home?.logo
            }
            name={
              home?.name
            }
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-black">
              {home?.name ||
                "Home Team"}
            </p>

            <p className="mt-1 truncate text-sm font-black text-[#506056]">
              {away?.name ||
                "Away Team"}
            </p>
          </div>

          <span className="text-center text-[10px] font-black uppercase text-[#a0aaa3]">
            vs
          </span>

          <TeamLogo
            logo={
              away?.logo
            }
            name={
              away?.name
            }
          />
        </div>
      </div>

      <DashboardCell
        label="Time"
        value={formatMatchTime(
          match
            ?.fixture
            ?.date
        )}
      />

      <div>
        <DashboardLabel>
          Prediction
        </DashboardLabel>

        {!isVip ? (
          <div className="mt-1">
            <p className="text-sm font-black text-[#b58a16]">
              VIP Prediction
            </p>

            <p className="mt-1 text-xs text-[#8a978e]">
              Locked for VIP
              members
            </p>
          </div>
        ) : loadingPrediction ? (
          <p className="mt-1 text-sm font-bold text-[#7d8b82]">
            Loading AI
            prediction...
          </p>
        ) : predictionError ? (
          <div className="mt-1">
            <p className="text-sm font-black text-[#a66b00]">
              AI prediction
              temporarily
              unavailable
            </p>

            <p className="mt-1 text-[11px] text-[#8a978e]">
              Match data remains
              available
            </p>
          </div>
        ) : goalPrediction ? (
          <div className="mt-1">
            <p className="text-sm font-black text-[#139653]">
              {
                goalPrediction.label
              }
            </p>

            {prediction?.exactScore && (
              <p className="mt-1 text-xs text-[#7d8b82]">
                Exact score:{" "}
                {
                  prediction.exactScore
                }
              </p>
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm font-bold text-[#7d8b82]">
            Prediction pending
          </p>
        )}
      </div>

      <div>
        <DashboardLabel>
          Confidence
        </DashboardLabel>

        {isVip &&
        goalPrediction ? (
          <div className="mt-1 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#139653]">
            <span className="text-xs font-black">
              {Math.round(
                goalPrediction.confidence
              )}
              %
            </span>
          </div>
        ) : (
          <p className="mt-1 text-sm font-black text-[#9aa49d]">
            —
          </p>
        )}
      </div>

      <div>
        <DashboardLabel>
          Access
        </DashboardLabel>

        <span
          className={`mt-1 inline-flex rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wide ${
            isVip
              ? "bg-[#e8f6ed] text-[#08763b]"
              : "bg-[#fff6d9] text-[#a57900]"
          }`}
        >
          {isVip
            ? "VIP"
            : "Locked"}
        </span>
      </div>
    </Link>
  );
}

function TeamLogo({
  logo,
  name,
}: {
  logo?: string;
  name?: string;
}) {
  if (
    logo
  ) {
    return (
      <img
        src={logo}
        alt={
          name ||
          "Team"
        }
        className="h-10 w-10 object-contain"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7ef] text-sm font-black text-[#139653]">
      {(name ||
        "T")
        .slice(
          0,
          1
        )
        .toUpperCase()}
    </div>
  );
}

function DashboardCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <DashboardLabel>
        {label}
      </DashboardLabel>

      <p className="mt-1 text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function DashboardLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#8a978e] xl:hidden">
      {children}
    </p>
  );
}

function SideStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#f7faf8] px-4 py-3">
      <span className="text-xs font-bold text-[#66756c]">
        {label}
      </span>

      <span className="text-sm font-black">
        {value}
      </span>
    </div>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#7d8b82]">
        {description}
      </p>
    </div>
  );
}