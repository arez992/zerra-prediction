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

    const raw =
      await response.text();

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
      predictions:
        Array.isArray(
          data.predictions
        )
          ? data.predictions
          : [],
      error:
        null,
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

function getLocalizedPath(
  locale: string,
  path: string
) {
  return `/${locale}${path}`;
}

export default async function PredictionsPage({
  params,
}: PageProps) {
  const {
    locale,
  } =
    await params;

  const {
    predictions,
    error,
  } =
    await getPublishedPredictions();

  const featured =
    predictions[0] ||
    null;

  const remaining =
    predictions.slice(
      1
    );

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#102117]">
      <section className="border-b border-[#e1e9e3] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center md:px-6 md:py-20">
          <div className="mx-auto inline-flex items-center rounded-full bg-[#eaf7ef] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
            ZERRA AI Predictions
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            Published Football
            Analysis
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-[#66756c] md:text-base md:leading-8">
            Human-reviewed public
            football analysis from
            the ZERRA AI workflow.
            Final picks, exact
            scores, confidence
            percentages, and
            premium reasoning remain
            protected for VIP
            members.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <HeaderBadge label="Human Reviewed" />

            <HeaderBadge label="Real Football Data" />

            <HeaderBadge label="VIP Protected Insights" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 md:px-6">
        {error && (
          <div className="mx-auto max-w-4xl rounded-2xl border border-[#f0d9d9] bg-white p-5 text-center text-sm leading-7 text-[#b14c4c]">
            {error}
          </div>
        )}

        {!featured ? (
          <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf7ef] text-lg font-black text-[#139653]">
              AI
            </div>

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
              No Published
              Predictions
            </p>

            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black">
              New public analyses
              will appear here
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#758179]">
              Predictions are shown
              only after they pass
              human review and are
              published by an
              administrator.
            </p>

            <Link
              href={getLocalizedPath(
                locale,
                "/dashboard"
              )}
              className="mt-7 inline-flex rounded-xl bg-[#139653] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0d7a40]"
            >
              Back to Dashboard
            </Link>
          </section>
        ) : (
          <>
            <FeaturedPrediction
              item={
                featured
              }
              locale={
                locale
              }
            />

            {remaining.length >
              0 && (
              <section className="mt-12">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
                      More Published
                      Analysis
                    </p>

                    <h2 className="mt-3 text-3xl font-black">
                      Latest football
                      previews
                    </h2>
                  </div>

                  <p className="text-sm text-[#758179]">
                    {
                      predictions.length
                    }{" "}
                    published
                    prediction
                    {predictions.length ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {remaining.map(
                    (
                      item
                    ) => (
                      <PredictionCard
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        locale={
                          locale
                        }
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
    <section className="overflow-hidden rounded-[1.75rem] border border-[#dce8df] bg-white">
      <div className="grid lg:grid-cols-[1.45fr_0.75fr]">
        <div className="p-7 md:p-9">
          <div className="flex flex-wrap gap-2">
            <Badge>
              Featured Analysis
            </Badge>

            <Badge>
              Published
            </Badge>

            <span className="rounded-full bg-[#f3f7f4] px-3 py-1.5 text-[10px] font-black uppercase text-[#7a877e]">
              Football
            </span>
          </div>

          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
            {
              item.competition
                .name
            }
            {item.competition
              .round
              ? ` · ${item.competition.round}`
              : ""}
          </p>

          <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
            {matchTitle}
          </h2>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#66756c] md:text-base md:leading-8">
            {
              item
                .publicPrediction
                .overview
            }
          </p>

          {item
            .publicPrediction
            .keyInsights
            .length >
            0 && (
            <div className="mt-6 grid gap-3">
              {item
                .publicPrediction
                .keyInsights
                .map(
                  (
                    insight,
                    index
                  ) => (
                    <div
                      key={`${insight}-${index}`}
                      className="flex gap-3 rounded-xl border border-[#e2ebe5] bg-[#fbfdfb] px-4 py-3"
                    >
                      <span className="font-black text-[#139653]">
                        ✓
                      </span>

                      <p className="text-sm leading-6 text-[#536158]">
                        {
                          insight
                        }
                      </p>
                    </div>
                  )
                )}
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={getLocalizedPath(
                locale,
                "/vip"
              )}
              className="rounded-xl bg-[#139653] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0d7a40]"
            >
              Unlock VIP
              Prediction
            </Link>

            <Link
              href={getLocalizedPath(
                locale,
                "/dashboard"
              )}
              className="rounded-xl border border-[#dce8df] bg-white px-6 py-3 text-sm font-black text-[#536158] transition hover:bg-[#f7faf8]"
            >
              Open Dashboard
            </Link>
          </div>
        </div>

        <aside className="border-t border-[#e7eee9] bg-[#fbfdfb] p-7 lg:border-l lg:border-t-0 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
            Public Match Signals
          </p>

          <div className="mt-6 grid gap-3">
            <SignalCard
              label="Risk Level"
              value={
                item
                  .publicPrediction
                  .risk
              }
            />

            <SignalCard
              label="Risk Score"
              value={
                item
                  .publicPrediction
                  .riskScore !==
                null
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
                item
                  .fixtureStatus
                  .long ||
                "Scheduled"
              }
            />
          </div>

          <div className="mt-6 rounded-2xl bg-[#102117] p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6be39e]">
              VIP Protected
            </p>

            <p className="mt-3 text-sm leading-7 text-white/65">
              {
                item
                  .publicPrediction
                  .teaser
              }
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
    <article className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6 transition hover:border-[#bcd7c5]">
      <div className="flex flex-wrap gap-2">
        <Badge>
          Published
        </Badge>

        <span className="rounded-full bg-[#f3f7f4] px-3 py-1.5 text-[10px] font-black uppercase text-[#7a877e]">
          {
            item
              .publicPrediction
              .risk
          }{" "}
          Risk
        </span>
      </div>

      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
        {
          item.competition
            .name
        }
      </p>

      <h3 className="mt-3 text-2xl font-black leading-tight">
        {
          item.teams.home
            .name
        }{" "}
        vs{" "}
        {
          item.teams.away
            .name
        }
      </h3>

      <p className="mt-4 text-sm leading-7 text-[#66756c]">
        {
          item
            .publicPrediction
            .overview
        }
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
            item
              .publicPrediction
              .riskScore !==
            null
              ? `${item.publicPrediction.risk} · ${item.publicPrediction.riskScore}/100`
              : item
                  .publicPrediction
                  .risk
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#dce8df] bg-[#fbfdfb] p-4">
        <p className="text-sm leading-7 text-[#66756c]">
          {
            item
              .publicPrediction
              .teaser
          }
        </p>
      </div>

      <Link
        href={getLocalizedPath(
          locale,
          "/vip"
        )}
        className="mt-5 inline-flex rounded-xl bg-[#139653] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0d7a40]"
      >
        View VIP Access
      </Link>
    </article>
  );
}

function HeaderBadge({
  label,
}: {
  label: string;
}) {
  return (
    <span className="rounded-full border border-[#dce8df] bg-[#fbfdfb] px-4 py-2 text-xs font-bold text-[#536158]">
      ✓ {label}
    </span>
  );
}

function Badge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-[#eaf7ef] px-3 py-1.5 text-[10px] font-black uppercase text-[#139653]">
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
    <div className="rounded-xl border border-[#e2ebe5] bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a978e]">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-[#102117]">
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
    <div className="rounded-xl border border-[#e2ebe5] bg-[#fbfdfb] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a978e]">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-[#139653]">
        {value}
      </p>
    </div>
  );
}