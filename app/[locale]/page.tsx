import Link from "next/link";

import PredictionVipAction from "@/components/predictions/PredictionVipAction";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type FixtureItem = {
  fixture?: {
    id?: number;
    date?: string;

    status?: {
      short?: string;
      long?: string;
      elapsed?: number | null;
    };
  };

  league?: {
    name?: string;
    country?: string;
    logo?: string;
  };

  teams?: {
    home?: {
      name?: string;
      logo?: string;
    };

    away?: {
      name?: string;
      logo?: string;
    };
  };

  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type PublicPredictionItem = {
  id: string;
  fixtureId: string;

  isFree?: boolean;
  freeSelectionDate?: string | null;

  competition: {
    name: string;
    country: string | null;
    round: string | null;
  };

  teams: {
    home: {
      name: string;
      logo: string | null;
    };

    away: {
      name: string;
      logo: string | null;
    };
  };

  fixtureDate: string | null;

  fixtureStatus: {
    short: string | null;
    long: string | null;
  };

  publicPrediction: {
    overview: string;
    risk: string;
    riskScore: number | null;
    marketCategory?: string | null;
    keyInsights: string[];
    teaser: string;
  };

  freePrediction?: {
    finalPrediction: string | null;
    confidence: number | null;
    exactScore: string | null;
    valueBet: string | null;
    reasoning: string[];
  } | null;
};

type PublicPredictionsResponse = {
  success: boolean;
  predictions?: PublicPredictionItem[];
};

type YesterdayGoalResultItem = {
  id: string;
  fixtureId: string;

  competition: {
    name: string;
    country: string | null;
  };

  teams: {
    home: {
      name: string;
      logo: string | null;
    };

    away: {
      name: string;
      logo: string | null;
    };
  };

  fixtureDate: string | null;

  prediction: {
    market:
      | "Over 2.5 Goals"
      | "Under 2.5 Goals";

    confidence: number;
  };

  result: {
    correct: boolean;

    status:
      | "correct"
      | "incorrect";

    finalScore: string;

    homeGoals: number;

    awayGoals: number;

    totalGoals: number;
  };

  settledAt: string | null;
};

type YesterdayGoalResultsResponse = {
  success: boolean;

  summary?: {
    totalPredictions: number;
    correctPredictions: number;
    incorrectPredictions: number;
    accuracyRate: number;
  };

  results?: YesterdayGoalResultItem[];
};

type YesterdayGoalResultsData = {
  summary: {
    totalPredictions: number;
    correctPredictions: number;
    incorrectPredictions: number;
    accuracyRate: number;
  };

  results: YesterdayGoalResultItem[];
};

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const UPCOMING_STATUS_CODES =
  new Set([
    "NS",
    "TBD",
  ]);

const LIVE_STATUS_CODES =
  new Set([
    "1H",
    "HT",
    "2H",
    "ET",
    "BT",
    "P",
    "SUSP",
    "INT",
    "LIVE",
  ]);

function isUpcomingFixture(
  fixture: FixtureItem
): boolean {
  const status =
    fixture.fixture
      ?.status
      ?.short;

  if (!status) {
    return false;
  }

  return UPCOMING_STATUS_CODES.has(
    status
  );
}

function isLiveFixture(
  fixture: FixtureItem
): boolean {
  const status =
    fixture.fixture
      ?.status
      ?.short;

  if (!status) {
    return false;
  }

  return LIVE_STATUS_CODES.has(
    status
  );
}

function sortFixturesByDate(
  fixtures: FixtureItem[]
): FixtureItem[] {
  return [
    ...fixtures,
  ].sort(
    (
      first,
      second
    ) => {
      const firstTime =
        first.fixture?.date
          ? new Date(
              first.fixture.date
            ).getTime()
          : Number.MAX_SAFE_INTEGER;

      const secondTime =
        second.fixture?.date
          ? new Date(
              second.fixture.date
            ).getTime()
          : Number.MAX_SAFE_INTEGER;

      return (
        firstTime -
        secondTime
      );
    }
  );
}

async function getFixtures(): Promise<
  FixtureItem[]
> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const response =
      await fetch(
        `${siteUrl}/api/sports/football/fixtures`,
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data =
      await response.json();

    if (
      data?.success &&
      Array.isArray(
        data.fixtures
      )
    ) {
      return data.fixtures;
    }

    return [];
  } catch {
    return [];
  }
}

function getTodayUTC(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

async function getFreePredictions(): Promise<
  PublicPredictionItem[]
> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const response =
      await fetch(
        `${siteUrl}/api/predictions?free=true&date=${getTodayUTC()}&limit=3`,
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data =
      (await response.json()) as
        PublicPredictionsResponse;

    if (
      data.success &&
      Array.isArray(
        data.predictions
      )
    ) {
      return data.predictions.slice(
        0,
        3
      );
    }

    return [];
  } catch {
    return [];
  }
}

async function getYesterdayGoalResults(): Promise<
  YesterdayGoalResultsData | null
> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const response =
      await fetch(
        `${siteUrl}/api/predictions/yesterday-results?limit=6`,
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const data =
      (await response.json()) as
        YesterdayGoalResultsResponse;

    if (
      !data.success ||
      !data.summary ||
      !Array.isArray(
        data.results
      )
    ) {
      return null;
    }

    return {
      summary:
        data.summary,

      results:
        data.results,
    };
  } catch {
    return null;
  }
}

function formatFixtureDate(
  value?: string | null
): string {
  if (!value) {
    return "Kickoff TBD";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Kickoff TBD";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(date);
}

export default async function HomePage({
  params,
}: PageProps) {
  const {
    locale,
  } =
    await params;

  const [
    fixtures,
    freePredictions,
    yesterdayResults,
  ] =
    await Promise.all([
      getFixtures(),
      getFreePredictions(),
      getYesterdayGoalResults(),
    ]);

  const sortedFixtures =
    sortFixturesByDate(
      fixtures
    );

  const liveFixtures =
    sortedFixtures.filter(
      isLiveFixture
    );

  const upcomingOnly =
    sortedFixtures.filter(
      isUpcomingFixture
    );

  const featuredFixture =
    liveFixtures[0] ||
    upcomingOnly[0] ||
    null;

  const featuredId =
    featuredFixture
      ?.fixture
      ?.id;

  const upcomingFixtures =
    upcomingOnly
      .filter(
        (
          fixture
        ) =>
          fixture.fixture?.id !==
          featuredId
      )
      .slice(
        0,
        4
      );

  function getPath(
    path: string
  ) {
    return `/${locale}${path}`;
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#102117]">
      <section className="relative overflow-hidden border-b border-[#e0ebe3] bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(19,150,83,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(19,150,83,0.06),transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-[#bfe6cf] bg-[#eaf7ef] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#0d6f3d]">
              AI Football Intelligence
            </span>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-[#102117] md:text-7xl">
              Smarter football
              predictions powered
              by real data.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#66756c] md:text-lg">
              ZERRA analyzes real
              football fixtures,
              match context,
              confidence signals,
              risk levels, and
              prediction insights
              through an AI-powered
              football intelligence
              system.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={getPath(
                  "/predictions"
                )}
                className="rounded-full bg-[#139653] px-7 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-[#0d6f3d]"
              >
                Explore Predictions
              </Link>

              <Link
                href={getPath(
                  "/dashboard"
                )}
                className="rounded-full border border-[#cfdcd2] bg-white px-7 py-3.5 text-sm font-black text-[#102117] transition hover:border-[#139653] hover:text-[#0d6f3d]"
              >
                View Matches
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <TrustItem
                title="Real Fixtures"
                description="Powered by live football data"
              />

              <TrustItem
                title="AI Analysis"
                description="Structured prediction intelligence"
              />

              <TrustItem
                title="VIP Access"
                description="Premium protected insights"
              />
            </div>
          </div>

          <div>
            {featuredFixture ? (
              <FeaturedMatch
                fixture={
                  featuredFixture
                }
                href={getPath(
                  `/match/${featuredFixture.fixture?.id}`
                )}
              />
            ) : (
              <div className="rounded-[2rem] border border-[#dce8df] bg-white p-8 shadow-[0_24px_70px_rgba(21,72,43,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#139653]">
                  Featured Match
                </p>

                <h2 className="mt-5 text-3xl font-black">
                  No upcoming match
                  is available right now
                </h2>

                <p className="mt-4 text-sm leading-7 text-[#66756c]">
                  ZERRA will display
                  the next available
                  football fixture here
                  as soon as the data
                  pipeline provides it.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeader
          eyebrow="Today's Football"
          title="Upcoming Matches"
          description="Upcoming football fixtures currently available through the ZERRA football data pipeline."
          actionHref={getPath(
            "/dashboard"
          )}
          actionLabel="View all matches"
        />

        {upcomingFixtures.length ===
        0 ? (
          <EmptyState message="No upcoming football fixtures are available right now." />
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {upcomingFixtures.map(
              (
                fixture
              ) => (
                <MatchCard
                  key={
                    fixture
                      .fixture
                      ?.id
                  }
                  fixture={
                    fixture
                  }
                  href={getPath(
                    `/match/${fixture.fixture?.id}`
                  )}
                />
              )
            )}
          </div>
        )}
      </section>

      {freePredictions.length > 0 && (
        <section className="border-y border-[#e0ebe3] bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <SectionHeader
              eyebrow="Daily Free Access"
              title="Free Predictions"
              description="Three Low Risk predictions selected automatically by ZERRA AI CEO for today's free access."
            />

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {freePredictions.map(
                (
                  prediction,
                  index
                ) => (
                  <DailyFreePredictionCard
                    key={
                      prediction.id
                    }
                    prediction={
                      prediction
                    }
                    number={
                      index + 1
                    }
                    locale={
                      locale
                    }
                  />
                )
              )}
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-[#e0ebe3] bg-[#f7faf8]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <SectionHeader
            eyebrow="Published Predictions"
            title="Latest Prediction Previews"
            description="Explore recently published football prediction previews from the ZERRA AI workflow."
            actionHref={getPath(
              "/predictions"
            )}
            actionLabel="View predictions"
          />

          {freePredictions.length ===
          0 ? (
            <EmptyState message="No published prediction previews are available right now." />
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {freePredictions.map(
                (
                  prediction,
                  index
                ) => (
                  <FreePredictionCard
                    key={
                      prediction.id
                    }
                    prediction={
                      prediction
                    }
                    number={
                      index + 1
                    }
                    locale={
                      locale
                    }
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>


      <section className="border-y border-[#e0ebe3] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <SectionHeader
            eyebrow="Yesterday's Performance"
            title="Yesterday's Goal Prediction Results"
            description="See how ZERRA's Over/Under 2.5 goal predictions performed in yesterday's completed football matches."
            actionHref={getPath(
              "/results/yesterday"
            )}
            actionLabel="View all results"
          />

          {!yesterdayResults ? (
            <EmptyState message="Yesterday's prediction results are temporarily unavailable." />
          ) : yesterdayResults
              .results
              .length ===
            0 ? (
            <EmptyState message="No settled goal prediction results are available for yesterday yet." />
          ) : (
            <>
              <YesterdaySummary
                summary={
                  yesterdayResults.summary
                }
              />

              <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-[#dce8df]">
                <div className="hidden grid-cols-[1.6fr_0.7fr_1fr_0.7fr_0.8fr_0.6fr] gap-4 border-b border-[#e7efe9] bg-[#f7faf8] px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#839188] lg:grid">
                  <span>
                    Match
                  </span>

                  <span>
                    Final Score
                  </span>

                  <span>
                    ZERRA Prediction
                  </span>

                  <span>
                    Actual Goals
                  </span>

                  <span>
                    Result
                  </span>

                  <span>
                    Confidence
                  </span>
                </div>

                <div className="divide-y divide-[#e7efe9]">
                  {yesterdayResults.results.map(
                    (
                      item
                    ) => (
                      <YesterdayResultRow
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  href={getPath(
                    "/results/yesterday"
                  )}
                  className="inline-flex rounded-full border border-[#cfdcd2] bg-white px-7 py-3 text-sm font-black text-[#102117] transition hover:border-[#139653] hover:text-[#0d6f3d]"
                >
                  View All Yesterday Results →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="overflow-hidden rounded-[2.25rem] bg-[#102117] px-6 py-10 text-white shadow-[0_30px_80px_rgba(15,50,30,0.16)] md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#a8e5c1]">
                ZERRA Premium
              </span>

              <h2 className="mt-5 max-w-3xl text-3xl font-black md:text-5xl">
                Explore premium
                football intelligence.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
                Access advanced
                prediction insights,
                full AI reasoning,
                confidence signals,
                exact-score estimates,
                and premium match
                intelligence.
              </p>
            </div>

            <Link
              href={getPath(
                "/vip"
              )}
              className="inline-flex justify-center rounded-full bg-[#22b76a] px-7 py-3.5 text-sm font-black text-white transition hover:bg-[#139653]"
            >
              Explore Premium Access
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeaturedMatch({
  fixture,
  href,
}: {
  fixture: FixtureItem;
  href: string;
}) {
  const home =
    fixture.teams?.home;

  const away =
    fixture.teams?.away;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#dce8df] bg-white shadow-[0_24px_70px_rgba(21,72,43,0.1)]">
      <div className="border-b border-[#e7efe9] bg-[#f3faf5] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#139653]">
              Featured Match
            </p>

            <p className="mt-1 text-sm font-bold text-[#66756c]">
              {fixture.league
                ?.name ||
                "Football"}
            </p>
          </div>

          <span className="rounded-full border border-[#bfe6cf] bg-white px-3 py-1 text-xs font-black text-[#0d6f3d]">
            {isLiveFixture(
              fixture
            )
              ? "Live"
              : fixture.fixture
                    ?.status
                    ?.long ||
                "Scheduled"}
          </span>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Team
            name={
              home?.name ||
              "Home Team"
            }
            logo={
              home?.logo
            }
          />

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#93a098]">
              VS
            </p>

            <p className="mt-2 text-sm font-black text-[#102117]">
              {isLiveFixture(
                fixture
              )
                ? `${fixture.goals?.home ?? "-"} : ${fixture.goals?.away ?? "-"}`
                : "—"}
            </p>
          </div>

          <Team
            name={
              away?.name ||
              "Away Team"
            }
            logo={
              away?.logo
            }
          />
        </div>

        <div className="mt-8 rounded-2xl bg-[#f7faf8] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7d8b82]">
            Kickoff
          </p>

          <p className="mt-2 font-black text-[#102117]">
            {formatFixtureDate(
              fixture.fixture
                ?.date
            )}
          </p>
        </div>

        <Link
          href={href}
          className="mt-6 flex w-full justify-center rounded-full bg-[#139653] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0d6f3d]"
        >
          View Match Analysis
        </Link>
      </div>
    </div>
  );
}

function Team({
  name,
  logo,
}: {
  name: string;
  logo?: string;
}) {
  return (
    <div className="min-w-0 text-center">
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="mx-auto h-14 w-14 object-contain"
        />
      ) : (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf7ef] text-lg font-black text-[#139653]">
          {name
            .slice(
              0,
              1
            )
            .toUpperCase()}
        </div>
      )}

      <p className="mt-3 break-words text-sm font-black text-[#102117]">
        {name}
      </p>
    </div>
  );
}

function CompactTeam({
  name,
  logo,
}: {
  name: string;
  logo?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logo ? (
        <img
          src={logo}
          alt={`${name} logo`}
          className="h-7 w-7 shrink-0 object-contain"
          loading="lazy"
        />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf7ef] text-xs font-black text-[#139653]">
          {name
            .slice(
              0,
              1
            )
            .toUpperCase()}
        </div>
      )}

      <span className="min-w-0 break-words text-sm font-black text-[#102117]">
        {name}
      </span>
    </div>
  );
}

function MatchCard({
  fixture,
  href,
}: {
  fixture: FixtureItem;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-[#dce8df] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#b9dbc7] hover:shadow-[0_18px_45px_rgba(21,72,43,0.09)]"
    >
      <p className="text-xs font-black uppercase tracking-[0.15em] text-[#139653]">
        {fixture.league
          ?.name ||
          "Football"}
      </p>

      <div className="mt-4 space-y-3">
        <CompactTeam
          name={
            fixture.teams
              ?.home
              ?.name ||
            "Home Team"
          }
          logo={
            fixture.teams
              ?.home
              ?.logo
          }
        />

        <div className="pl-10 text-[10px] font-black uppercase tracking-[0.14em] text-[#93a098]">
          vs
        </div>

        <CompactTeam
          name={
            fixture.teams
              ?.away
              ?.name ||
            "Away Team"
          }
          logo={
            fixture.teams
              ?.away
              ?.logo
          }
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-[#66756c]">
        {formatFixtureDate(
          fixture.fixture
            ?.date
        )}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-[#edf2ee] pt-4">
        <span className="text-xs font-bold text-[#7d8b82]">
          {fixture.fixture
            ?.status
            ?.long ||
            "Scheduled"}
        </span>

        <span className="text-sm font-black text-[#139653] transition group-hover:translate-x-1">
          View →
        </span>
      </div>
    </Link>
  );
}

function DailyFreePredictionCard({
  prediction,
  number,
  locale,
}: {
  prediction:
    PublicPredictionItem;

  number: number;

  locale: string;
}) {
  const free =
    prediction.freePrediction;

  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border border-[#bfe6cf] bg-[#fbfdfb] p-6 shadow-sm">
      <div className="absolute right-0 top-0 rounded-bl-2xl bg-[#139653] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white">
        FREE
      </div>

      <div className="flex items-center gap-3 pr-16">
        <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-black uppercase text-[#0d6f3d]">
          Pick #{number}
        </span>

        <span className="text-xs font-black uppercase text-[#0d6f3d]">
          {prediction.publicPrediction.risk} Risk
        </span>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-[#139653]">
        {prediction.competition.name}
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team
          name={
            prediction.teams.home.name
          }
          logo={
            prediction.teams.home.logo ||
            undefined
          }
        />

        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#93a098]">
          VS
        </span>

        <Team
          name={
            prediction.teams.away.name
          }
          logo={
            prediction.teams.away.logo ||
            undefined
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#d8e9dd] bg-white p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#839188]">
          ZERRA Free Prediction
        </p>

        <p className="mt-2 text-xl font-black text-[#102117]">
          {free?.finalPrediction ||
            "Prediction available"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoBox
            label="Confidence"
            value={
              free?.confidence !==
              null &&
              free?.confidence !==
              undefined
                ? `${free.confidence}%`
                : "—"
            }
          />

          <InfoBox
            label="Risk"
            value={
              prediction
                .publicPrediction
                .risk
            }
          />
        </div>

        {free?.exactScore && (
          <div className="mt-3">
            <InfoBox
              label="Exact Score Estimate"
              value={
                free.exactScore
              }
            />
          </div>
        )}
      </div>

      {free?.reasoning &&
        free.reasoning.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#839188]">
              AI Reasoning
            </p>

            <ul className="mt-3 space-y-2">
              {free.reasoning
                .slice(0, 3)
                .map(
                  (
                    reason,
                    index
                  ) => (
                    <li
                      key={`${prediction.id}-reason-${index}`}
                      className="text-sm leading-6 text-[#66756c]"
                    >
                      • {reason}
                    </li>
                  )
                )}
            </ul>
          </div>
        )}

      <div className="mt-5 flex items-center justify-between border-t border-[#e7efe9] pt-4">
        <span className="text-xs font-bold text-[#7d8b82]">
          {formatFixtureDate(
            prediction.fixtureDate
          )}
        </span>

        <Link
          href={`/${locale}/predictions/${prediction.id}`}
          className="text-sm font-black text-[#139653] transition hover:text-[#0d6f3d]"
        >
          View Analysis →
        </Link>
      </div>
    </article>
  );
}

function FreePredictionCard({
  prediction,
  number,
  locale,
}: {
  prediction:
    PublicPredictionItem;

  number: number;

  locale: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[#dce8df] bg-[#fbfdfb] p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-black uppercase text-[#0d6f3d]">
          Preview #{number}
        </span>

        <span className="text-xs font-black uppercase text-[#7d8b82]">
          {
            prediction
              .publicPrediction
              .risk
          }{" "}
          Risk
        </span>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-[#139653]">
        {
          prediction
            .competition
            .name
        }
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team
          name={
            prediction
              .teams
              .home
              .name
          }
          logo={
            prediction
              .teams
              .home
              .logo ||
            undefined
          }
        />

        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#93a098]">
          VS
        </span>

        <Team
          name={
            prediction
              .teams
              .away
              .name
          }
          logo={
            prediction
              .teams
              .away
              .logo ||
            undefined
          }
        />
      </div>

      <p className="mt-4 line-clamp-4 text-sm leading-7 text-[#66756c]">
        {
          prediction
            .publicPrediction
            .overview
        }
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoBox
          label="Risk"
          value={
            prediction
              .publicPrediction
              .riskScore !==
            null
              ? `${prediction.publicPrediction.riskScore}/100`
              : prediction.publicPrediction.risk
          }
        />

        <InfoBox
          label="Kickoff"
          value={formatFixtureDate(
            prediction.fixtureDate
          )}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#d8e9dd] bg-white p-4">
        <p className="text-sm leading-6 text-[#66756c]">
          {
            prediction
              .publicPrediction
              .teaser
          }
        </p>
      </div>

      <div className="mt-5">
        <PredictionVipAction
          locale={
            locale
          }
          fixtureId={
            prediction.fixtureId
          }
        />
      </div>
    </article>
  );
}

function YesterdaySummary({
  summary,
}: {
  summary:
    YesterdayGoalResultsData["summary"];
}) {
  return (
    <div className="mt-8 grid gap-4 rounded-[1.75rem] border border-[#dce8df] bg-[#fbfdfb] p-5 sm:grid-cols-2 lg:grid-cols-4">
      <ResultStat
        label="Correct Predictions"
        value={String(
          summary.correctPredictions
        )}
        detail="Successful goal predictions"
        tone="success"
      />

      <ResultStat
        label="Incorrect Predictions"
        value={String(
          summary.incorrectPredictions
        )}
        detail="Unsuccessful goal predictions"
        tone="danger"
      />

      <ResultStat
        label="Accuracy Rate"
        value={`${summary.accuracyRate}%`}
        detail={`${summary.correctPredictions} of ${summary.totalPredictions} correct`}
        tone="success"
      />

      <ResultStat
        label="Total Predictions"
        value={String(
          summary.totalPredictions
        )}
        detail="Yesterday's settled matches"
        tone="default"
      />
    </div>
  );
}

function ResultStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;

  tone:
    | "success"
    | "danger"
    | "default";
}) {
  const valueClass =
    tone ===
    "success"
      ? "text-[#139653]"
      : tone ===
          "danger"
        ? "text-[#d84a4a]"
        : "text-[#102117]";

  return (
    <div className="rounded-2xl border border-[#e1ebe4] bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#839188]">
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-black ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#7d8b82]">
        {detail}
      </p>
    </div>
  );
}

function YesterdayResultRow({
  item,
}: {
  item:
    YesterdayGoalResultItem;
}) {
  return (
    <article className="grid gap-5 bg-white px-6 py-5 transition hover:bg-[#fbfdfb] lg:grid-cols-[1.6fr_0.7fr_1fr_0.7fr_0.8fr_0.6fr] lg:items-center lg:gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#139653]">
          {
            item
              .competition
              .name
          }
        </p>

        <div className="mt-3 space-y-2">
          <CompactTeam
            name={
              item
                .teams
                .home
                .name
            }
            logo={
              item
                .teams
                .home
                .logo ||
              undefined
            }
          />

          <div className="pl-9 text-[10px] font-black uppercase tracking-[0.12em] text-[#93a098]">
            vs
          </div>

          <CompactTeam
            name={
              item
                .teams
                .away
                .name
            }
            logo={
              item
                .teams
                .away
                .logo ||
              undefined
            }
          />
        </div>
      </div>

      <ResultCell
        label="Final Score"
        value={
          item.result
            .finalScore
        }
      />

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#839188] lg:hidden">
          ZERRA Prediction
        </p>

        <p className="mt-1 text-sm font-black text-[#139653] lg:mt-0">
          {
            item
              .prediction
              .market
          }
        </p>
      </div>

      <ResultCell
        label="Actual Goals"
        value={`${item.result.totalGoals} Goals`}
      />

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#839188] lg:hidden">
          Result
        </p>

        <span
          className={`mt-1 inline-flex rounded-full px-3 py-1.5 text-xs font-black lg:mt-0 ${
            item.result
              .correct
              ? "bg-[#eaf7ef] text-[#0d7a40]"
              : "bg-[#fff0f0] text-[#d43d3d]"
          }`}
        >
          {item.result
            .correct
            ? "✓ Correct"
            : "✕ Incorrect"}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#839188] lg:hidden">
          Confidence
        </p>

        <p className="mt-1 text-lg font-black text-[#102117] lg:mt-0">
          {
            item
              .prediction
              .confidence
          }
          %
        </p>
      </div>
    </article>
  );
}

function ResultCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#839188] lg:hidden">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-[#102117] lg:mt-0">
        {value}
      </p>
    </div>
  );
}

function TrustItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dce8df] bg-white/80 p-4">
      <p className="text-sm font-black text-[#102117]">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#7d8b82]">
        {description}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f1f7f3] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#839188]">
        {label}
      </p>

      <p className="mt-2 break-words text-xs font-black text-[#102117]">
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#139653]">
          {eyebrow}
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight text-[#102117] md:text-4xl">
          {title}
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#66756c]">
          {description}
        </p>
      </div>

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="shrink-0 text-sm font-black text-[#139653] transition hover:text-[#0d6f3d]"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-8 rounded-[1.75rem] border border-dashed border-[#cfdcd2] bg-white p-8 text-center">
      <p className="text-sm leading-7 text-[#66756c]">
        {message}
      </p>
    </div>
  );
}
