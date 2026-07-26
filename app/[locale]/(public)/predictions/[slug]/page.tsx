import "server-only";

import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  cache,
} from "react";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  getCachedPostMatchReport,
} from "@/lib/post-match/cache";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type PageProps = {
  params:
    Promise<{
      locale:
        string;

      slug:
        string;
    }>;
};

type SEOSection = {
  heading:
    string;

  content:
    string;
};

type SEOFAQItem = {
  question:
    string;

  answer:
    string;
};

type SEOPublicContent = {
  overview:
    string;

  recentForm:
    string;

  headToHead:
    string;

  homeAwayStats:
    string;

  injuries:
    string;

  aiSummary:
    string;

  riskLevel:
    string;

  keyInsights:
    string[];
};

type PublishedSEOPage = {
  id:
    string;

  keyword:
    string;

  country:
    string | null;

  language:
    "en";

  fixtureId:
    string | null;

  fixtureDate:
    string | null;

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

  slug:
    string;

  canonicalPath:
    string;

  title:
    string;

  metaDescription:
    string;

  h1:
    string;

  intro:
    string;

  sections:
    SEOSection[];

  faq:
    SEOFAQItem[];

  internalLinks:
    string[];

  publicContent:
    SEOPublicContent;

  status:
    "published";

  createdAt:
    string | null;

  updatedAt:
    string | null;

  publishedAt:
    string | null;
};

function getSiteUrl(): string {
  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    "https://zerraprediction.com"
  ).replace(
    /\/+$/,
    ""
  );
}

function normalizeLocale(
  _value: string
): "en" {
  return "en";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getPostMatchFacts(facts: Record<string, unknown>) {
  const fixtureRoot = asRecord(facts.fixture);
  const fixture = asRecord(fixtureRoot.fixture);
  const league = asRecord(fixtureRoot.league);
  const score = asRecord(fixtureRoot.score);
  const halftime = asRecord(score.halftime);
  const venue = asRecord(fixture.venue);
  const status = asRecord(fixture.status);
  const homeHalf = typeof halftime.home === "number" ? halftime.home : null;
  const awayHalf = typeof halftime.away === "number" ? halftime.away : null;
  return {
    competition: typeof league.name === "string" ? league.name : null,
    round: typeof league.round === "string" ? league.round : null,
    season: typeof league.season === "number" ? String(league.season) : null,
    country: typeof league.country === "string" ? league.country : null,
    status: typeof status.long === "string" ? status.long : null,
    date: typeof fixture.date === "string" ? fixture.date : null,
    venue: typeof venue.name === "string" ? venue.name : null,
    halftime: homeHalf !== null && awayHalf !== null ? `${homeHalf} - ${awayHalf}` : null,
  };
}

type MatchHistoryItem = {
  id: string;
  date: string | null;
  competition: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
};

function normalizeHistoryMatch(value: unknown): MatchHistoryItem | null {
  const root = asRecord(value);
  const fixture = asRecord(root.fixture);
  const league = asRecord(root.league);
  const teams = asRecord(root.teams);
  const homeTeam = asRecord(teams.home);
  const awayTeam = asRecord(teams.away);
  const goals = asRecord(root.goals);
  const home = typeof homeTeam.name === "string" ? homeTeam.name : "";
  const away = typeof awayTeam.name === "string" ? awayTeam.name : "";
  if (!home || !away) return null;
  return {
    id: String(fixture.id ?? `${home}-${away}-${fixture.date ?? ""}`),
    date: typeof fixture.date === "string" ? fixture.date : null,
    competition: typeof league.name === "string" ? league.name : null,
    home,
    away,
    homeScore: typeof goals.home === "number" ? goals.home : null,
    awayScore: typeof goals.away === "number" ? goals.away : null,
  };
}

function getRecentMatches(facts: Record<string, unknown>, side: "home" | "away"): MatchHistoryItem[] {
  const recent = asRecord(facts.recentFixtures);
  const values = Array.isArray(recent[side]) ? recent[side] as unknown[] : [];
  return values.map(normalizeHistoryMatch).filter((item): item is MatchHistoryItem => item !== null).slice(0, 5);
}

function getPreviousMeetings(facts: Record<string, unknown>, fixtureId: string | null): MatchHistoryItem[] {
  const values = Array.isArray(facts.headToHead) ? facts.headToHead as unknown[] : [];
  return values.map(normalizeHistoryMatch).filter((item): item is MatchHistoryItem => item !== null && item.id !== fixtureId).slice(0, 5);
}

function formatFixtureDate(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInternalLinkLabel(link: string): string {
  const value = link.toLowerCase();
  if (value.endsWith("/predictions")) return "All Predictions";
  if (value.endsWith("/dashboard")) return "Live Dashboard";
  if (value.endsWith("/vip")) return "ZERRA VIP";
  if (value.endsWith("/ai-accuracy")) return "AI Accuracy";
  if (value.endsWith("/football-predictions")) return "Football Analysis";
  return "Explore ZERRA";
}

function normalizeText(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function serializeDate(
  value:
    unknown
): string | null {
  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    value instanceof
    Date
  ) {
    return value
      .toISOString();
  }

  if (
    value &&
    typeof value ===
      "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate:
          () => Date;
      }
    ).toDate ===
      "function"
  ) {
    return (
      value as {
        toDate:
          () => Date;
      }
    )
      .toDate()
      .toISOString();
  }

  return null;
}

function normalizeSections(
  value:
    unknown
): SEOSection[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const source =
          item as Record<
            string,
            unknown
          >;

        const heading =
          normalizeText(
            source.heading
          );

        const content =
          normalizeText(
            source.content
          );

        if (
          !heading ||
          !content
        ) {
          return null;
        }

        return {
          heading,
          content,
        };
      }
    )
    .filter(
      (
        item
      ): item is SEOSection =>
        item !==
        null
    );
}

function normalizeFAQ(
  value:
    unknown
): SEOFAQItem[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const source =
          item as Record<
            string,
            unknown
          >;

        const question =
          normalizeText(
            source.question
          );

        const answer =
          normalizeText(
            source.answer
          );

        if (
          !question ||
          !answer
        ) {
          return null;
        }

        return {
          question,
          answer,
        };
      }
    )
    .filter(
      (
        item
      ): item is SEOFAQItem =>
        item !==
        null
    );
}

function normalizeLinks(
  value:
    unknown
): string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item
          ) =>
            normalizeText(
              item
            )
        )
        .filter(
          (
            item
          ) =>
            item.startsWith(
              "/"
            )
        )
    )
  );
}

function normalizePublicContent(
  value:
    unknown
): SEOPublicContent {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {
      overview:
        "",

      recentForm:
        "",

      headToHead:
        "",

      homeAwayStats:
        "",

      injuries:
        "",

      aiSummary:
        "",

      riskLevel:
        "Medium",

      keyInsights:
        [],
    };
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  return {
    overview:
      normalizeText(
        source.overview
      ),

    recentForm:
      normalizeText(
        source.recentForm
      ),

    headToHead:
      normalizeText(
        source.headToHead
      ),

    homeAwayStats:
      normalizeText(
        source.homeAwayStats
      ),

    injuries:
      normalizeText(
        source.injuries
      ),

    aiSummary:
      normalizeText(
        source.aiSummary
      ),

    riskLevel:
      normalizeText(
        source.riskLevel
      ) ||
      "Medium",

    keyInsights:
      Array.isArray(
        source.keyInsights
      )
        ? source
            .keyInsights
            .map(
              (
                item
              ) =>
                normalizeText(
                  item
                )
            )
            .filter(
              Boolean
            )
        : [],
  };
}

const getPublishedPredictionTeams =
  cache(
    async (
      fixtureId:
        string | null
    ): Promise<{
      home: {
        name: string;
        logo: string | null;
      };

      away: {
        name: string;
        logo: string | null;
      };
    } | null> => {
      const cleanFixtureId =
        normalizeText(
          fixtureId
        );

      if (
        !cleanFixtureId
      ) {
        return null;
      }

      const document =
        await adminDb
          .collection(
            "predictionHistory"
          )
          .doc(
            `fixture-${cleanFixtureId}`
          )
          .get();

      if (
        !document.exists
      ) {
        return null;
      }

      const data =
        document.data() ||
        {};

      const teams =
        data.teams &&
        typeof data.teams ===
          "object" &&
        !Array.isArray(
          data.teams
        )
          ? data.teams as Record<
              string,
              unknown
            >
          : {};

      const homeTeam =
        teams.home &&
        typeof teams.home ===
          "object" &&
        !Array.isArray(
          teams.home
        )
          ? teams.home as Record<
              string,
              unknown
            >
          : {};

      const awayTeam =
        teams.away &&
        typeof teams.away ===
          "object" &&
        !Array.isArray(
          teams.away
        )
          ? teams.away as Record<
              string,
              unknown
            >
          : {};

      const homeName =
        normalizeText(
          homeTeam.name
        );

      const awayName =
        normalizeText(
          awayTeam.name
        );

      if (
        !homeName ||
        !awayName
      ) {
        return null;
      }

      return {
        home: {
          name:
            homeName,

          logo:
            normalizeText(
              homeTeam.logo
            ) ||
            null,
        },

        away: {
          name:
            awayName,

          logo:
            normalizeText(
              awayTeam.logo
            ) ||
            null,
        },
      };
    }
  );

const getPublishedSEOPage =
  cache(
    async (
      locale:
        string,

      slug:
        string
    ):
      Promise<
        PublishedSEOPage |
        null
      > => {
      const cleanLocale =
        normalizeLocale(
          locale
        );

      const cleanSlug =
        decodeURIComponent(
          slug || ""
        )
          .trim()
          .toLowerCase();

      if (
        !cleanSlug
      ) {
        return null;
      }

      const snapshot =
        await adminDb
          .collection(
            "seoPageDrafts"
          )
          .where(
            "slug",
            "==",
            cleanSlug
          )
          .limit(
            10
          )
          .get();

      const document =
        snapshot.docs.find(
          (
            item
          ) => {
            const data =
              item.data();

            return (
              normalizeText(
                data.status
              ) ===
                "published" &&
              normalizeText(
                data.language
              ) ===
                cleanLocale
            );
          }
        );

      if (
        !document
      ) {
        return null;
      }

      const data =
        document.data();

      const fixtureId =
        normalizeText(
          data.fixtureId
        ) ||
        null;

      const predictionTeams =
        await getPublishedPredictionTeams(
          fixtureId
        );

      const keyword =
        normalizeText(
          data.keyword
        );

      const keywordParts =
        keyword
          .split(
            /\s+vs\s+/i
          )
          .map(
            (
              item
            ) =>
              item.trim()
          )
          .filter(
            Boolean
          );

      const fallbackHomeName =
        keywordParts[0] ||
        "Home Team";

      const fallbackAwayName =
        keywordParts[1] ||
        "Away Team";

      return {
        id:
          document.id,

        keyword,

        country:
          normalizeText(
            data.country
          ) ||
          null,

        language:
          cleanLocale,

        fixtureId,

        fixtureDate:
          normalizeText(
            data.fixtureDate
          ) ||
          null,

        teams: {
          home: {
            name:
              predictionTeams
                ?.home
                .name ||
              fallbackHomeName,

            logo:
              predictionTeams
                ?.home
                .logo ||
              null,
          },

          away: {
            name:
              predictionTeams
                ?.away
                .name ||
              fallbackAwayName,

            logo:
              predictionTeams
                ?.away
                .logo ||
              null,
          },
        },

        slug:
          normalizeText(
            data.slug
          ),

        canonicalPath:
          normalizeText(
            data.canonicalPath
          ) ||
          `/${cleanLocale}/predictions/${cleanSlug}`,

        title:
          normalizeText(
            data.title
          ),

        metaDescription:
          normalizeText(
            data.metaDescription
          ),

        h1:
          normalizeText(
            data.h1
          ),

        intro:
          normalizeText(
            data.intro
          ),

        sections:
          normalizeSections(
            data.sections
          ),

        faq:
          normalizeFAQ(
            data.faq
          ),

        internalLinks:
          normalizeLinks(
            data.internalLinks
          ),

        publicContent:
          normalizePublicContent(
            data.publicContent
          ),

        status:
          "published",

        createdAt:
          serializeDate(
            data.createdAt
          ),

        updatedAt:
          serializeDate(
            data.updatedAt
          ),

        publishedAt:
          serializeDate(
            data.publishedAt
          ),
      };
    }
  );

export async function generateMetadata(
  {
    params,
  }:
    PageProps
): Promise<
  Metadata
> {
  const {
    locale,
    slug,
  } =
    await params;

  const cleanLocale =
    normalizeLocale(
      locale
    );

  const page =
    await getPublishedSEOPage(
      cleanLocale,
      slug
    );

  if (
    !page
  ) {
    return {
      title:
        "Prediction Not Found",

      robots: {
        index:
          false,

        follow:
          false,
      },
    };
  }

  const canonicalUrl =
    `${getSiteUrl()}${page.canonicalPath}`;

  return {
    title:
      page.title,

    description:
      page.metaDescription,

    alternates: {
      canonical:
        canonicalUrl,
    },

    openGraph: {
      title:
        page.title,

      description:
        page.metaDescription,

      url:
        canonicalUrl,

      siteName:
        "ZERRA Prediction",

      type:
        "article",
    },

    twitter: {
      card:
        "summary_large_image",

      title:
        page.title,

      description:
        page.metaDescription,
    },

    robots: {
      index:
        true,

      follow:
        true,

      googleBot: {
        index:
          true,

        follow:
          true,

        "max-image-preview":
          "large",

        "max-snippet":
          -1,

        "max-video-preview":
          -1,
      },
    },
  };
}

export default async function PredictionDetailPage(
  {
    params,
  }:
    PageProps
) {
  const {
    locale,
    slug,
  } =
    await params;

  const cleanLocale =
    normalizeLocale(
      locale
    );

  const page =
    await getPublishedSEOPage(
      cleanLocale,
      slug
    );

  if (
    !page
  ) {
    notFound();
  }

  const postMatchReport =
    page.fixtureId
      ? await getCachedPostMatchReport(page.fixtureId, cleanLocale).catch(() => null)
      : null;

  const hasFinalReport =
    postMatchReport?.status === "published" &&
    typeof postMatchReport.homeScore === "number" &&
    typeof postMatchReport.awayScore === "number";

  const postMatchFacts = postMatchReport ? getPostMatchFacts(postMatchReport.facts) : null;
  const recentHomeMatches = postMatchReport ? getRecentMatches(postMatchReport.facts, "home") : [];
  const recentAwayMatches = postMatchReport ? getRecentMatches(postMatchReport.facts, "away") : [];
  const previousMeetings = postMatchReport ? getPreviousMeetings(postMatchReport.facts, page.fixtureId) : [];
  const hasDetailedStatistics = Boolean(postMatchReport && postMatchReport.statistics.length > 0);
  const hasKeyEvents = Boolean(postMatchReport && postMatchReport.events.length > 0);
  const canonicalUrl =
    `${getSiteUrl()}${page.canonicalPath}`;

  const structuredData = {
    "@context":
      "https://schema.org",

    "@graph": [
      {
        "@type":
          "WebPage",

        "@id":
          `${canonicalUrl}#webpage`,

        url:
          canonicalUrl,

        name:
          page.title,

        description:
          page.metaDescription,

        inLanguage:
          cleanLocale,

        datePublished:
          page.publishedAt ||
          undefined,

        dateModified:
          page.updatedAt ||
          page.publishedAt ||
          undefined,

        isPartOf: {
          "@type":
            "WebSite",

          name:
            "ZERRA Prediction",

          url:
            getSiteUrl(),
        },
      },

      ...(page.faq.length >
      0
        ? [
            {
              "@type":
                "FAQPage",

              mainEntity:
                page.faq.map(
                  (
                    item
                  ) => ({
                    "@type":
                      "Question",

                    name:
                      item.question,

                    acceptedAnswer: {
                      "@type":
                        "Answer",

                      text:
                        item.answer,
                    },
                  })
                ),
            },
          ]
        : []),

      {
        "@type":
          "BreadcrumbList",

        itemListElement: [
          {
            "@type":
              "ListItem",

            position:
              1,

            name:
              "Home",

            item:
              `${getSiteUrl()}/${cleanLocale}`,
          },

          {
            "@type":
              "ListItem",

            position:
              2,

            name:
              "Predictions",

            item:
              `${getSiteUrl()}/${cleanLocale}/predictions`,
          },

          {
            "@type":
              "ListItem",

            position:
              3,

            name:
              page.h1 ||
              page.keyword,

            item:
              canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <main
      className="min-h-screen bg-[#f7faf8] text-[#102117]"
      dir="ltr"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              structuredData
            ).replace(
              /</g,
              "\\u003c"
            ),
        }}
      />

      <div className="mx-auto max-w-7xl px-5 py-8 lg:py-10">
  <nav className="flex flex-wrap items-center gap-2 text-sm text-[#7b8780]">
    <Link href={`/${cleanLocale}`} className="transition hover:text-[#159447]">Home</Link>
    <span>/</span>
    <Link href={`/${cleanLocale}/predictions`} className="transition hover:text-[#159447]">Predictions</Link>
    <span>/</span>
    <span className="text-[#536259]">{page.h1}</span>
  </nav>

  <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
    <div className="min-w-0 space-y-6">
      <header className="rounded-[1.75rem] border border-[#dfe8e2] bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{hasFinalReport ? "Post-Match Report" : "Published Analysis"}</Badge>
          {page.country ? <Badge>{page.country}</Badge> : null}
          {hasFinalReport ? <Badge>Final Result</Badge> : null}
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-[#e4ece7] bg-[#fbfdfb] px-4 py-5 md:px-7">
          <SEOTeam name={page.teams.home.name} logo={page.teams.home.logo} />
          {hasFinalReport && postMatchReport ? (
            <div className="min-w-[92px] text-center">
              <div className="text-3xl font-black tracking-tight text-[#102117] md:text-4xl">{postMatchReport.homeScore} - {postMatchReport.awayScore}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#159447]">Final</div>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e8dd] bg-white text-xs font-black uppercase text-[#159447]">VS</div>
          )}
          <SEOTeam name={page.teams.away.name} logo={page.teams.away.logo} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroFact label="Date" value={formatFixtureDate(postMatchFacts?.date || page.fixtureDate)} />
          <HeroFact label="Status" value={hasFinalReport ? "Finished" : "Published"} />
          <HeroFact label="Country" value={postMatchFacts?.country || page.country || "Unavailable"} />
          <HeroFact label="Data Quality" value={postMatchReport?.dataQuality ? postMatchReport.dataQuality.charAt(0).toUpperCase() + postMatchReport.dataQuality.slice(1) : "Pending"} />
        </div>

        <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight text-[#102117] md:text-4xl">{page.h1}</h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[#5f6d65]">{page.intro}</p>
      </header>

      {!hasFinalReport && page.publicContent.overview ? (
        <section className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">Quick Overview</p>
              <h2 className="mt-2 text-xl font-black text-[#102117]">Match at a Glance</h2>
            </div>
          </div>
          <p className="mt-4 leading-7 text-[#5f6d65]">{page.publicContent.overview}</p>
        </section>
      ) : null}

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[#dfe8e2] bg-white p-2 text-sm font-bold text-[#536259] shadow-sm">
        <a href="#overview" className="whitespace-nowrap rounded-xl bg-[#eef9f1] px-4 py-2 text-[#159447]">Overview</a>
        <a href="#insights" className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-[#f5f8f6]">Key Insights</a>
        <a href="#details" className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-[#f5f8f6]">Match Details</a>
        <a href="#analysis" className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-[#f5f8f6]">AI Analysis</a>
        {previousMeetings.length > 0 ? <a href="#h2h" className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-[#f5f8f6]">Head-to-Head</a> : null}
      </div>

      {!hasFinalReport ? (
      <section id="overview" className="grid gap-5 md:grid-cols-2">
        {page.sections.filter((section) => section.heading.toLowerCase() !== "match overview").map((section,index) => (
          <div key={`${section.heading}-${index}`} className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-[#102117]">{section.heading}</h2>
            <p className="mt-3 whitespace-pre-line leading-7 text-[#5f6d65]">{section.content}</p>
          </div>
        ))}
      </section>
      ) : null}

      {hasFinalReport && postMatchReport && postMatchFacts ? (
        <section id="details" className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">Final Match Facts</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {postMatchFacts.competition ? <HeroFact label="Competition" value={postMatchFacts.competition} /> : null}
            {postMatchFacts.round ? <HeroFact label="Round" value={postMatchFacts.round} /> : null}
            {postMatchFacts.season ? <HeroFact label="Season" value={postMatchFacts.season} /> : null}
            {postMatchFacts.halftime ? <HeroFact label="Half-time" value={postMatchFacts.halftime} /> : null}
            {postMatchFacts.status ? <HeroFact label="Status" value={postMatchFacts.status} /> : null}
            {postMatchFacts.venue ? <HeroFact label="Venue" value={postMatchFacts.venue} /> : null}
          </div>
        </section>
      ) : null}

      {hasFinalReport && postMatchReport ? (
        <section className="rounded-[1.5rem] border border-[#cfe7d6] bg-white p-5 shadow-sm md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">Post-Match Report</p>
          <h2 className="mt-2 text-2xl font-black text-[#102117]">{postMatchReport.headline}</h2>
          <p className="mt-3 font-medium leading-7 text-[#536259]">{postMatchReport.summary}</p>
          <div className="mt-5 border-t border-[#e5ebe7] pt-5">
            <h3 className="text-lg font-black text-[#102117]">Match Report</h3>
            <p className="mt-3 whitespace-pre-line leading-7 text-[#5f6d65]">{postMatchReport.matchReport}</p>
          </div>
        </section>
      ) : null}

      {!hasFinalReport && page.publicContent.keyInsights.length > 0 ? (
        <section id="insights" className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">Key Insights</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {page.publicContent.keyInsights.map((insight,index) => (
              <div key={`${insight}-${index}`} className="flex gap-3 rounded-xl border border-[#e4ece7] bg-[#fbfdfb] p-4">
                <span className="font-black text-[#159447]">✓</span>
                <p className="text-sm leading-6 text-[#536259]">{insight}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasFinalReport && (recentHomeMatches.length > 0 || recentAwayMatches.length > 0) ? (
        <section className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">Recent Matches</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div><h3 className="font-black text-[#102117]">{page.teams.home.name}</h3><div className="mt-3 grid gap-2">{recentHomeMatches.map((match)=><MatchHistoryRow key={`home-${match.id}`} match={match} />)}</div></div>
            <div><h3 className="font-black text-[#102117]">{page.teams.away.name}</h3><div className="mt-3 grid gap-2">{recentAwayMatches.map((match)=><MatchHistoryRow key={`away-${match.id}`} match={match} />)}</div></div>
          </div>
        </section>
      ) : null}

      {hasFinalReport && previousMeetings.length > 0 ? (
        <section id="h2h" className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">Previous Meetings</p>
          <h2 className="mt-2 text-xl font-black text-[#102117]">Head-to-Head Results</h2>
          <div className="mt-4 grid gap-2">{previousMeetings.map((match)=><MatchHistoryRow key={`h2h-${match.id}`} match={match} />)}</div>
        </section>
      ) : null}

      {(page.publicContent.aiSummary || (hasFinalReport && postMatchReport)) ? (
        <section id="analysis" className="rounded-[1.5rem] border border-[#cfe7d6] bg-gradient-to-br from-[#f7fcf8] to-white p-5 shadow-sm md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">ZERRA AI</p>
          <h2 className="mt-2 text-xl font-black text-[#102117]">{hasFinalReport ? "Post-Match Analysis" : "AI Public Insight"}</h2>
          <p className="mt-3 whitespace-pre-line leading-7 text-[#536259]">{hasFinalReport && postMatchReport ? postMatchReport.postMatchAnalysis : page.publicContent.aiSummary}</p>
          <p className="mt-4 text-xs text-[#7b8780]">AI-generated interpretation is separated from verified factual match data.</p>
        </section>
      ) : null}
    </div>

    <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
      <section className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#159447]">Match Summary</p>
        <div className="mt-4 grid gap-3">
          <HeroFact label="Status" value={hasFinalReport ? "Finished" : "Published"} />
          {hasFinalReport && postMatchReport ? <HeroFact label="Final Score" value={`${postMatchReport.homeScore} - ${postMatchReport.awayScore}`} /> : null}
          {postMatchFacts?.competition ? <HeroFact label="Competition" value={postMatchFacts.competition} /> : null}
          <HeroFact label="Date" value={formatFixtureDate(postMatchFacts?.date || page.fixtureDate)} />
          <HeroFact label="Data Quality" value={postMatchReport?.dataQuality ? postMatchReport.dataQuality.charAt(0).toUpperCase() + postMatchReport.dataQuality.slice(1) : "Pending"} />
        </div>
      </section>

      {page.faq.length > 0 ? (
        <section className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#159447]">FAQ</p>
          <div className="mt-4 grid gap-2">
            {page.faq.map((item,index) => (
              <details key={`${item.question}-${index}`} className="group rounded-xl border border-[#e4ece7] bg-[#fbfdfb] px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-black text-[#102117]">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-[#66736b]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {page.internalLinks.length > 0 ? (
        <section className="rounded-[1.5rem] border border-[#dfe8e2] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#159447]">Explore ZERRA</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {page.internalLinks.map((link)=><Link key={link} href={link} className="rounded-xl border border-[#e4ece7] px-4 py-3 text-sm font-black text-[#102117] transition hover:border-[#bcdcc6] hover:bg-[#f7fcf8]">{getInternalLinkLabel(link)} <span className="text-[#159447]">→</span></Link>)}
          </div>
        </section>
      ) : null}
    </aside>
  </div>

  <section className="mt-6 rounded-[1.75rem] border border-[#cfe7d6] bg-gradient-to-r from-[#fffdf8] via-white to-[#f4fbf6] p-6 shadow-sm md:p-7">
    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#159447]">🔒 ZERRA VIP</p>
        <h2 className="mt-2 text-2xl font-black text-[#102117]">Unlock Full AI Analysis</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736b]">Exact prediction, confidence, exact-score estimate, best market and full private AI reasoning remain reserved for ZERRA VIP members.</p>
      </div>
      <Link href={`/${cleanLocale}/vip`} className="inline-flex justify-center rounded-full bg-[#159447] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#117c3c]">Explore ZERRA VIP</Link>
    </div>
  </section>
</div>
</main>
  );
}

function MatchHistoryRow({ match }: { match: MatchHistoryItem }) {
  const hasScore = typeof match.homeScore === "number" && typeof match.awayScore === "number";
  return (
    <div className="grid gap-2 rounded-2xl border border-[#e4ece7] bg-[#fbfdfb] px-4 py-3 sm:grid-cols-[90px_1fr_auto] sm:items-center">
      <div className="text-xs font-bold text-[#7b8780]">{formatFixtureDate(match.date)}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#102117]">{match.home} <span className="font-medium text-[#8a9690]">vs</span> {match.away}</p>
        {match.competition ? <p className="mt-1 truncate text-xs text-[#7b8780]">{match.competition}</p> : null}
      </div>
      <div className="text-sm font-black text-[#102117]">{hasScore ? `${match.homeScore} - ${match.awayScore}` : "—"}</div>
    </div>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e4ece7] bg-[#fbfdfb] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a9690]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#102117]">{value}</p>
    </div>
  );
}

function SEOTeam(
  {
    name,
    logo,
  }: {
    name:
      string;

    logo:
      string | null;
  }
) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      {logo ? (
        <img
          src={
            logo
          }
          alt={`${name} logo`}
          className="h-16 w-16 object-contain md:h-20 md:w-20"
          loading="eager"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37]/10 text-xl font-black text-[#159447] md:h-20 md:w-20">
          {name
            .slice(
              0,
              1
            )
            .toUpperCase()}
        </div>
      )}

      <p className="mt-3 break-words text-sm font-black text-[#102117] md:text-base">
        {name}
      </p>
    </div>
  );
}

function Badge(
  {
    children,
  }: {
    children:
      React.ReactNode;
  }
) {
  return (
    <span className="rounded-full border border-[#cde9d6] bg-[#eef9f1] px-3 py-1 text-xs font-black uppercase text-[#159447]">
      {children}
    </span>
  );
}

function ContentSection(
  {
    label,
    title,
    content,
  }: {
    label?:
      string;

    title:
      string;

    content:
      string;
  }
) {
  return (
    <section className="mt-8 rounded-[2rem] border border-[#dfe8e2] bg-white p-7 shadow-sm md:p-9">
      {label ? (
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#159447]">
          {label}
        </p>
      ) : null}

      <h2 className="mt-4 text-3xl font-black">
        {title}
      </h2>

      <p className="mt-5 whitespace-pre-line text-base leading-8 text-[#536259]">
        {content}
      </p>
    </section>
  );
}
