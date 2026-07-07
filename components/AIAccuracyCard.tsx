async function getAccuracy() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/ai/accuracy`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data;

    return null;
  } catch {
    return null;
  }
}

export default async function AIAccuracyCard() {
  const accuracy = await getAccuracy();

  const overall = accuracy?.overallAccuracy ?? 0;
  const over25 = accuracy?.over25Accuracy ?? 0;
  const btts = accuracy?.bttsAccuracy ?? 0;
  const homeWin = accuracy?.homeWinAccuracy ?? 0;
  const total = accuracy?.totalPredictions ?? 0;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#0B1220] p-8 shadow-2xl md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
          ZERRA AI Performance
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-black text-white">
              AI Accuracy Dashboard
            </h2>

            <p className="mt-4 max-w-2xl text-white/60">
              Real performance data calculated from saved prediction history and
              final match results.
            </p>

            <p className="mt-4 text-sm font-bold text-white/40">
              Total tracked predictions: {total}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stat title="Overall Accuracy" value={`${overall}%`} />
            <Stat title="Over/Under" value={`${over25}%`} />
            <Stat title="BTTS" value={`${btts}%`} />
            <Stat title="Home Win" value={`${homeWin}%`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-center">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-2 text-4xl font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}