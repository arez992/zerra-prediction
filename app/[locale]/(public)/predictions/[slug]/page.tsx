import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

type PublicPrediction = {
  id: string;
  fixtureId: string;
  sport: "Football";

  competition: {
    name: string;
    country: string | null;
    round: string | null;
    season: number | null;
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

type PublicPredictionResponse = {
  success: boolean;
  prediction?: PublicPrediction;
  error?: string;
};

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://zerra-prediction.vercel.app"
  ).replace(/\/+$/, "");
}

function normalizeLocale(
  value: string
): "en" | "ku" {
  return value === "ku" ? "ku" : "en";
}

function getLocalizedText(
  locale: "en" | "ku",
  english: string,
  kurdish: string
): string {
  return locale === "ku"
    ? kurdish
    : english;
}

function formatDateTime(
  value: string | null,
  locale: "en" | "ku"
): string {
  if (!value) {
    return getLocalizedText(
      locale,
      "Kickoff TBD",
      "کاتی یاری دیاری نەکراوە"
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getLocalizedText(
      locale,
      "Kickoff TBD",
      "کاتی یاری دیاری نەکراوە"
    );
  }

  return new Intl.DateTimeFormat(
    locale === "ku" ? "ckb-IQ" : "en",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatPublishedDate(
  value: string | null,
  locale: "en" | "ku"
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    locale === "ku" ? "ckb-IQ" : "en",
    {
      dateStyle: "medium",
    }
  ).format(date);
}

const getPrediction = cache(
  async (
    slug: string
  ): Promise<PublicPrediction | null> => {
    const cleanSlug =
      decodeURIComponent(slug).trim();

    if (!cleanSlug) {
      return null;
    }

    const response = await fetch(
      `${getSiteUrl()}/api/predictions/${encodeURIComponent(
        cleanSlug
      )}`,
      {
        cache: "no-store",
      }
    );

    if (response.status === 404) {
      return null;
    }

    const raw = await response.text();

    let data: PublicPredictionResponse;

    try {
      data = raw
        ? (JSON.parse(
            raw
          ) as PublicPredictionResponse)
        : {
            success: false,
            error:
              "The prediction service returned an empty response.",
          };
    } catch {
      throw new Error(
        "The prediction service returned invalid JSON."
      );
    }

    if (
      !response.ok ||
      !data.success ||
      !data.prediction
    ) {
      throw new Error(
        data.error ||
          "Unable to load the published prediction."
      );
    }

    return data.prediction;
  }
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const cleanLocale =
    normalizeLocale(locale);

  const prediction =
    await getPrediction(slug);

  if (!prediction) {
    return {
      title: "Prediction Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const matchTitle =
    `${prediction.teams.home.name} vs ${prediction.teams.away.name}`;

  const title =
    cleanLocale === "ku"
      ? `${matchTitle} | شیکاری پێش یاری`
      : `${matchTitle} | Public Match Analysis`;

  const description =
    prediction.publicPrediction.overview;

  const canonicalPath =
    `/${cleanLocale}/predictions/${encodeURIComponent(
      slug
    )}`;

  const canonicalUrl =
    `${getSiteUrl()}${canonicalPath}`;

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "ZERRA Prediction",
      type: "article",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function PredictionDetailPage({
  params,
}: PageProps) {
  const { locale, slug } = await params;

  const cleanLocale =
    normalizeLocale(locale);

  const prediction =
    await getPrediction(slug);

  if (!prediction) {
    notFound();
  }

  const isKurdish =
    cleanLocale === "ku";

  const matchTitle =
    `${prediction.teams.home.name} vs ${prediction.teams.away.name}`;

  const canonicalPath =
    `/${cleanLocale}/predictions/${encodeURIComponent(
      slug
    )}`;

  const canonicalUrl =
    `${getSiteUrl()}${canonicalPath}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsEvent",
        "@id": canonicalUrl,
        name: matchTitle,
        description:
          prediction.publicPrediction.overview,
        url: canonicalUrl,
        startDate:
          prediction.fixtureDate || undefined,
        eventStatus:
          prediction.fixtureStatus.long ||
          undefined,
        sport: "Football",
        homeTeam: {
          "@type": "SportsTeam",
          name:
            prediction.teams.home.name,
        },
        awayTeam: {
          "@type": "SportsTeam",
          name:
            prediction.teams.away.name,
        },
        organizer: {
          "@type": "Organization",
          name:
            prediction.competition.name,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: matchTitle,
        description:
          prediction.publicPrediction.overview,
        inLanguage: cleanLocale,
        datePublished:
          prediction.publishedAt ||
          undefined,
        dateModified:
          prediction.updatedAt ||
          prediction.publishedAt ||
          undefined,
        isPartOf: {
          "@type": "WebSite",
          name: "ZERRA Prediction",
          url: getSiteUrl(),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name:
              getLocalizedText(
                cleanLocale,
                "Home",
                "سەرەکی"
              ),
            item:
              `${getSiteUrl()}/${cleanLocale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name:
              getLocalizedText(
                cleanLocale,
                "Predictions",
                "پێشبینییەکان"
              ),
            item:
              `${getSiteUrl()}/${cleanLocale}/predictions`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: matchTitle,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <main
      className="min-h-screen bg-[#07101D] text-white"
      dir={isKurdish ? "rtl" : "ltr"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            structuredData
          ).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-7xl px-5 py-10">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-white/45">
          <Link
            href={`/${cleanLocale}`}
            className="transition hover:text-[#D4AF37]"
          >
            {getLocalizedText(
              cleanLocale,
              "Home",
              "سەرەکی"
            )}
          </Link>

          <span>/</span>

          <Link
            href={`/${cleanLocale}/predictions`}
            className="transition hover:text-[#D4AF37]"
          >
            {getLocalizedText(
              cleanLocale,
              "Predictions",
              "پێشبینییەکان"
            )}
          </Link>

          <span>/</span>

          <span className="text-white/65">
            {matchTitle}
          </span>
        </nav>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="min-w-0">
            <header className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#101827] p-7 shadow-2xl md:p-10">
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {getLocalizedText(
                    cleanLocale,
                    "Published Analysis",
                    "شیکاری بڵاوکراوە"
                  )}
                </Badge>

                <Badge>
                  {prediction.competition.name}
                </Badge>

                {prediction.competition.country && (
                  <Badge>
                    {
                      prediction
                        .competition.country
                    }
                  </Badge>
                )}
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                {matchTitle}
              </h1>

              <p className="mt-6 max-w-4xl text-lg leading-8 text-white/65">
                {
                  prediction
                    .publicPrediction.overview
                }
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard
                  label={getLocalizedText(
                    cleanLocale,
                    "Kickoff",
                    "کاتی یاری"
                  )}
                  value={formatDateTime(
                    prediction.fixtureDate,
                    cleanLocale
                  )}
                />

                <InfoCard
                  label={getLocalizedText(
                    cleanLocale,
                    "Status",
                    "دۆخی یاری"
                  )}
                  value={
                    prediction.fixtureStatus
                      .long ||
                    getLocalizedText(
                      cleanLocale,
                      "Scheduled",
                      "دیاریکراو"
                    )
                  }
                />

                <InfoCard
                  label={getLocalizedText(
                    cleanLocale,
                    "Risk",
                    "ڕیسک"
                  )}
                  value={
                    prediction
                      .publicPrediction.risk
                  }
                />

                <InfoCard
                  label={getLocalizedText(
                    cleanLocale,
                    "Risk Score",
                    "نمرەی ڕیسک"
                  )}
                  value={
                    prediction
                      .publicPrediction
                      .riskScore !== null
                      ? `${prediction.publicPrediction.riskScore}/100`
                      : "—"
                  }
                />
              </div>

              <div className="mt-7 flex flex-wrap gap-4 text-sm text-white/40">
                <span>
                  {getLocalizedText(
                    cleanLocale,
                    "Published:",
                    "بڵاوکراوەتەوە:"
                  )}{" "}
                  {formatPublishedDate(
                    prediction.publishedAt,
                    cleanLocale
                  )}
                </span>

                <span>
                  {getLocalizedText(
                    cleanLocale,
                    "Updated:",
                    "نوێکراوەتەوە:"
                  )}{" "}
                  {formatPublishedDate(
                    prediction.updatedAt,
                    cleanLocale
                  )}
                </span>
              </div>
            </header>

            <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                {getLocalizedText(
                  cleanLocale,
                  "Public Analysis",
                  "شیکاری گشتی"
                )}
              </p>

              <h2 className="mt-4 text-3xl font-black">
                {getLocalizedText(
                  cleanLocale,
                  "Match Overview",
                  "کورتەی یاری"
                )}
              </h2>

              <p className="mt-5 whitespace-pre-line text-base leading-8 text-white/65">
                {
                  prediction
                    .publicPrediction.overview
                }
              </p>
            </section>

            <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                    {getLocalizedText(
                      cleanLocale,
                      "Key Insights",
                      "تێبینییە سەرەکییەکان"
                    )}
                  </p>

                  <h2 className="mt-4 text-3xl font-black">
                    {getLocalizedText(
                      cleanLocale,
                      "What to Know Before Kickoff",
                      "پێش یاری چی بزانیت"
                    )}
                  </h2>
                </div>

                <span className="rounded-full border border-yellow-400/25 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-200">
                  {getLocalizedText(
                    cleanLocale,
                    "Risk level",
                    "ئاستی ڕیسک"
                  )}
                  :{" "}
                  {
                    prediction
                      .publicPrediction.risk
                  }
                </span>
              </div>

              {prediction.publicPrediction
                .keyInsights.length > 0 ? (
                <div className="mt-7 grid gap-3">
                  {prediction.publicPrediction.keyInsights.map(
                    (insight, index) => (
                      <div
                        key={`${insight}-${index}`}
                        className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                      >
                        <span className="font-black text-[#D4AF37]">
                          ✓
                        </span>

                        <p className="leading-7 text-white/65">
                          {insight}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="mt-6 text-sm leading-7 text-white/45">
                  {getLocalizedText(
                    cleanLocale,
                    "No additional public insights are available yet.",
                    "هێشتا تێبینی گشتی زیاتر بەردەست نییە."
                  )}
                </p>
              )}
            </section>

            <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#D4AF37]/35 bg-gradient-to-br from-[#1B2230] via-[#111B2B] to-[#0B1422] shadow-2xl">
              <div className="border-b border-white/10 p-7 md:p-9">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#D4AF37]">
                  🔒 ZERRA VIP
                </p>

                <h2 className="mt-4 text-3xl font-black md:text-4xl">
                  {getLocalizedText(
                    cleanLocale,
                    "Unlock the Final AI Prediction",
                    "پێشبینی کۆتایی AI بکەرەوە"
                  )}
                </h2>

                <p className="mt-4 max-w-3xl text-base leading-8 text-white/60">
                  {
                    prediction
                      .publicPrediction.teaser
                  }
                </p>
              </div>

              <div className="grid gap-4 p-7 md:grid-cols-2 md:p-9">
                {[
                  getLocalizedText(
                    cleanLocale,
                    "Final match prediction",
                    "پێشبینی کۆتایی یاری"
                  ),
                  getLocalizedText(
                    cleanLocale,
                    "Exact confidence score",
                    "ڕێژەی متمانەی ورد"
                  ),
                  getLocalizedText(
                    cleanLocale,
                    "Estimated exact score",
                    "ئەنجامی تەخمینکراو"
                  ),
                  getLocalizedText(
                    cleanLocale,
                    "Best prediction market",
                    "باشترین بازاڕی پێشبینی"
                  ),
                  getLocalizedText(
                    cleanLocale,
                    "Expected goals",
                    "گۆڵی چاوەڕوانکراو"
                  ),
                  getLocalizedText(
                    cleanLocale,
                    "Full AI reasoning",
                    "شیکاری تەواوی AI"
                  ),
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <span className="text-[#D4AF37]">
                      🔒
                    </span>

                    <span className="font-bold text-white/70">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 p-7 md:p-9">
                <Link
                  href={`/${cleanLocale}/vip`}
                  className="flex w-full items-center justify-center rounded-full bg-[#D4AF37] px-6 py-4 text-base font-black text-black transition hover:brightness-110"
                >
                  {getLocalizedText(
                    cleanLocale,
                    "Unlock VIP Prediction",
                    "پێشبینی VIP بکەرەوە"
                  )}
                </Link>

                <p className="mt-4 text-center text-xs leading-6 text-white/35">
                  {getLocalizedText(
                    cleanLocale,
                    "No football prediction is guaranteed. VIP provides deeper analysis, not certainty.",
                    "هیچ پێشبینییەکی تۆپی پێ گەرەنتی نییە. VIP شیکاری زیاتر دەدات، نەک دڵنیایی."
                  )}
                </p>
              </div>
            </section>

            <section className="mt-8 rounded-[2rem] border border-yellow-500/15 bg-yellow-500/5 p-6 text-sm leading-7 text-yellow-100/70">
              {getLocalizedText(
                cleanLocale,
                "This content is provided for information and analysis. No football prediction is guaranteed.",
                "ئەم ناوەڕۆکە بۆ زانیاری و شیکردنەوەیە. هیچ پێشبینییەکی تۆپی پێ گەرەنتی نییە."
              )}
            </section>
          </article>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <SidebarCard
              title={getLocalizedText(
                cleanLocale,
                "Match Information",
                "زانیاری یاری"
              )}
            >
              <div className="grid gap-3">
                <SidebarRow
                  label={getLocalizedText(
                    cleanLocale,
                    "Competition",
                    "خول"
                  )}
                  value={
                    prediction
                      .competition.name
                  }
                />

                <SidebarRow
                  label={getLocalizedText(
                    cleanLocale,
                    "Round",
                    "قۆناغ"
                  )}
                  value={
                    prediction
                      .competition.round ||
                    "—"
                  }
                />

                <SidebarRow
                  label={getLocalizedText(
                    cleanLocale,
                    "Season",
                    "وەرز"
                  )}
                  value={
                    prediction
                      .competition.season !==
                    null
                      ? String(
                          prediction
                            .competition
                            .season
                        )
                      : "—"
                  }
                />

                <SidebarRow
                  label="Fixture ID"
                  value={
                    prediction.fixtureId
                  }
                />
              </div>
            </SidebarCard>

            <section className="rounded-[2rem] border border-[#D4AF37]/25 bg-gradient-to-br from-[#1B2230] to-[#101827] p-7 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                ZERRA VIP
              </p>

              <h2 className="mt-4 text-2xl font-black">
                {getLocalizedText(
                  cleanLocale,
                  "Premium AI Analysis",
                  "شیکاری تایبەتی AI"
                )}
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/55">
                {getLocalizedText(
                  cleanLocale,
                  "Unlock the final prediction, confidence score, estimated score, expected goals, and full AI reasoning.",
                  "پێشبینی کۆتایی، ڕێژەی متمانە، ئەنجامی تەخمینکراو، گۆڵی چاوەڕوانکراو و شیکاری تەواوی AI بکەرەوە."
                )}
              </p>

              <Link
                href={`/${cleanLocale}/vip`}
                className="mt-6 flex items-center justify-center rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black"
              >
                {getLocalizedText(
                  cleanLocale,
                  "Unlock VIP Prediction",
                  "پێشبینی VIP بکەرەوە"
                )}
              </Link>
            </section>

            <SidebarCard
              title={getLocalizedText(
                cleanLocale,
                "Explore ZERRA",
                "بەشەکانی ZERRA"
              )}
            >
              <div className="grid gap-3">
                <SidebarLink
                  href={`/${cleanLocale}/predictions`}
                  label={getLocalizedText(
                    cleanLocale,
                    "All Predictions",
                    "هەموو پێشبینییەکان"
                  )}
                />

                <SidebarLink
                  href={`/${cleanLocale}/dashboard`}
                  label={getLocalizedText(
                    cleanLocale,
                    "Dashboard",
                    "داشبۆرد"
                  )}
                />

                <SidebarLink
                  href={`/${cleanLocale}/vip`}
                  label="VIP"
                />
              </div>
            </SidebarCard>
          </aside>
        </div>
      </div>
    </main>
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

function InfoCard({
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

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <h2 className="text-xl font-black">
        {title}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function SidebarRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-3 text-sm">
      <span className="text-white/35">
        {label}
      </span>

      <span className="break-all text-right font-bold text-white/70">
        {value}
      </span>
    </div>
  );
}

function SidebarLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-[#D4AF37] transition hover:border-[#D4AF37]/40"
    >
      {label}
    </Link>
  );
}