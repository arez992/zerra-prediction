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
    "en" | "ku";

  fixtureId:
    string | null;

  fixtureDate:
    string | null;

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
    "https://zerra-prediction.vercel.app"
  ).replace(
    /\/+$/,
    ""
  );
}

function normalizeLocale(
  value:
    string
):
  | "en"
  | "ku" {
  return value ===
    "ku"
    ? "ku"
    : "en";
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

function getLocalizedText(
  locale:
    "en" | "ku",

  english:
    string,

  kurdish:
    string
): string {
  return locale ===
    "ku"
    ? kurdish
    : english;
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

      return {
        id:
          document.id,

        keyword:
          normalizeText(
            data.keyword
          ),

        country:
          normalizeText(
            data.country
          ) ||
          null,

        language:
          cleanLocale,

        fixtureId:
          normalizeText(
            data.fixtureId
          ) ||
          null,

        fixtureDate:
          normalizeText(
            data.fixtureDate
          ) ||
          null,

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

  const isKurdish =
    cleanLocale ===
    "ku";

  const canonicalUrl =
    `${getSiteUrl()}${page.canonicalPath}`;

  const structuredData = {
    "@context":
      "https://schema.org",

    "@graph": [
      {
        "@type":
          "SportsEvent",

        "@id":
          canonicalUrl,

        name:
          page.h1 ||
          page.title,

        description:
          page.metaDescription,

        url:
          canonicalUrl,

        startDate:
          page.fixtureDate ||
          undefined,

        sport:
          "Football",
      },

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
              getLocalizedText(
                cleanLocale,
                "Home",
                "سەرەکی"
              ),

            item:
              `${getSiteUrl()}/${cleanLocale}`,
          },

          {
            "@type":
              "ListItem",

            position:
              2,

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
      className="min-h-screen bg-[#07101D] text-white"
      dir={
        isKurdish
          ? "rtl"
          : "ltr"
      }
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
            {page.h1}
          </span>
        </nav>

        <article className="mx-auto mt-8 max-w-5xl">
          <header className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#101827] p-7 shadow-2xl md:p-10">
            <div className="flex flex-wrap gap-2">
              <Badge>
                {getLocalizedText(
                  cleanLocale,
                  "Published Analysis",
                  "شیکاری بڵاوکراوە"
                )}
              </Badge>

              {page.country ? (
                <Badge>
                  {page.country}
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
              {page.h1}
            </h1>

            <p className="mt-6 max-w-4xl text-lg leading-8 text-white/65">
              {page.intro}
            </p>
          </header>

          {page.publicContent
            .overview ? (
            <ContentSection
              label={getLocalizedText(
                cleanLocale,
                "Public Analysis",
                "شیکاری گشتی"
              )}
              title={getLocalizedText(
                cleanLocale,
                "Match Overview",
                "کورتەی یاری"
              )}
              content={
                page
                  .publicContent
                  .overview
              }
            />
          ) : null}

          {page.sections.map(
            (
              section,
              index
            ) => (
              <ContentSection
                key={`${section.heading}-${index}`}
                title={
                  section.heading
                }
                content={
                  section.content
                }
              />
            )
          )}

          {page.publicContent
            .keyInsights
            .length >
          0 ? (
            <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/25 bg-[#101827] p-7 shadow-xl md:p-9">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                {getLocalizedText(
                  cleanLocale,
                  "Key Insights",
                  "تێبینییە سەرەکییەکان"
                )}
              </p>

              <div className="mt-6 grid gap-3">
                {page
                  .publicContent
                  .keyInsights
                  .map(
                    (
                      insight,
                      index
                    ) => (
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
            </section>
          ) : null}

          {page.publicContent
            .aiSummary ? (
            <ContentSection
              label="ZERRA AI"
              title={getLocalizedText(
                cleanLocale,
                "AI Public Insight",
                "تێڕوانینی گشتی AI"
              )}
              content={
                page
                  .publicContent
                  .aiSummary
              }
            />
          ) : null}

          {page.faq.length >
          0 ? (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                FAQ
              </p>

              <h2 className="mt-4 text-3xl font-black">
                {getLocalizedText(
                  cleanLocale,
                  "Frequently Asked Questions",
                  "پرسیارە باوەکان"
                )}
              </h2>

              <div className="mt-6 divide-y divide-white/10">
                {page.faq.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.question}-${index}`}
                      className="py-6 first:pt-0 last:pb-0"
                    >
                      <h3 className="font-black">
                        {item.question}
                      </h3>

                      <p className="mt-3 leading-7 text-white/60">
                        {item.answer}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#D4AF37]/35 bg-gradient-to-br from-[#1B2230] via-[#111B2B] to-[#0B1422] p-7 shadow-2xl md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-[#D4AF37]">
              🔒 ZERRA VIP
            </p>

            <h2 className="mt-4 text-3xl font-black">
              {getLocalizedText(
                cleanLocale,
                "Unlock the Final AI Prediction",
                "پێشبینی کۆتایی AI بکەرەوە"
              )}
            </h2>

            <p className="mt-4 leading-8 text-white/60">
              {getLocalizedText(
                cleanLocale,
                "The final prediction, exact confidence, exact-score estimate, best market, and full AI reasoning are protected and reserved for VIP members.",
                "پێشبینی کۆتایی، ڕێژەی متمانە، ئەنجامی تەخمینکراو، باشترین بازاڕ و شیکاری تەواوی AI بۆ ئەندامانی VIP پارێزراون."
              )}
            </p>

            <Link
              href={`/${cleanLocale}/vip`}
              className="mt-6 inline-flex rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black"
            >
              {getLocalizedText(
                cleanLocale,
                "Explore VIP",
                "VIP ببینە"
              )}
            </Link>
          </section>

          {page.internalLinks
            .length >
          0 ? (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl">
              <h2 className="text-xl font-black">
                {getLocalizedText(
                  cleanLocale,
                  "Explore ZERRA",
                  "بەشەکانی ZERRA"
                )}
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {page.internalLinks.map(
                  (
                    link
                  ) => (
                    <Link
                      key={
                        link
                      }
                      href={
                        link
                      }
                      className="rounded-full border border-[#D4AF37]/25 px-4 py-2 text-sm font-bold text-[#D4AF37]"
                    >
                      {link}
                    </Link>
                  )
                )}
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </main>
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
    <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-black uppercase text-[#D4AF37]">
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
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9">
      {label ? (
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          {label}
        </p>
      ) : null}

      <h2 className="mt-4 text-3xl font-black">
        {title}
      </h2>

      <p className="mt-5 whitespace-pre-line text-base leading-8 text-white/65">
        {content}
      </p>
    </section>
  );
}