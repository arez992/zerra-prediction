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

  const cards = [
    { title: "VIP Users", value: stats?.vipUsers ?? 0, href: "/en/admin/users", icon: "👥" },
    { title: "Payments", value: stats?.payments ?? 0, href: "/en/admin/payments", icon: "💳" },
    { title: "Predictions", value: stats?.predictions ?? 0, href: "/en/admin/predictions", icon: "🏆" },
    { title: "AI Cache", value: stats?.aiCache ?? 0, href: "/en/admin/cache", icon: "⚙️" },
    { title: "Revenue", value: "View", href: "/en/admin/revenue", icon: "💰" },
    { title: "Analytics", value: "View", href: "/en/admin/analytics", icon: "📊" },
    { title: "Health", value: "Check", href: "/en/admin/health", icon: "🛡️" },
    { title: "Activity", value: "Logs", href: "/en/admin/activity", icon: "📋" },
    { title: "Notifications", value: "Alerts", href: "/en/admin/notifications", icon: "🔔" },
    { title: "Export", value: "CSV", href: "/en/admin/export", icon: "⬇️" },
    { title: "Settings", value: "Manage", href: "/en/admin/settings", icon: "⚙️" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        ZERRA Admin
      </p>

      <h1 className="mt-4 text-5xl font-black">Admin Dashboard</h1>

      <p className="mt-4 max-w-3xl text-white/60">
        Manage VIP users, payments, prediction history, AI cache, revenue,
        analytics, settings, health, activity, notifications, exports, and
        platform performance.
      </p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <AdminCard key={card.href} {...card} />
        ))}
      </section>
    </main>
  );
}

function AdminCard({
  title,
  value,
  href,
  icon,
}: {
  title: string;
  value: string | number;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl transition hover:-translate-y-1 hover:border-[#D4AF37]/60 hover:bg-[#141f33]"
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF37]/10 text-2xl">
        {icon}
      </div>

      <p className="text-sm font-bold text-white/60">{title}</p>

      <p className="mt-4 text-4xl font-black text-[#D4AF37]">{value}</p>

      <p className="mt-5 text-sm font-bold text-white/40 transition group-hover:text-[#D4AF37]">
        Open →
      </p>
    </Link>
  );
}