import Link from "next/link";

async function getSettings() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/settings`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.settings;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Settings</h1>

      <p className="mt-4 text-white/60">
        Manage pricing, website text, and platform system controls.
      </p>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <SettingsCard title="Site Name" value={settings?.siteName || "—"} />
        <SettingsCard title="Currency" value={settings?.currency || "USD"} />
        <SettingsCard
          title="Monthly Price"
          value={`${settings?.monthlyPrice ?? 0} ${settings?.currency || "USD"}`}
        />
        <SettingsCard
          title="Yearly Price"
          value={`${settings?.yearlyPrice ?? 0} ${settings?.currency || "USD"}`}
        />
        <SettingsCard
          title="Lifetime Price"
          value={`${settings?.lifetimePrice ?? 0} ${settings?.currency || "USD"}`}
        />
        <SettingsCard
          title="Maintenance"
          value={settings?.maintenanceMode ? "Enabled" : "Disabled"}
        />
      </section>
    </main>
  );
}

function SettingsCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-3 text-2xl font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}