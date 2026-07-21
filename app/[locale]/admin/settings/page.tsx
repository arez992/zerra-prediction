import Link from "next/link";
import SettingsForm from "@/components/admin/SettingsForm";

async function getSettings() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerraprediction.com";

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
  const currency = settings?.currency || "USDT";

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†گ Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Settings</h1>

      <p className="mt-4 text-white/60">
        Manage VIP pricing, website text, and platform system controls.
      </p>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <SettingsCard title="Site Name" value={settings?.siteName || "â€”"} />
        <SettingsCard title="Currency" value={currency} />

        <SettingsCard
          title="Monthly Price"
          value={`${settings?.monthlyPrice ?? 14.99} ${currency}`}
        />

        <SettingsCard
          title="Quarterly Price"
          value={`${settings?.quarterlyPrice ?? 39.99} ${currency}`}
        />

        <SettingsCard
          title="Lifetime Price"
          value={`${settings?.lifetimePrice ?? 129} ${currency}`}
        />

        <SettingsCard
          title="Maintenance"
          value={settings?.maintenanceMode ? "Enabled" : "Disabled"}
        />
      </section>

      <SettingsForm settings={settings} />
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
