import Link from "next/link";

type PublicPredictionItem = {
  id: string;
  fixtureId: string;
  sport: "Football";

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

  publishedAt: string | null;
  updatedAt: string | null;
};

type PublicPredictionsResponse = {
  success: boolean;
  engine?: string;
  sport?: string;
  count?: number;
  predictions?: PublicPredictionItem[];
  error?: string;
};

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

async function getPublishedPredictions(): Promise<{
  predictions: PublicPredictionItem[];
  error: string | null;
}> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerra-prediction.vercel.app";

    const response = await fetch(
      `${siteUrl}/api/predictions?limit=50`,
      {
        next: {
          revalidate: 60,
        },
      }
    );

    const raw = await response.text();

    let data: PublicPredictionsResponse;

    try {
      data = raw
        ? (JSON.parse(
            raw
          ) as PublicPredictionsResponse)
        : {
            success: false,
            error:
              "The prediction service returned an empty response.",
          };
    } catch {
      return {
        predictions: [],
        error:
          "The prediction service returned an invalid response.",
      };
    }

    if (
      !response.ok ||
      !data.success
    ) {
      return {
        predictions: [],
        error:
          data.error ||
          "Unable to load published predictions.",
      };
    }

    return {
      predictions: Array.isArray(
        data.predictions
      )
        ? data.predictions
        : [],
      error: null,
    };
  } catch {
    return {
      predictions: [],
      error:
        "Unable to connect to the public prediction service.",
    };
  }
}

function formatFixtureDate(
  value: string | null
): string {
  if (!value) {
    return "Kickoff TBD";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Kickoff TBD";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function getLocalizedPath(
  locale: string,
  path: string
) {
  return `/${locale}${path}`;
}

export default async function PredictionsPage({
  params,
}: PageProps) {
  const { locale } = await params;

  const {
    predictions,
    error,
  } = await getPublishedPredictions();

  const featured =
    predictions[0] || null;

  const remaining =
    predictions.slice(1);

  return (
    <main className="min-h-screen bg-[#07101E] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
            ZERRA AI
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-6xl">
            Published Football Analysis
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-white/55 md:text-base">
            Public, human-reviewed football analysis
            from the ZERRA AI workflow. Final picks,
            exact scores, confidence percentages, and
            premium reasoning remain protected for VIP
            members.
          </p>
        </section>

        {error && (
          <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-red-500/25 bg-red-500/10 p-5 text-center text-sm leading-7 text-red-200">
            {error}
          </div>
        )}

        {!featured ? (
          <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              No Published Predictions
            </p>

            <h2 className="mt-4 text-3xl font-black">
              New public analyses will appear here
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/50">
              Predictions are shown only after they pass
              human review and are published by an
              administrator. API-Football generation is
              currently paused, so this empty state is
              expected.
            </p>

            <Link
              href={getLocalizedPath(
                locale,
                "/dashboard"
              )}
              className="mt-7 inline-flex rounded-full bg-[#D4AF37] px-7 py-3 text-sm font-black text-black transition hover:brightness-110"
            >
              Back to Dashboard
            </Link>
          </section>
        ) : (
          <>
            <FeaturedPrediction
              item={featured}
              locale={locale}
            />

            {remaining.length > 0 && (
              <section className="mt-12">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                      More Published Analysis
                    </p>

                    <h2 className="mt-3 text-3xl font-black">
                      Latest football previews
                    </h2>
                  </div>

                  <p className="text-sm text-white/40">
                    {predictions.length} published
                    prediction
                    {predictions.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {remaining.map(
                    (item) => (
                      <PredictionCard
                        key={item.id}
                        item={item}
                        locale={locale}
                      />
                    )
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function FeaturedPrediction({
  item,
  locale,
}: {
  item: PublicPredictionItem;
  locale: string;
}) {
  const matchTitle =
    `${item.teams.home.name} vs ${item.teams.away.name}`;

  return (
    <section className="mt-12 overflow-hidden rounded-[2.25rem] border border-[#D4AF37]/25 bg-gradient-to-br from-[#111B2C] to-[#0A1220] shadow-2xl">
      <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="p-7 md:p-10">
          <div className="flex flex-wrap gap-2">
            <Badge>
              Featured Analysis
            </Badge>

            <Badge>
              Published
            </Badge>

            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase text-white/45">
              Football
            </span>
          </div>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            {item.competition.name}
            {item.competition.round
              ? ` · ${item.competition.round}`
              : ""}
          </p>

          <h2 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
            {matchTitle}
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-white/65">
            {item.publicPrediction.overview}
          </p>

          {item.publicPrediction
            .keyInsights.length > 0 && (
            <ul className="mt-6 grid gap-3">
              {item.publicPrediction.keyInsights.map(
                (insight, index) => (
                  <li
                    key={`${insight}-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/65"
                  >
                    {insight}
                  </li>
                )
              )}
            </ul>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={getLocalizedPath(
                locale,
                "/vip"
              )}
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110"
            >
              Unlock VIP Prediction
            </Link>

            <Link
              href={getLocalizedPath(
                locale,
                "/dashboard"
              )}
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white/75 transition hover:border-[#D4AF37]/40"
            >
              Open Dashboard
            </Link>
          </div>
        </div>

        <aside className="border-t border-white/10 bg-black/15 p-7 lg:border-l lg:border-t-0 md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
            Public Match Signals
          </p>

          <div className="mt-6 grid gap-4">
            <SignalCard
              label="Risk Level"
              value={
                item.publicPrediction.risk
              }
            />

            <SignalCard
              label="Risk Score"
              value={
                item.publicPrediction
                  .riskScore !== null
                  ? `${item.publicPrediction.riskScore}/100`
                  : "Unavailable"
              }
            />

            <SignalCard
              label="Kickoff"
              value={formatFixtureDate(
                item.fixtureDate
              )}
            />

            <SignalCard
              label="Status"
              value={
                item.fixtureStatus.long ||
                "Scheduled"
              }
            />
          </div>

          <div className="mt-6 rounded-3xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
              VIP Protected
            </p>

            <p className="mt-3 text-sm leading-7 text-white/55">
              {item.publicPrediction.teaser}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PredictionCard({
  item,
  locale,
}: {
  item: PublicPredictionItem;
  locale: string;
}) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl transition hover:border-[#D4AF37]/30">
      <div className="flex flex-wrap gap-2">
        <Badge>Published</Badge>

        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase text-white/40">
          {item.publicPrediction.risk} Risk
        </span>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
        {item.competition.name}
      </p>

      <h3 className="mt-3 text-2xl font-black">
        {item.teams.home.name} vs{" "}
        {item.teams.away.name}
      </h3>

      <p className="mt-4 text-sm leading-7 text-white/55">
        {item.publicPrediction.overview}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MiniInfo
          label="Kickoff"
          value={formatFixtureDate(
            item.fixtureDate
          )}
        />

        <MiniInfo
          label="Risk"
          value={
            item.publicPrediction.riskScore !==
            null
              ? `${item.publicPrediction.risk} · ${item.publicPrediction.riskScore}/100`
              : item.publicPrediction.risk
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4">
        <p className="text-sm leading-7 text-white/55">
          {item.publicPrediction.teaser}
        </p>
      </div>

      <Link
        href={getLocalizedPath(
          locale,
          "/vip"
        )}
        className="mt-5 inline-flex rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:brightness-110"
      >
        View VIP Access
      </Link>
    </article>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-black uppercase text-[#D4AF37]">
      {children}
    </span>
  );
}

function SignalCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}