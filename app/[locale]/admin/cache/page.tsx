import Link from "next/link";
import AdminGate from "@/components/admin/AdminGate";

async function getCacheItems() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/cache`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.cacheItems;

    return [];
  } catch {
    return [];
  }
}

export default async function AdminCachePage() {
  const cacheItems = await getCacheItems();

  return (
    <AdminGate>
      <main className="mx-auto max-w-7xl px-5 py-12 text-white">
        <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
          ← Back to Admin
        </Link>

        <h1 className="mt-6 text-5xl font-black">AI Cache</h1>

        <p className="mt-4 text-white/60">
          View cached GPT match analysis stored in Firestore.
        </p>

        <section className="mt-10 grid gap-4">
          {cacheItems.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              No AI cache found.
            </div>
          ) : (
            cacheItems.map((item: any) => (
              <article
                key={item.id}
                className="rounded-3xl border border-white/10 bg-[#101827] p-6"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Info title="Cache Key" value={item.id} />
                  <Info
                    title="Best Pick"
                    value={item.analysis?.bestPick || "Unknown"}
                  />
                  <Info
                    title="Risk"
                    value={item.analysis?.riskNote || "Unknown"}
                  />
                </div>

                {item.analysis?.summary && (
                  <p className="mt-5 text-sm leading-6 text-white/60">
                    {item.analysis.summary}
                  </p>
                )}
              </article>
            ))
          )}
        </section>
      </main>
    </AdminGate>
  );
}

function Info({ title, value }: { title: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase text-white/40">{title}</p>
      <p className="mt-1 break-words font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}