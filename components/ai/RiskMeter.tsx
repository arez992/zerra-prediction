type RiskMeterProps = {
  risk?: "Low" | "Medium" | "High";
};

export default function RiskMeter({ risk = "Low" }: RiskMeterProps) {
  const riskScore = risk === "Low" ? 28 : risk === "Medium" ? 58 : 86;

  const color =
    risk === "Low"
      ? "text-green-400"
      : risk === "Medium"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Risk Meter
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Match Risk Level
      </h2>

      <div className="mt-8 rounded-3xl bg-black/30 p-6 text-center">
        <p className={`text-5xl font-black ${color}`}>{risk}</p>
        <p className="mt-2 text-sm text-white/50">AI Risk Assessment</p>
      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#D4AF37]"
          style={{ width: `${riskScore}%` }}
        />
      </div>
    </section>
  );
}