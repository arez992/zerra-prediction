import Link from "next/link";

async function getRevenue() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/revenue`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.revenue;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminRevenuePage() {
  const revenue = await getRevenue();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        → Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Revenue Dashboard</h1>

      <p className="mt-4 text-white/60">
        Track VIP revenue, payments, users, success rate, and plan performance.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Today Revenue" value={`${revenue?.todayRevenue ?? 0} USDT`} />
        <Stat title="This Month" value={`${revenue?.thisMonthRevenue ?? 0} USDT`} />
        <Stat title="Lifetime Revenue" value={`${revenue?.lifetimeRevenue ?? 0} USDT`} />
        <Stat title="Success Rate" value={`${revenue?.successRate ?? 0}%`} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Completed Payments" value={revenue?.completedPayments ?? 0} />
        <Stat title="Pending Payments" value={revenue?.pendingPayments ?? 0} />
        <Stat title="Failed Payments" value={revenue?.failedPayments ?? 0} />
        <Stat title="Total Payments" value={revenue?.totalPayments ?? 0} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total Users" value={revenue?.totalUsers ?? 0} />
        <Stat title="Active VIP Users" value={revenue?.activeVipUsers ?? 0} />
        <Stat title="Monthly Sales" value={revenue?.planCounts?.Monthly ?? 0} />
        <Stat title="Lifetime Sales" value={revenue?.planCounts?.Lifetime ?? 0} />
      </section>

      <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#101827] p-6">
        <h2 className="text-2xl font-black">Sales by Plan</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Plan title="Monthly" value={revenue?.planCounts?.Monthly ?? 0} />
          <Plan title="Quarterly" value={revenue?.planCounts?.Quarterly ?? 0} />
          <Plan title="Lifetime" value={revenue?.planCounts?.Lifetime ?? 0} />
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#101827] p-6">
        <h2 className="text-2xl font-black">Revenue by Plan</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Plan
            title="Monthly Revenue"
            value={`${revenue?.planRevenue?.Monthly ?? 0} USDT`}
          />
          <Plan
            title="Quarterly Revenue"
            value={`${revenue?.planRevenue?.Quarterly ?? 0} USDT`}
          />
          <Plan
            title="Lifetime Revenue"
            value={`${revenue?.planRevenue?.Lifetime ?? 0} USDT`}
          />
        </div>
      </section>
    </main>
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
      <p className="mt-3 text-4xl font-black text-[#D4AF37]">{value}</p>
    </div>
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
