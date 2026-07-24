import Link from "next/link";

const exportsList = [
  {
    title: "Users",
    description: "Export all registered users as CSV.",
    href: "/api/admin/export?type=users",
  },
  {
    title: "Payments",
    description: "Export all payment records as CSV.",
    href: "/api/admin/export?type=payments",
  },
  {
    title: "Activity Logs",
    description: "Export administrator and system activity logs.",
    href: "/api/admin/export?type=activityLogs",
  },
];

export default function AdminExportPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†’ Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Export Center</h1>

      <p className="mt-4 text-white/60">
        Download CSV exports for backup, reporting, and analysis.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        {exportsList.map((item) => (
          <article
            key={item.title}
            className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl"
          >
            <h2 className="text-2xl font-black text-[#D4AF37]">
              {item.title}
            </h2>

            <p className="mt-4 min-h-[72px] text-white/60">
              {item.description}
            </p>

            <a
              href={item.href}
              className="mt-8 inline-flex rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black transition hover:scale-105"
            >
              Download CSV
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
