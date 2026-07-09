import Link from "next/link";

async function getActivity() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/activity`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.logs;

    return [];
  } catch {
    return [];
  }
}

export default async function AdminActivityPage() {
  const logs = await getActivity();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Activity Log</h1>

      <p className="mt-4 text-white/60">
        View recent administrator and system activity.
      </p>

      <section className="mt-10 space-y-4">
        {logs.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            No activity recorded.
          </div>
        ) : (
          logs.map((log: any) => (
            <article
              key={log.id}
              className="rounded-3xl border border-white/10 bg-[#101827] p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-black text-[#D4AF37]">
                    {log.message}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/60">
                    <span>
                      <strong>Type:</strong> {log.type}
                    </span>

                    <span>
                      <strong>Actor:</strong> {log.actor}
                    </span>

                    {log.targetId && (
                      <span>
                        <strong>Target:</strong> {log.targetId}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-white/50">
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </div>
              </div>

              {log.metadata &&
                Object.keys(log.metadata).length > 0 && (
                  <pre className="mt-5 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-white/60">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
            </article>
          ))
        )}
      </section>
    </main>
  );
}