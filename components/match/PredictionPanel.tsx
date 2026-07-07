type PredictionPanelProps = {
  confidence?: number;
};

export default function PredictionPanel({
  confidence = 92,
}: PredictionPanelProps) {
  const predictions = [
    { label: "Home Win", value: 54 },
    { label: "Draw", value: 24 },
    { label: "Away Win", value: 22 },
  ];

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
            {confidence}%
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {predictions.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-white">{item.label}</span>
              <span className="font-black text-[#D4AF37]">
                {item.value}%
              </span>
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

      <div className="mt-8 grid grid-cols-2 gap-4">
        <InfoCard title="Best Pick" value="Over 2.5 Goals" />
        <InfoCard title="Risk" value="Low" />
        <InfoCard title="Value Bet" value="Home Win" />
        <InfoCard title="AI Model" value="ZERRA v1" />
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
      <p className="mt-2 font-black text-white">{value}</p>
    </div>
  );
}