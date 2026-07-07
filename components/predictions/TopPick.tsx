type TopPickProps = {
  pick: {
    league: string;
    match: string;
    time: string;
    prediction: string;
    confidence: number;
    risk: string;
    access: string;
  };
};

export default function TopPick({ pick }: TopPickProps) {
  return (
    <section className="mt-12 overflow-hidden rounded-[2rem] border border-[#D4AF37]/40 bg-[#0B1220] p-6 shadow-2xl md:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-black">
            🏆 Best Pick Today
          </div>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-[#D4AF37]">
            {pick.league} • {pick.time}
          </p>

          <h2 className="mt-3 text-4xl font-black text-white md:text-5xl">
            {pick.match}
          </h2>

          <p className="mt-4 text-2xl font-black text-[#D4AF37]">
            🤖 {pick.prediction}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[420px]">
          <Stat title="Confidence" value={`${pick.confidence}%`} />
          <Stat title="Risk" value={pick.risk} />
          <Stat title="Access" value={pick.access} />
        </div>
      </div>
    </section>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-center">
      <p className="text-xs uppercase text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}