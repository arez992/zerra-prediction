type PredictionPanelProps = {
  confidence: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  under25: number;
  risk: string;
  valueBet: string;
};

export default function PredictionPanel({
  confidence,
  homeWin,
  draw,
  awayWin,
  over25,
  under25,
  risk,
  valueBet,
}: PredictionPanelProps) {
  const predictions = [
    { label: "Home Win", value: homeWin },
    { label: "Draw", value: draw },
    { label: "Away Win", value: awayWin },
  ];

  const resultOptions = [
    { label: "Home Win", value: homeWin },
    { label: "Draw", value: draw },
    { label: "Away Win", value: awayWin },
  ];

  const strongestResult = resultOptions.reduce((best, current) =>
    current.value > best.value ? current : best
  );

  const bestPick =
    Math.max(over25, under25) > strongestResult.value
      ? over25 >= under25
        ? "Over 2.5 Goals"
        : "Under 2.5 Goals"
      : strongestResult.label;

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#101827] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            AI Prediction
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Match Prediction
          </h2>
        </div>

        <div className="rounded-2xl bg-[#D4AF37]/10 px-5 py-3 text-center">
          <p className="text-xs text-white/60">Confidence</p>

          <p className="text-3xl font-black text-[#D4AF37]">
            {Math.round(confidence)}%
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {predictions.map((item) => {
          const value = Math.max(0, Math.min(100, Math.round(item.value)));

          return (
            <div key={item.label}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-white">{item.label}</span>

                <span className="font-black text-[#D4AF37]">
                  {value}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#D4AF37]"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <InfoCard title="Best Pick" value={bestPick} />
        <InfoCard title="Risk" value={risk} />
        <InfoCard title="Value Bet" value={valueBet} />
        <InfoCard title="AI Model" value="ZERRA v4.2" />
      </div>
    </section>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs text-white/50">{title}</p>
      <p className="mt-2 font-black text-white">{value || "N/A"}</p>
    </div>
  );
}