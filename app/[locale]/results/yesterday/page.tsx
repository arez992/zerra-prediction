import Link from "next/link";

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
    };

    away: {
      name: string;
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

  date?: {
    from: string;
    to: string;
  };

  summary?: {
    totalPredictions: number;
    correctPredictions: number;
    incorrectPredictions: number;
    accuracyRate: number;
  };

  results?: YesterdayGoalResultItem[];
};

type YesterdayGoalResultsData = {
  date: {
    from: string;
    to: string;
  } | null;

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

async function getYesterdayGoalResults(): Promise<
  YesterdayGoalResultsData | null
> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const response =
      await fetch(
        `${siteUrl}/api/predictions/yesterday-results?limit=50`,
        {
          next: {
            revalidate: 300,
          },
        }
      );

    if (!response.ok) {
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
      date:
        data.date ||
        null,

      summary:
        data.summary,

      results:
        data.results,
    };
  } catch {
    return null;
  }
}

function formatResultDate(
  value?: string | null
): string {
  if (!value) {
    return "Yesterday";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle:
        "long",
    }
  ).format(date);
}

export default async function YesterdayResultsPage({
  params,
}: PageProps) {
  const {
    locale,
  } =
    await params;

  const data =
    await getYesterdayGoalResults();

  const homeHref =
    `/${locale}`;

  const predictionHref =
    `/${locale}/predictions`;

  const displayDate =
    data?.date?.from
      ? formatResultDate(
          data.date.from
        )
      : "Yesterday";

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#102117]">
      <section className="border-b border-[#e0ebe3] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Link
                href={homeHref}
                className="text-sm font-black text-[#139653] transition hover:text-[#0d6f3d]"
              >
                â†گ Back to Home
              </Link>

              <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-[#139653]">
                ZERRA Performance
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                Yesterday&apos;s Goal
                Prediction Results
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#66756c] md:text-base">
                Review ZERRA&apos;s
                Over/Under 2.5 goal
                predictions against
                the final scores of
                yesterday&apos;s completed
                football matches.
              </p>
            </div>

            <div className="rounded-2xl border border-[#dce8df] bg-[#f7faf8] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#839188]">
                Results Date
              </p>

              <p className="mt-2 font-black text-[#102117]">
                {displayDate}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {!data ? (
          <div className="rounded-[2rem] border border-dashed border-[#cfdcd2] bg-white p-10 text-center">
            <h2 className="text-2xl font-black">
              Results temporarily
              unavailable
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#66756c]">
              Yesterday&apos;s prediction
              results cannot be loaded
              right now. Please check
              again when the data
              service is available.
            </p>

            <Link
              href={homeHref}
              className="mt-6 inline-flex rounded-full bg-[#139653] px-6 py-3 text-sm font-black text-white"
            >
              Return Home
            </Link>
          </div>
        ) : (
          <>
            <SummaryGrid
              summary={
                data.summary
              }
            />

            {data.results.length ===
            0 ? (
              <div className="mt-8 rounded-[2rem] border border-dashed border-[#cfdcd2] bg-white p-10 text-center">
                <h2 className="text-xl font-black">
                  No settled results yet
                </h2>

                <p className="mt-3 text-sm leading-7 text-[#66756c]">
                  No completed goal
                  prediction results are
                  available for yesterday.
                </p>
              </div>
            ) : (
              <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#dce8df] bg-white shadow-sm">
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
                  {data.results.map(
                    (
                      item
                    ) => (
                      <ResultRow
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
            )}

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href={predictionHref}
                className="rounded-full bg-[#139653] px-7 py-3 text-sm font-black text-white transition hover:bg-[#0d6f3d]"
              >
                View Today&apos;s
                Predictions
              </Link>

              <Link
                href={homeHref}
                className="rounded-full border border-[#cfdcd2] bg-white px-7 py-3 text-sm font-black text-[#102117] transition hover:border-[#139653] hover:text-[#139653]"
              >
                Back to Home
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SummaryGrid({
  summary,
}: {
  summary: YesterdayGoalResultsData["summary"];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Correct"
        value={String(
          summary.correctPredictions
        )}
        description="Correct goal predictions"
        tone="success"
      />

      <SummaryCard
        label="Incorrect"
        value={String(
          summary.incorrectPredictions
        )}
        description="Incorrect goal predictions"
        tone="danger"
      />

      <SummaryCard
        label="Accuracy Rate"
        value={`${summary.accuracyRate}%`}
        description={`${summary.correctPredictions} of ${summary.totalPredictions} correct`}
        tone="success"
      />

      <SummaryCard
        label="Total Predictions"
        value={String(
          summary.totalPredictions
        )}
        description="Settled goal predictions"
        tone="default"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone:
    | "success"
    | "danger"
    | "default";
}) {
  const valueClass =
    tone === "success"
      ? "text-[#139653]"
      : tone === "danger"
        ? "text-[#d84a4a]"
        : "text-[#102117]";

  return (
    <article className="rounded-[1.5rem] border border-[#dce8df] bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#839188]">
        {label}
      </p>

      <p
        className={`mt-4 text-4xl font-black ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-2 text-sm text-[#66756c]">
        {description}
      </p>
    </article>
  );
}

function ResultRow({
  item,
}: {
  item: YesterdayGoalResultItem;
}) {
  return (
    <article className="grid gap-5 bg-white px-6 py-6 transition hover:bg-[#fbfdfb] lg:grid-cols-[1.6fr_0.7fr_1fr_0.7fr_0.8fr_0.6fr] lg:items-center lg:gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#139653]">
          {
            item
              .competition
              .name
          }
        </p>

        <p className="mt-2 font-black text-[#102117]">
          {
            item
              .teams
              .home
              .name
          }
        </p>

        <p className="mt-1 text-sm font-bold text-[#66756c]">
          vs{" "}
          {
            item
              .teams
              .away
              .name
          }
        </p>
      </div>

      <Cell
        label="Final Score"
        value={
          item.result
            .finalScore
        }
      />

      <div>
        <MobileLabel>
          ZERRA Prediction
        </MobileLabel>

        <p className="mt-1 text-sm font-black text-[#139653] lg:mt-0">
          {
            item
              .prediction
              .market
          }
        </p>
      </div>

      <Cell
        label="Actual Goals"
        value={`${item.result.totalGoals} Goals`}
      />

      <div>
        <MobileLabel>
          Result
        </MobileLabel>

        <span
          className={`mt-1 inline-flex rounded-full px-3 py-1.5 text-xs font-black lg:mt-0 ${
            item.result.correct
              ? "bg-[#eaf7ef] text-[#0d7a40]"
              : "bg-[#fff0f0] text-[#d43d3d]"
          }`}
        >
          {item.result.correct
            ? "âœ“ Correct"
            : "âœ• Incorrect"}
        </span>
      </div>

      <div>
        <MobileLabel>
          Confidence
        </MobileLabel>

        <div className="mt-1 lg:mt-0">
          <p className="text-lg font-black text-[#102117]">
            {
              item
                .prediction
                .confidence
            }
            %
          </p>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e6eee8]">
            <div
              className="h-full rounded-full bg-[#139653]"
              style={{
                width:
                  `${Math.min(
                    100,
                    Math.max(
                      0,
                      item.prediction.confidence
                    )
                  )}%`,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function Cell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <MobileLabel>
        {label}
      </MobileLabel>

      <p className="mt-1 text-sm font-black text-[#102117] lg:mt-0">
        {value}
      </p>
    </div>
  );
}

function MobileLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#839188] lg:hidden">
      {children}
    </p>
  );
}
