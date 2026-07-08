import Link from "next/link";
import AdminGate from "@/components/admin/AdminGate";

async function getPredictions() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/predictions`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.predictions;

    return [];
  } catch {
    return [];
  }
}

export default async function AdminPredictionsPage() {
  const predictions = await getPredictions();

  return (
    <AdminGate>
      <main className="mx-auto max-w-7xl px-5 py-12 text-white">
        <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
          ← Back to Admin
        </Link>

        <h1 className="mt-6 text-5xl font-black">Prediction History</h1>

        <p className="mt-4 text-white/60">
          View saved AI predictions, result checks, and model performance data.
        </p>

        <section className="mt-10 grid gap-4">
          {predictions.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              No prediction history found.
            </div>
          ) : (
            predictions.map((item: any) => (
              <article
                key={item.id}
                className="rounded-3xl border border-white/10 bg-[#101827] p-6"
              >
                <div className="grid gap-4 md:grid-cols-5">
                  <Info
                    title="Fixture"
                    value={item.fixtureId || item.id || "Unknown"}
                  />
                  <Info
                    title="Pick"
                    value={item.prediction?.valueBet || "Unknown"}
                  />
                  <Info
                    title="Confidence"
                    value={`${item.prediction?.confidence ?? 0}%`}
                  />
                  <Info
                    title="Checked"
                    value={item.resultChecked ? "Yes" : "No"}
                  />
                  <Info
                    title="Correct"
                    value={
                      item.correct === true
                        ? "Correct"
                        : item.correct === false
                        ? "Wrong"
                        : "Pending"
                    }
                  />
                </div>

                {item.finalResult && (
                  <p className="mt-4 text-sm font-bold text-white/50">
                    Final Result:{" "}
                    <span className="text-[#D4AF37]">{item.finalResult}</span>
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