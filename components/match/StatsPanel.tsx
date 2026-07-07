type StatsPanelProps = {
  statistics?: any[];
};

export default function StatsPanel({ statistics = [] }: StatsPanelProps) {
  const stats = [
    { label: "Possession", home: "58%", away: "42%" },
    { label: "Shots", home: "14", away: "9" },
    { label: "Shots on Target", home: "6", away: "3" },
    { label: "Corners", home: "7", away: "4" },
    { label: "Yellow Cards", home: "2", away: "3" },
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Match Statistics
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Live Match Stats
      </h2>

      <div className="mt-8 space-y-5">
        {stats.map((item) => (
          <div key={item.label}>
            <div className="mb-2 grid grid-cols-3 text-sm">
              <span className="font-black text-white">{item.home}</span>
              <span className="text-center text-white/60">{item.label}</span>
              <span className="text-right font-black text-white">
                {item.away}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="h-2 rounded-full bg-[#D4AF37]" />
              <div className="h-2 rounded-full bg-white/20" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}