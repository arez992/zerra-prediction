import Link from "next/link";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://zerraprediction.com";

async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

async function getAnalytics(cookieHeader: string) {
  try {
    const res = await fetch(`${siteUrl}/api/admin/analytics`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
      },
    });

    const data = await res.json();

    if (data?.success) return data.analytics;

    return null;
  } catch {
    return null;
  }
}

async function getGoogleAnalytics(cookieHeader: string) {
  try {
    const res = await fetch(`${siteUrl}/api/admin/google-analytics`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
      },
    });

    const data = await res.json();

    if (data?.success) return data.analytics;

    return null;
  } catch {
    return null;
  }
}

async function getSearchConsole(cookieHeader: string) {
  try {
    const res = await fetch(`${siteUrl}/api/admin/search-console`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
      },
    });

    const data = await res.json();

    if (data?.success) return data.searchConsole;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminAnalyticsPage() {
  const cookieHeader = await getCookieHeader();

  const [analytics, googleAnalytics, searchConsole] = await Promise.all([
    getAnalytics(cookieHeader),
    getGoogleAnalytics(cookieHeader),
    getSearchConsole(cookieHeader),
  ]);

  const googleCountries = googleAnalytics?.countries || [];
  const searchQueries = searchConsole?.queries || [];
  const searchCountries = searchConsole?.countries || [];
  const searchPages = searchConsole?.pages || [];
  const searchDevices = searchConsole?.devices || [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†گ Back to Admin
      </Link>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        ZERRA Intelligence
      </p>

      <h1 className="mt-4 text-5xl font-black">Analytics Dashboard</h1>

      <p className="mt-4 max-w-3xl text-white/60">
        Track users, VIP conversion, payments, Google Analytics traffic, and
        Google Search Console performance.
      </p>

      {/* Platform analytics */}
      <section className="mt-10">
        <SectionTitle
          title="Platform Analytics"
          description="Users, VIP membership, payments, and revenue from Firestore."
        />

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Stat title="Total Users" value={analytics?.totalUsers ?? 0} />
          <Stat title="VIP Users" value={analytics?.vipUsers ?? 0} />
          <Stat title="Free Users" value={analytics?.freeUsers ?? 0} />
          <Stat
            title="VIP Conversion"
            value={`${analytics?.vipConversionRate ?? 0}%`}
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Total Payments"
            value={analytics?.totalPayments ?? 0}
          />
          <Stat
            title="Completed"
            value={analytics?.completedPayments ?? 0}
          />
          <Stat title="Pending" value={analytics?.pendingPayments ?? 0} />
          <Stat
            title="Payment Success"
            value={`${analytics?.paymentSuccessRate ?? 0}%`}
          />
        </div>
      </section>

      {/* Google Analytics */}
      <section className="mt-14">
        <SectionTitle
          title="Google Analytics"
          description="Real website traffic collected from Google Analytics 4."
        />

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Active Users"
            value={googleAnalytics?.totalActiveUsers ?? 0}
          />

          <Stat
            title="Countries"
            value={googleCountries.length}
          />

          <Stat
            title="GA4 Connection"
            value={googleAnalytics ? "Connected" : "Not Connected"}
          />

          <Stat
            title="Last Checked"
            value={formatDate(googleAnalytics?.checkedAt)}
          />
        </div>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
          <h2 className="text-2xl font-black">Active Users by Country</h2>

          {googleCountries.length === 0 ? (
            <EmptyState text="Google Analytics has not returned country data yet." />
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {googleCountries.map((item: any) => (
                <MetricCard
                  key={item.country}
                  title={item.country || "Unknown"}
                  value={item.activeUsers ?? 0}
                  subtitle="Active users"
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {/* Search Console */}
      <section className="mt-14">
        <SectionTitle
          title="Google Search Console"
          description="Clicks, impressions, CTR, position, keywords, countries, and indexed pages."
        />

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Google Clicks"
            value={searchConsole?.totals?.clicks ?? 0}
          />

          <Stat
            title="Google Impressions"
            value={searchConsole?.totals?.impressions ?? 0}
          />

          <Stat
            title="Average CTR"
            value={`${searchConsole?.totals?.ctr ?? 0}%`}
          />

          <Stat
            title="Average Position"
            value={searchConsole?.totals?.averagePosition ?? 0}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <DataList
            title="Top Search Queries"
            emptyText="Search Console has not collected keyword data yet."
          >
            {searchQueries.slice(0, 10).map((item: any) => (
              <SearchRow
                key={item.query}
                name={item.query}
                clicks={item.clicks}
                impressions={item.impressions}
                ctr={item.ctr}
                position={item.position}
              />
            ))}
          </DataList>

          <DataList
            title="Google Search by Country"
            emptyText="Search Console has not collected country data yet."
          >
            {searchCountries.slice(0, 10).map((item: any) => (
              <SearchRow
                key={item.countryCode}
                name={String(item.countryCode || "Unknown").toUpperCase()}
                clicks={item.clicks}
                impressions={item.impressions}
                ctr={item.ctr}
                position={item.position}
              />
            ))}
          </DataList>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <DataList
            title="Top Search Pages"
            emptyText="Search Console has not collected page data yet."
          >
            {searchPages.slice(0, 10).map((item: any) => (
              <SearchRow
                key={item.page}
                name={shortenPage(item.page)}
                clicks={item.clicks}
                impressions={item.impressions}
                ctr={item.ctr}
                position={item.position}
              />
            ))}
          </DataList>

          <DataList
            title="Search Devices"
            emptyText="Search Console has not collected device data yet."
          >
            {searchDevices.map((item: any) => (
              <SearchRow
                key={item.device}
                name={item.device}
                clicks={item.clicks}
                impressions={item.impressions}
                ctr={item.ctr}
                position={item.position}
              />
            ))}
          </DataList>
        </div>

        <p className="mt-5 text-sm text-white/40">
          Search Console last checked: {formatDate(searchConsole?.checkedAt)}
        </p>
      </section>

      {/* Plan performance */}
      <section className="mt-14">
        <SectionTitle
          title="Plan Performance"
          description="Sales and revenue generated by each VIP membership plan."
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Breakdown
            title="Sales by Plan"
            monthly={analytics?.salesByPlan?.Monthly ?? 0}
            quarterly={analytics?.salesByPlan?.Quarterly ?? 0}
            lifetime={analytics?.salesByPlan?.Lifetime ?? 0}
          />

          <Breakdown
            title="Revenue by Plan"
            monthly={`${analytics?.revenueByPlan?.Monthly ?? 0} USDT`}
            quarterly={`${analytics?.revenueByPlan?.Quarterly ?? 0} USDT`}
            lifetime={`${analytics?.revenueByPlan?.Lifetime ?? 0} USDT`}
          />
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-6">
        <h2 className="text-xl font-black text-[#D4AF37]">
          Google Marketing Note
        </h2>

        <p className="mt-3 leading-7 text-white/60">
          Search Console shows searches where ZERRA appeared in Google results.
          Global search demand for keywords such as football prediction,
          betting tips, and soccer betting by country will be added later using
          Google Ads Keyword Planner.
        </p>
      </section>
    </main>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-3xl font-black">{title}</h2>
      <p className="mt-2 text-white/50">{description}</p>
    </div>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-sm text-white/50">{title}</p>

      <p className="mt-3 break-words text-3xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl bg-black/30 p-5">
      <p className="font-black text-white">{title}</p>

      <p className="mt-3 text-3xl font-black text-[#D4AF37]">
        {value}
      </p>

      <p className="mt-2 text-xs uppercase text-white/40">
        {subtitle}
      </p>
    </div>
  );
}

function DataList({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const childrenArray = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <h2 className="text-2xl font-black">{title}</h2>

      {childrenArray.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="mt-6 space-y-3">{children}</div>
      )}
    </section>
  );
}

function SearchRow({
  name,
  clicks,
  impressions,
  ctr,
  position,
}: {
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="break-all font-black text-[#D4AF37]">{name}</p>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white/50 sm:grid-cols-4">
        <span>
          Clicks:{" "}
          <strong className="text-white">{clicks ?? 0}</strong>
        </span>

        <span>
          Impressions:{" "}
          <strong className="text-white">{impressions ?? 0}</strong>
        </span>

        <span>
          CTR:{" "}
          <strong className="text-white">{ctr ?? 0}%</strong>
        </span>

        <span>
          Position:{" "}
          <strong className="text-white">{position ?? 0}</strong>
        </span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-2xl bg-black/20 p-6 text-center text-sm text-white/40">
      {text}
    </div>
  );
}

function Breakdown({
  title,
  monthly,
  quarterly,
  lifetime,
}: {
  title: string;
  monthly: string | number;
  quarterly: string | number;
  lifetime: string | number;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <h2 className="text-2xl font-black">{title}</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Plan title="Monthly" value={monthly} />
        <Plan title="Quarterly" value={quarterly} />
        <Plan title="Lifetime" value={lifetime} />
      </div>
    </section>
  );
}

function Plan({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl bg-black/30 p-5">
      <p className="text-sm text-white/50">{title}</p>

      <p className="mt-2 break-words text-3xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "â€”";

  return new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortenPage(value?: string) {
  if (!value) return "Unknown";

  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value;
  }
}
