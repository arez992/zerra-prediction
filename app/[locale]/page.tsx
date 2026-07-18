import Link from "next/link";

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

  competition: {
    name: string;
    country: string | null;
    round: string | null;
  };

  teams: {
    home: {
      name: string;
    };

    away: {
      name: string;
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
    keyInsights: string[];
    teaser: string;
  };
};

type PublicPredictionsResponse = {
  success: boolean;
  predictions?: PublicPredictionItem[];
};

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

async function getFixtures(): Promise<
  FixtureItem[]
> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerra-prediction.vercel.app";

    const response =
      await fetch(
        `${siteUrl}/api/sports/football/fixtures`,
        {
          next: {
            revalidate: 60,
          },
        }
      );

    const data =
      await response.json();

    if (
      data?.success &&
      Array.isArray(
        data.fixtures
      )
    ) {
      return data.fixtures.slice(
        0,
        6
      );
    }

    return [];
  } catch {
    return [];
  }
}

async function getFreePredictions(): Promise<
  PublicPredictionItem[]
> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerra-prediction.vercel.app";

    const response =
      await fetch(
        `${siteUrl}/api/predictions?limit=3`,
        {
          next: {
            revalidate: 60,
          },
        }
      );

    const data =
      (await response.json()) as
        PublicPredictionsResponse;

    if (
      response.ok &&
      data.success &&
      Array.isArray(
        data.predictions
      )
    ) {
      /*
       * Temporary UI rule:
       *
       * Show only the first 3 published
       * predictions as free predictions.
       *
       * Later this will be connected to
       * the Admin Free/VIP selection
       * system without redesigning
       * this UI.
       */
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
  ] =
    await Promise.all([
      getFixtures(),
      getFreePredictions(),
    ]);

  const featuredFixture =
    fixtures[0] ||
    null;

  const upcomingFixtures =
    fixtures.slice(
      1,
      5
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
                  Match data is
                  temporarily unavailable
                </h2>

                <p className="mt-4 text-sm leading-7 text-[#66756c]">
                  ZERRA will display the
                  latest real football
                  fixture here as soon as
                  data is available.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeader
          eyebrow="Today&apos;s Football"
          title="Upcoming Matches"
          description="Real football fixtures currently available through the ZERRA football data pipeline."
          actionHref={getPath(
            "/dashboard"
          )}
          actionLabel="View all matches"
        />

        {upcomingFixtures.length ===
        0 ? (
          <EmptyState message="No additional football fixtures are available right now." />
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

      <section className="border-y border-[#e0ebe3] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <SectionHeader
            eyebrow="Daily Free Access"
            title="Free Predictions"
            description="ZERRA provides up to three published football prediction previews in this section. Admin-controlled Free/VIP selection will be connected later."
            actionHref={getPath(
              "/predictions"
            )}
            actionLabel="View predictions"
          />

          {freePredictions.length ===
          0 ? (
            <EmptyState message="No published free prediction previews are available right now." />
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
                    vipHref={getPath(
                      "/vip"
                    )}
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="overflow-hidden rounded-[2.25rem] bg-[#102117] px-6 py-10 text-white shadow-[0_30px_80px_rgba(15,50,30,0.16)] md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#a8e5c1]">
                ZERRA VIP
              </span>

              <h2 className="mt-5 max-w-3xl text-3xl font-black md:text-5xl">
                Unlock premium
                football intelligence.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
                Access protected VIP
                predictions, full AI
                reasoning, confidence
                signals, exact-score
                estimates, and premium
                match intelligence.
              </p>
            </div>

            <Link
              href={getPath(
                "/vip"
              )}
              className="inline-flex justify-center rounded-full bg-[#22b76a] px-7 py-3.5 text-sm font-black text-white transition hover:bg-[#139653]"
            >
              Explore VIP Access
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
            {
              fixture.fixture
                ?.status
                ?.long ||
              "Scheduled"
            }
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
              {fixture.goals
                ?.home ??
                "-"}
              {" : "}
              {fixture.goals
                ?.away ??
                "-"}
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
    <div className="text-center">
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="mx-auto h-14 w-14 object-contain"
        />
      ) : (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf7ef] text-lg font-black text-[#139653]">
          {name
            .slice(0, 1)
            .toUpperCase()}
        </div>
      )}

      <p className="mt-3 text-sm font-black text-[#102117]">
        {name}
      </p>
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

      <h3 className="mt-4 text-lg font-black leading-7 text-[#102117]">
        {fixture.teams
          ?.home
          ?.name ||
          "Home Team"}
        {" vs "}
        {fixture.teams
          ?.away
          ?.name ||
          "Away Team"}
      </h3>

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

function FreePredictionCard({
  prediction,
  number,
  vipHref,
}: {
  prediction:
    PublicPredictionItem;
  number: number;
  vipHref: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[#dce8df] bg-[#fbfdfb] p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-black uppercase text-[#0d6f3d]">
          Free #{number}
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

      <h3 className="mt-3 text-2xl font-black leading-tight text-[#102117]">
        {
          prediction
            .teams
            .home
            .name
        }
        {" vs "}
        {
          prediction
            .teams
            .away
            .name
        }
      </h3>

      <p className="mt-4 line-clamp-4 text-sm leading-7 text-[#66756c]">
        {
          prediction
            .publicPrediction
            .overview
        }
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
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

      <Link
        href={vipHref}
        className="mt-5 inline-flex text-sm font-black text-[#139653] transition hover:text-[#0d6f3d]"
      >
        Unlock full VIP prediction →
      </Link>
    </article>
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

      <p className="mt-2 text-xs font-black text-[#102117]">
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
  actionHref: string;
  actionLabel: string;
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

      <Link
        href={actionHref}
        className="shrink-0 text-sm font-black text-[#139653] transition hover:text-[#0d6f3d]"
      >
        {actionLabel} →
      </Link>
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