export default function AIAccuracyCard() {
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
              Track how ZERRA AI predictions perform over time using saved
              prediction history, confidence scores, and final match results.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stat title="Overall Accuracy" value="83%" />
            <Stat title="Over/Under" value="81%" />
            <Stat title="BTTS" value="78%" />
            <Stat title="VIP Picks" value="86%" />
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