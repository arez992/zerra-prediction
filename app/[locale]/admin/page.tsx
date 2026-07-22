import Link from "next/link";

type AdminPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type BestCurrentMarket = {
  country: string;
  score: number;
  action: string;
};

type AdminStats = {
  totalUsers?: number;
  vipUsers?: number;
  dailyPublishedPredictions?: number;
  dailySEOPublished?: number;
  todayRevenue?: number;
  todayViews?: number | null;
  bestCurrentMarket?: BestCurrentMarket | null;
};

type KPICardProps = {
  label: string;
  value: string | number;
  note?: string;
  href?: string;
};

type ToolCardProps = {
  title: string;
  description: string;
  href: string;
  badge?: string;
  emphasized?: boolean;
};

function normalizeLocale(
  value: string
): "en" | "ku" {
  return value === "ku"
    ? "ku"
    : "en";
}

async function getAdminStats(): Promise<
  AdminStats | null
> {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const response =
      await fetch(
        `${siteUrl}/api/admin/stats`,
        {
          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    if (
      data?.success &&
      data?.stats
    ) {
      return data.stats;
    }

    return null;
  } catch {
    return null;
  }
}

export default async function AdminPage({
  params,
}: AdminPageProps) {
  const {
    locale: rawLocale,
  } = await params;

  const locale =
    normalizeLocale(
      rawLocale
    );

  const base =
    `/${locale}/admin`;

  const stats =
    await getAdminStats();

  const bestMarket =
    stats?.bestCurrentMarket;

  const kpis:
    KPICardProps[] = [
      {
        label:
          "Total Users",

        value:
          stats?.totalUsers ??
          0,

        href:
          `${base}/users`,
      },

      {
        label:
          "VIP Users",

        value:
          stats?.vipUsers ??
          0,

        href:
          `${base}/users`,
      },

      {
        label:
          "Daily Published Predictions",

        value:
          stats
            ?.dailyPublishedPredictions ??
          0,

        note:
          "Today آ· UTC",

        href:
          `${base}/predictions`,
      },

      {
        label:
          "Daily SEO Published",

        value:
          stats
            ?.dailySEOPublished ??
          0,

        note:
          "Today آ· UTC",

        href:
          `${base}/seo`,
      },

      {
        label:
          "Today Revenue",

        value:
          `${stats?.todayRevenue ?? 0} USDT`,

        href:
          `${base}/revenue`,
      },

      {
        label:
          "Today Views",

        value:
          stats?.todayViews ??
          "—",

        note:
          stats?.todayViews ===
            null
            ? "GA4 unavailable"
            : "Google Analytics",

        href:
          `${base}/analytics`,
      },

      {
        label:
          "Best Current Market",

        value:
          bestMarket
            ?.country ||
          "No Data",

        note:
          bestMarket
            ? `${bestMarket.action} آ· Score ${bestMarket.score}`
            : "Market intelligence",

        href:
          `${base}/market-insights`,
      },
    ];

  const tools:
    ToolCardProps[] = [
      {
        title:
          "Today's Matches",

        description:
          "View today's football fixtures and generate a prediction directly for any eligible match.",

        href:
          `${base}/matches`,

        badge:
          "Daily Tool",

        emphasized:
          true,
      },

      {
        title:
          "AI CEO",

        description:
          "Open the dedicated AI CEO command center for decisions, recommendations, memory, tasks, forecasts, and company intelligence.",

        href:
          `${base}/ai-ceo`,

        badge:
          "Core AI",

        emphasized:
          true,
      },

      {
        title:
          "Predictions",

        description:
          "Manage prediction generation, publishing, settlement, and prediction operations.",

        href:
          `${base}/predictions`,
      },

      {
        title:
          "Learning & Calibration",

        description:
          "Review prediction accuracy, ZAOS learning records, model calibration, and learning performance.",

        href:
          `${base}/learning`,
      },

      {
        title:
          "SEO Command Center",

        description:
          "Manage SEO recommendations, AI-generated drafts, human review, publishing, audits, and learning.",

        href:
          `${base}/seo`,
      },

      {
        title:
          "Users",

        description:
          "Manage ZERRA users, VIP access, and account activity.",

        href:
          `${base}/users`,
      },

      {
        title:
          "Revenue",

        description:
          "Track revenue, sales performance, subscriptions, and monetization.",

        href:
          `${base}/revenue`,
      },

      {
        title:
          "Payments",

        description:
          "Review completed, pending, failed, and expired payment transactions.",

        href:
          `${base}/payments`,
      },

      {
        title:
          "Analytics",

        description:
          "Review website traffic, audience activity, acquisition, and platform performance.",

        href:
          `${base}/analytics`,
      },

      {
        title:
          "Market Intelligence",

        description:
          "Review market opportunities, country performance, risks, and expansion signals.",

        href:
          `${base}/market-intelligence`,
      },

      {
        title:
          "Market Insights",

        description:
          "Explore scored country markets and current growth recommendations.",

        href:
          `${base}/market-insights`,
      },

      {
        title:
          "System Health",

        description:
          "Monitor production services, APIs, prediction systems, and operational health.",

        href:
          `${base}/health`,
      },

      {
        title:
          "Activity & Audit",

        description:
          "Review system activity and administrative audit history.",

        href:
          `${base}/activity`,
      },

      {
        title:
          "Security",

        description:
          "Review security controls and protected administration operations.",

        href:
          `${base}/security`,
      },

      {
        title:
          "Cache",

        description:
          "Manage AI and platform cache operations.",

        href:
          `${base}/cache`,
      },

      {
        title:
          "Settings",

        description:
          "Manage platform-level configuration and administration settings.",

        href:
          `${base}/settings`,
      },
    ];

  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1500px]">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            ZERRA Administration
          </p>

          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black md:text-5xl">
                Admin Dashboard
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50 md:text-base">
                A simplified overview of
                ZERRA users, AI operations,
                predictions, SEO, revenue,
                audience activity, and
                business performance.
              </p>
            </div>

            <p className="text-xs font-bold text-white/30">
              Dashboard metrics refresh
              automatically.
            </p>
          </div>
        </header>

        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
            {kpis.map(
              (
                item
              ) => (
                <KPICard
                  key={
                    item.label
                  }
                  {...item}
                />
              )
            )}
          </div>
        </section>

        <section className="mt-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
              ZERRA Tools
            </p>

            <h2 className="mt-3 text-2xl font-black md:text-3xl">
              Control Center
            </h2>

            <p className="mt-3 text-sm text-white/40">
              Every operational tool has
              its own dedicated workspace.
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tools.map(
              (
                tool
              ) => (
                <ToolCard
                  key={
                    tool.href +
                    tool.title
                  }
                  {...tool}
                />
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  note,
  href,
}: KPICardProps) {
  const content =
    (
      <>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
          {label}
        </p>

        <p className="mt-4 break-words text-2xl font-black text-white">
          {value}
        </p>

        {note && (
          <p className="mt-2 text-[11px] leading-5 text-white/30">
            {note}
          </p>
        )}
      </>
    );

  if (!href) {
    return (
      <div className="rounded-[1.4rem] border border-white/10 bg-[#101827] p-5">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-[1.4rem] border border-white/10 bg-[#101827] p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/40"
    >
      {content}

      <p className="mt-4 text-[11px] font-black text-[#D4AF37] opacity-50 transition group-hover:opacity-100">
        View →
      </p>
    </Link>
  );
}

function ToolCard({
  title,
  description,
  href,
  badge,
  emphasized = false,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className={`group rounded-[1.7rem] border p-6 transition hover:-translate-y-0.5 ${
        emphasized
          ? "border-[#D4AF37]/30 bg-gradient-to-br from-[#182235] to-[#101827] hover:border-[#D4AF37]/60"
          : "border-white/10 bg-[#101827] hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className={`text-xl font-black ${
            emphasized
              ? "text-[#D4AF37]"
              : "text-white"
          }`}
        >
          {title}
        </h3>

        {badge && (
          <span className="shrink-0 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#D4AF37]">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-4 min-h-[72px] text-sm leading-6 text-white/40">
        {description}
      </p>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs font-black text-white/30">
          Open Workspace
        </span>

        <span className="text-[#D4AF37] transition group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
