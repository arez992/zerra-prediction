import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

type SEOSection = {
  heading?: string;
  content?: string;
};

type SEOFAQ = {
  question?: string;
  answer?: string;
};

type PublishedSEOPage = {
  id: string;
  keyword: string;
  language: "en" | "ku";
  country?: string | null;

  slug: string;
  canonicalPath: string;

  title: string;
  metaDescription: string;

  h1: string;
  intro: string;

  sections: SEOSection[];
  faq: SEOFAQ[];

  internalLinks: string[];
  relatedKeywords: string[];

  schemaType?: string;
  status: "published";

  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

function serializeTimestamp(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

const getPublishedPage = cache(
  async (
    locale: string,
    slug: string
  ): Promise<PublishedSEOPage | null> => {
    const cleanLocale = locale === "ku" ? "ku" : "en";
    const cleanSlug = decodeURIComponent(slug).trim();

    if (!cleanSlug) {
      return null;
    }

    const canonicalPath =
      `/${cleanLocale}/predictions/${cleanSlug}`;

    const snapshot = await adminDb
      .collection("seoPageDrafts")
      .where("canonicalPath", "==", canonicalPath)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];
    const data = document.data();

    if (data.status !== "published") {
      return null;
    }

    return {
      id: document.id,

      keyword: String(data.keyword || ""),
      language: data.language === "ku" ? "ku" : "en",
      country: data.country || null,

      slug: String(data.slug || ""),
      canonicalPath: String(data.canonicalPath || ""),

      title: String(data.title || ""),
      metaDescription: String(
        data.metaDescription || ""
      ),

      h1: String(data.h1 || data.title || ""),
      intro: String(data.intro || ""),

      sections: Array.isArray(data.sections)
        ? data.sections
        : [],

      faq: Array.isArray(data.faq)
        ? data.faq
        : [],

      internalLinks: Array.isArray(data.internalLinks)
        ? data.internalLinks
        : [],

      relatedKeywords: Array.isArray(
        data.relatedKeywords
      )
        ? data.relatedKeywords
        : [],

      schemaType: data.schemaType || "WebPage",
      status: "published",

      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
      publishedAt: serializeTimestamp(
        data.publishedAt
      ),
    };
  }
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const page = await getPublishedPage(locale, slug);

  if (!page) {
    return {
      title: "Page Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://zerra-prediction.vercel.app";

  const canonicalUrl =
    `${siteUrl}${page.canonicalPath}`;

  return {
    title: page.title,
    description: page.metaDescription,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url: canonicalUrl,
      siteName: "ZERRA Prediction",
      type: "article",
    },

    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.metaDescription,
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

export default async function PublishedSEOPage({
  params,
}: PageProps) {
  const { locale, slug } = await params;

  const page = await getPublishedPage(locale, slug);

  if (!page) {
    notFound();
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://zerra-prediction.vercel.app";

  const canonicalUrl =
    `${siteUrl}${page.canonicalPath}`;

  const faqItems = page.faq.filter(
    (item) =>
      String(item.question || "").trim() &&
      String(item.answer || "").trim()
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": canonicalUrl,
        url: canonicalUrl,
        name: page.title,
        description: page.metaDescription,
        inLanguage: page.language,
        datePublished:
          page.publishedAt || undefined,
        dateModified:
          page.updatedAt ||
          page.publishedAt ||
          undefined,
        isPartOf: {
          "@type": "WebSite",
          name: "ZERRA Prediction",
          url: siteUrl,
        },
      },

      ...(faqItems.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            },
          ]
        : []),

      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/${page.language}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Predictions",
            item: `${siteUrl}/${page.language}/predictions`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: page.h1,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  const isKurdish = page.language === "ku";

  return (
    <main
      className="min-h-screen bg-[#07101d] text-white"
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
            href={`/${page.language}`}
            className="transition hover:text-[#D4AF37]"
          >
            {isKurdish ? "سەرەکی" : "Home"}
          </Link>

          <span>/</span>

          <Link
            href={`/${page.language}/predictions`}
            className="transition hover:text-[#D4AF37]"
          >
            {isKurdish ? "پێشبینییەکان" : "Predictions"}
          </Link>

          <span>/</span>

          <span className="text-white/65">
            {page.keyword}
          </span>
        </nav>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="min-w-0">
            <header className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#101827] p-7 shadow-2xl md:p-10">
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {isKurdish
                    ? "شیکاری AI"
                    : "AI Analysis"}
                </Badge>

                {page.country && (
                  <Badge>{page.country}</Badge>
                )}

                <Badge>
                  {isKurdish
                    ? "پەڕەی بڵاوکراوە"
                    : "Published"}
                </Badge>
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                {page.h1}
              </h1>

              <p className="mt-6 max-w-4xl text-lg leading-8 text-white/65">
                {page.intro}
              </p>

              <div className="mt-8 flex flex-wrap gap-4 text-sm text-white/40">
                <span>
                  {isKurdish
                    ? "بڵاوکراوەتەوە:"
                    : "Published:"}{" "}
                  {formatDate(page.publishedAt)}
                </span>

                <span>
                  {isKurdish
                    ? "نوێکراوەتەوە:"
                    : "Updated:"}{" "}
                  {formatDate(page.updatedAt)}
                </span>
              </div>
            </header>

            <section className="mt-8 space-y-6">
              {page.sections.map((section, index) => {
                const heading = String(
                  section.heading || ""
                ).trim();

                const content = String(
                  section.content || ""
                ).trim();

                if (!heading || !content) {
                  return null;
                }

                return (
                  <section
                    key={`${heading}-${index}`}
                    className="rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9"
                  >
                    <h2 className="text-2xl font-black md:text-3xl">
                      {heading}
                    </h2>

                    <p className="mt-5 whitespace-pre-line text-base leading-8 text-white/65">
                      {content}
                    </p>
                  </section>
                );
              })}
            </section>

            {faqItems.length > 0 && (
              <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                  FAQ
                </p>

                <h2 className="mt-4 text-3xl font-black">
                  {isKurdish
                    ? "پرسیارە باوەکان"
                    : "Frequently Asked Questions"}
                </h2>

                <div className="mt-7 space-y-4">
                  {faqItems.map((item, index) => (
                    <details
                      key={`${item.question}-${index}`}
                      className="group rounded-3xl bg-black/25 p-5"
                    >
                      <summary className="cursor-pointer list-none pr-7 text-lg font-black">
                        {item.question}
                      </summary>

                      <p className="mt-4 leading-7 text-white/60">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8 rounded-[2rem] border border-yellow-500/15 bg-yellow-500/5 p-6 text-sm leading-7 text-yellow-100/70">
              {isKurdish
                ? "ئەم ناوەڕۆکە بۆ زانیاری و شیکردنەوەیە. هیچ پێشبینییەکی وەرزشی گەرەنتی نییە."
                : "This content is provided for information and analysis. No football prediction is guaranteed."}
            </section>
          </article>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <SidebarCard
              title={
                isKurdish
                  ? "پێشبینییە پەیوەندیدارەکان"
                  : "Related Predictions"
              }
            >
              {page.relatedKeywords.length === 0 ? (
                <p className="text-sm text-white/40">
                  {isKurdish
                    ? "هیچ وشەیەکی پەیوەندیدار زیاد نەکراوە."
                    : "No related keywords added."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {page.relatedKeywords.map(
                    (keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/60"
                      >
                        {keyword}
                      </span>
                    )
                  )}
                </div>
              )}
            </SidebarCard>

            <SidebarCard
              title={
                isKurdish
                  ? "لینکە ناوخۆییەکان"
                  : "Explore ZERRA"
              }
            >
              <div className="grid gap-3">
                {page.internalLinks.map((link) => (
                  <Link
                    key={link}
                    href={link}
                    className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-[#D4AF37] transition hover:border-[#D4AF37]/40"
                  >
                    {link}
                  </Link>
                ))}
              </div>
            </SidebarCard>

            <section className="rounded-[2rem] border border-[#D4AF37]/25 bg-gradient-to-br from-[#1b2230] to-[#101827] p-7 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                ZERRA VIP
              </p>

              <h2 className="mt-4 text-2xl font-black">
                {isKurdish
                  ? "شیکاری تایبەت و پێشبینی VIP"
                  : "Premium AI Analysis"}
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/55">
                {isKurdish
                  ? "دەستگەیشتن بە confidence، risk، value picks و شیکاری وردتر."
                  : "Unlock confidence scores, risk analysis, value picks, and deeper match insights."}
              </p>

              <Link
                href={`/${page.language}/vip`}
                className="mt-6 flex items-center justify-center rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black"
              >
                {isKurdish
                  ? "بچۆ بۆ VIP"
                  : "Unlock VIP"}
              </Link>
            </section>
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

      <div className="mt-5">{children}</div>
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en", {
    dateStyle: "medium",
  });
}