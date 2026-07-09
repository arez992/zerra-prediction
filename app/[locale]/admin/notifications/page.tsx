import Link from "next/link";

async function getNotifications() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/notifications`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data;

    return { notifications: [], count: 0 };
  } catch {
    return { notifications: [], count: 0 };
  }
}

export default async function AdminNotificationsPage() {
  const data = await getNotifications();
  const notifications = data.notifications || [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Notification Center</h1>

      <p className="mt-4 text-white/60">
        Important alerts about payments, VIP, AI, and system status.
      </p>

      <section className="mt-10 grid gap-4">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            No notifications found.
          </div>
        ) : (
          notifications.map((item: any, index: number) => (
            <Link
              key={`${item.title}-${index}`}
              href={item.href || "/en/admin/health"}
              className="rounded-3xl border border-white/10 bg-[#101827] p-6 transition hover:border-[#D4AF37]/50"
            >
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">
                {item.type}
              </p>

              <h2 className="mt-3 text-2xl font-black text-[#D4AF37]">
                {item.title}
              </h2>

              <p className="mt-3 text-white/60">{item.message}</p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}