import Link from "next/link";

async function getAdminStats() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/stats`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.stats;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  const stats = await getAdminStats();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        ZERRA Admin
      </p>

      <h1 className="mt-4 text-5xl font-black">Admin Dashboard</h1>

      <p className="mt-4 max-w-2xl text-white/60">
        Manage VIP users, payments, prediction history, AI cache, and platform
        performance.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard title="VIP Users" value={stats?.vipUsers ?? 0} href="/en/admin/users" />
        <AdminCard title="Payments" value={stats?.payments ?? 0} href="/en/admin/payments" />
        <AdminCard title="Predictions" value={stats?.predictions ?? 0} href="/en/admin/predictions" />
        <AdminCard title="AI Cache" value={stats?.aiCache ?? 0} href="/en/admin/cache" />
      </section>
    </main>
  );
}

function AdminCard({
  title,
  value,
  href,
}: {
  title: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl transition hover:border-[#D4AF37]/50 hover:bg-[#141f33]"
    >
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-3 text-4xl font-black text-[#D4AF37]">{value}</p>
      <p className="mt-4 text-sm font-bold text-white/40">Open →</p>
    </Link>
  );
}