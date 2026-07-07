type GoalPredictionProps = {
  over25?: number;
  under25?: number;
  btts?: number;
};

export default function GoalPrediction({
  over25 = 72,
  under25 = 28,
  btts = 66,
}: GoalPredictionProps) {
  const items = [
    { label: "Over 2.5 Goals", value: over25, icon: "⚽" },
    { label: "Under 2.5 Goals", value: under25, icon: "🛡️" },
    { label: "BTTS Yes", value: btts, icon: "🎯" },
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Goal Prediction
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Goals Market Forecast
      </h2>

      <div className="mt-8 grid gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-black text-white">{item.label}</span>
              </div>

              <span className="text-2xl font-black text-[#D4AF37]">
                {item.value}%
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
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