import Link from "next/link";

async function getAnalytics() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/analytics`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.analytics;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminAnalyticsPage() {
  const analytics = await getAnalytics();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Analytics Dashboard</h1>

      <p className="mt-4 text-white/60">
        Track users, VIP conversion, payments, and plan performance.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total Users" value={analytics?.totalUsers ?? 0} />
        <Stat title="VIP Users" value={analytics?.vipUsers ?? 0} />
        <Stat title="Free Users" value={analytics?.freeUsers ?? 0} />
        <Stat
          title="VIP Conversion"
          value={`${analytics?.vipConversionRate ?? 0}%`}
        />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total Payments" value={analytics?.totalPayments ?? 0} />
        <Stat
          title="Completed"
          value={analytics?.completedPayments ?? 0}
        />
        <Stat title="Pending" value={analytics?.pendingPayments ?? 0} />
        <Stat
          title="Payment Success"
          value={`${analytics?.paymentSuccessRate ?? 0}%`}
        />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
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
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-3 text-4xl font-black text-[#D4AF37]">{value}</p>
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

function Plan({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-black/30 p-5">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}