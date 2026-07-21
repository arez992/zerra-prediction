"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Fixture = {
  fixture?: {
    id?: number | string;
    date?: string;
    status?: {
      short?: string;
      long?: string;
    };
  };

  league?: {
    name?: string;
    country?: string;
    round?: string;
  };

  teams?: {
    home?: {
      id?: number;
      name?: string;
    };

    away?: {
      id?: number;
      name?: string;
    };
  };
};

type FixturesResponse = {
  success: boolean;
  date?: string;
  count?: number;
  fixtures?: Fixture[];
  error?: string;
};

type GenerationItem = {
  fixtureId?: string;
  generated?: boolean;
  skipped?: boolean;
  reason?: string;
  predictionId?: string | null;
  generationStatus?: string;
  publicationDecision?: string;
  finalStatus?: string | null;
};

type GenerationResponse = {
  success: boolean;
  message?: string;
  error?: string;
  fixtureId?: string | null;
  item?: GenerationItem | null;
};

function getTodayUTC(): string {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}

function formatKickoff(
  value?: string
): string {
  if (!value) {
    return "TBD";
  }

  const date =
    new Date(
      value
    );

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
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    date
  );
}

function normalizeFixtureId(
  value:
    unknown
): string {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  return String(
    value
  ).trim();
}

export default function AdminMatchesPage() {
  const [date, setDate] =
    useState(
      getTodayUTC()
    );

  const [fixtures, setFixtures] =
    useState<Fixture[]>(
      []
    );

  const [loading, setLoading] =
    useState(
      true
    );

  const [error, setError] =
    useState(
      ""
    );

  const [
    generatingFixtureId,
    setGeneratingFixtureId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    fixtureMessages,
    setFixtureMessages,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

  const [
    fixtureResults,
    setFixtureResults,
  ] =
    useState<
      Record<
        string,
        GenerationItem | null
      >
    >(
      {}
    );

  async function loadFixtures(
    selectedDate:
      string
  ) {
    try {
      setLoading(
        true
      );

      setError(
        ""
      );

      const response =
        await fetch(
          `/api/sports/football/fixtures?date=${encodeURIComponent(
            selectedDate
          )}`,
          {
            cache:
              "no-store",
          }
        );

      const raw =
        await response.text();

      let data:
        FixturesResponse;

      try {
        data =
          raw
            ? (
                JSON.parse(
                  raw
                ) as FixturesResponse
              )
            : {
                success:
                  false,

                error:
                  "The server returned an empty response.",
              };
      } catch {
        throw new Error(
          "The fixtures service returned invalid JSON."
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to load fixtures."
        );
      }

      setFixtures(
        Array.isArray(
          data.fixtures
        )
          ? data.fixtures
          : []
      );
    } catch (
      requestError
    ) {
      setFixtures(
        []
      );

      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Unable to load fixtures."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  useEffect(
    () => {
      void loadFixtures(
        date
      );
    },
    [
      date,
    ]
  );

  const sortedFixtures =
    useMemo(
      () =>
        [
          ...fixtures,
        ].sort(
          (
            first,
            second
          ) => {
            const firstTime =
              first.fixture
                ?.date
                ? new Date(
                    first.fixture.date
                  ).getTime()
                : 0;

            const secondTime =
              second.fixture
                ?.date
                ? new Date(
                    second.fixture.date
                  ).getTime()
                : 0;

            return (
              firstTime -
              secondTime
            );
          }
        ),
      [
        fixtures,
      ]
    );

  async function generatePrediction(
    fixture:
      Fixture
  ) {
    const fixtureId =
      normalizeFixtureId(
        fixture.fixture
          ?.id
      );

    if (
      !fixtureId
    ) {
      return;
    }

    try {
      setGeneratingFixtureId(
        fixtureId
      );

      setFixtureMessages(
        (
          previous
        ) => ({
          ...previous,

          [
            fixtureId
          ]:
            "",
        })
      );

      setFixtureResults(
        (
          previous
        ) => ({
          ...previous,

          [
            fixtureId
          ]:
            null,
        })
      );

      const response =
        await fetch(
          "/api/admin/predictions/generate",
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                date,

                fixtureId,

                mode:
                  "enriched",

                overwrite:
                  false,
              }),
          }
        );

      const raw =
        await response.text();

      let data:
        GenerationResponse;

      try {
        data =
          raw
            ? (
                JSON.parse(
                  raw
                ) as GenerationResponse
              )
            : {
                success:
                  false,

                error:
                  "The server returned an empty response.",
              };
      } catch {
        throw new Error(
          "The prediction service returned invalid JSON."
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Prediction generation failed."
        );
      }

      setFixtureResults(
        (
          previous
        ) => ({
          ...previous,

          [
            fixtureId
          ]:
            data.item ||
            null,
        })
      );

      setFixtureMessages(
        (
          previous
        ) => ({
          ...previous,

          [
            fixtureId
          ]:
            data.message ||
            "Prediction generation completed.",
        })
      );
    } catch (
      requestError
    ) {
      setFixtureMessages(
        (
          previous
        ) => ({
          ...previous,

          [
            fixtureId
          ]:
            requestError instanceof
              Error
              ? requestError.message
              : "Prediction generation failed.",
        })
      );
    } finally {
      setGeneratingFixtureId(
        null
      );
    }
  }

  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Daily Operations
            </p>

            <h1 className="mt-3 text-3xl font-black md:text-5xl">
              Today&apos;s Matches
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50 md:text-base">
              View football fixtures for the
              selected date and generate one
              enriched ZERRA prediction directly
              for any eligible pre-match fixture.
            </p>
          </div>

          <label className="block w-full max-w-xs">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
              Fixture Date
            </span>

            <input
              type="date"
              value={
                date
              }
              onChange={(
                event
              ) =>
                setDate(
                  event
                    .target
                    .value
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-white outline-none transition focus:border-[#D4AF37]/50"
            />
          </label>
        </header>

        <section className="mt-8 rounded-[1.7rem] border border-white/10 bg-[#101827] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">
                Fixtures
              </p>

              <p className="mt-2 text-2xl font-black">
                {
                  sortedFixtures.length
                }{" "}
                matches
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadFixtures(
                  date
                )
              }
              disabled={
                loading
              }
              className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-black text-white/60 transition hover:border-[#D4AF37]/35 hover:text-[#D4AF37] disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-3xl border border-red-500/25 bg-red-500/10 p-5 text-sm leading-7 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-12 text-center text-white/40">
            Loading fixtures...
          </div>
        ) : sortedFixtures.length ===
          0 ? (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-12 text-center text-white/40">
            No fixtures found for this date.
          </div>
        ) : (
          <section className="mt-8 grid gap-5 xl:grid-cols-2">
            {sortedFixtures.map(
              (
                fixture
              ) => {
                const fixtureId =
                  normalizeFixtureId(
                    fixture
                      .fixture
                      ?.id
                  );

                const status =
                  String(
                    fixture
                      .fixture
                      ?.status
                      ?.short ||
                      ""
                  )
                    .trim()
                    .toUpperCase();

                const eligible =
                  status ===
                    "NS" ||
                  status ===
                    "TBD";

                const generating =
                  generatingFixtureId ===
                  fixtureId;

                const result =
                  fixtureResults[
                    fixtureId
                  ];

                const message =
                  fixtureMessages[
                    fixtureId
                  ];

                return (
                  <article
                    key={
                      fixtureId
                    }
                    className="rounded-[1.8rem] border border-white/10 bg-[#101827] p-6 shadow-xl"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
                          {fixture
                            .league
                            ?.name ||
                            "Football"}
                        </p>

                        <p className="mt-2 text-xs text-white/35">
                          {fixture
                            .league
                            ?.country ||
                            "—"}

                          {fixture
                            .league
                            ?.round
                            ? ` · ${fixture.league.round}`
                            : ""}
                        </p>
                      </div>

                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white/50">
                        {status ||
                          "Unknown"}
                      </span>
                    </div>

                    <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                          Home
                        </p>

                        <p className="mt-2 text-lg font-black">
                          {fixture
                            .teams
                            ?.home
                            ?.name ||
                            "Home Team"}
                        </p>
                      </div>

                      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-black text-white/35">
                        VS
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                          Away
                        </p>

                        <p className="mt-2 text-lg font-black">
                          {fixture
                            .teams
                            ?.away
                            ?.name ||
                            "Away Team"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <InfoBox
                        label="Kickoff"
                        value={formatKickoff(
                          fixture
                            .fixture
                            ?.date
                        )}
                      />

                      <InfoBox
                        label="Fixture ID"
                        value={
                          fixtureId ||
                          "—"
                        }
                      />
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        disabled={
                          !eligible ||
                          !fixtureId ||
                          generating
                        }
                        onClick={() =>
                          void generatePrediction(
                            fixture
                          )
                        }
                        className="w-full rounded-full bg-[#D4AF37] px-5 py-3.5 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {generating
                          ? "Generating Prediction..."
                          : eligible
                            ? "Generate Prediction"
                            : "Prediction Unavailable"}
                      </button>

                      {!eligible && (
                        <p className="mt-3 text-center text-xs text-white/30">
                          Predictions can only be
                          generated before kickoff.
                        </p>
                      )}
                    </div>

                    {message && (
                      <div
                        className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
                          result
                            ?.generated
                            ? "border-green-500/20 bg-green-500/10 text-green-200"
                            : result
                                  ?.generationStatus ===
                                "withheld"
                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-100"
                              : "border-white/10 bg-black/20 text-white/55"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    {result && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <InfoBox
                          label="Generation"
                          value={
                            result
                              .generationStatus ||
                            "—"
                          }
                        />

                        <InfoBox
                          label="Publication"
                          value={
                            result
                              .publicationDecision ||
                            "—"
                          }
                        />

                        <InfoBox
                          label="Final Status"
                          value={
                            result
                              .finalStatus ||
                            "—"
                          }
                        />
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-white/70">
        {value}
      </p>
    </div>
  );
}