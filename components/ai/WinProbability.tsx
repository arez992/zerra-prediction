type WinProbabilityProps = {
  home?: number;
  draw?: number;
  away?: number;
};

export default function WinProbability({
  home = 54,
  draw = 24,
  away = 22,
}: WinProbabilityProps) {
  const items = [
    { label: "Home Win", value: home },
    { label: "Draw", value: draw },
    { label: "Away Win", value: away },
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Win Probability
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Match Outcome Forecast
      </h2>

      <div className="mt-8 space-y-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-bold text-white">{item.label}</span>
              <span className="font-black text-[#D4AF37]">{item.value}%</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#D4AF37]"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}