import Link from "next/link";

async function getHealth() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/health`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.health;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminHealthPage() {
  const health = await getHealth();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">System Health</h1>

      <p className="mt-4 text-white/60">
        Monitor Firebase, payments, VIP, AI, cache, and system controls.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Firebase" value={health?.firebase || "unknown"} />
        <HealthCard
          title="Maintenance"
          value={health?.maintenanceMode ? "Enabled" : "Disabled"}
        />
        <HealthCard
          title="Registration"
          value={health?.registrationEnabled ? "Enabled" : "Disabled"}
        />
        <HealthCard
          title="Payments"
          value={health?.paymentsEnabled ? "Enabled" : "Disabled"}
        />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Total Users" value={health?.totalUsers ?? 0} />
        <HealthCard title="Active VIP" value={health?.activeVipUsers ?? 0} />
        <HealthCard title="AI Enabled" value={health?.aiEnabled ? "Yes" : "No"} />
        <HealthCard title="VIP Enabled" value={health?.vipEnabled ? "Yes" : "No"} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Total Payments" value={health?.totalPayments ?? 0} />
        <HealthCard title="Pending" value={health?.pendingPayments ?? 0} />
        <HealthCard title="Completed" value={health?.completedPayments ?? 0} />
        <HealthCard title="Failed" value={health?.failedPayments ?? 0} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="AI Cache Items" value={health?.cacheItems ?? 0} />
        <HealthCard
          title="Prediction History"
          value={health?.predictionHistory ?? 0}
        />
        <HealthCard title="Checked At" value={health?.checkedAt || "—"} />
      </section>
    </main>
  );
}

function HealthCard({
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