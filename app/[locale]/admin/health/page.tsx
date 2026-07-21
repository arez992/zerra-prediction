import Link from "next/link";

async function getHealth() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerraprediction.com";

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

async function getStatus() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/status`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.status;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminHealthPage() {
  const health = await getHealth();
  const status = await getStatus();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†گ Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">System Health</h1>

      <p className="mt-4 text-white/60">
        Monitor Firebase, APIs, payments, VIP, AI, cache, and system controls.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-black">API Status Monitor</h2>

        <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-6">
          <StatusCard title="Firebase" value={status?.firebase || "unknown"} />
          <StatusCard title="OpenAI" value={status?.openai || "unknown"} />
          <StatusCard title="Football API" value={status?.footballApi || "unknown"} />
          <StatusCard title="NOWPayments" value={status?.nowpayments || "unknown"} />
          <StatusCard title="Webhook" value={status?.webhookSecret || "unknown"} />
          <StatusCard title="Environment" value={status?.environment || "unknown"} />
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Maintenance" value={health?.maintenanceMode ? "Enabled" : "Disabled"} />
        <HealthCard title="Registration" value={health?.registrationEnabled ? "Enabled" : "Disabled"} />
        <HealthCard title="Payments" value={health?.paymentsEnabled ? "Enabled" : "Disabled"} />
        <HealthCard title="VIP Enabled" value={health?.vipEnabled ? "Yes" : "No"} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Total Users" value={health?.totalUsers ?? 0} />
        <HealthCard title="Active VIP" value={health?.activeVipUsers ?? 0} />
        <HealthCard title="AI Enabled" value={health?.aiEnabled ? "Yes" : "No"} />
        <HealthCard title="AI Cache Items" value={health?.cacheItems ?? 0} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Total Payments" value={health?.totalPayments ?? 0} />
        <HealthCard title="Pending" value={health?.pendingPayments ?? 0} />
        <HealthCard title="Completed" value={health?.completedPayments ?? 0} />
        <HealthCard title="Failed" value={health?.failedPayments ?? 0} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Prediction History" value={health?.predictionHistory ?? 0} />
        <HealthCard title="Checked At" value={formatDate(health?.checkedAt)} />
      </section>
    </main>
  );
}

function formatDate(value?: string) {
  if (!value) return "â€”";

  return new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusCard({ title, value }: { title: string; value: string }) {
  const label =
    value === "online" || value === "healthy"
      ? "Online"
      : value === "limited" || value === "needs_attention"
      ? "Needs Attention"
      : "Offline";

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-3 text-2xl font-black text-[#D4AF37]">{label}</p>
    </div>
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
