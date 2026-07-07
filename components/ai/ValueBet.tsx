type ValueBetProps = {
  pick?: string;
  valueScore?: number;
};

export default function ValueBet({
  pick = "Over 2.5 Goals",
  valueScore = 84,
}: ValueBetProps) {
  const rating =
    valueScore >= 80 ? "Strong Value" : valueScore >= 60 ? "Fair Value" : "Low Value";

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Value Bet
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Best Market Opportunity
      </h2>

      <div className="mt-8 rounded-3xl border border-[#D4AF37]/20 bg-black/30 p-6">
        <p className="text-sm text-white/50">AI Selected Pick</p>
        <p className="mt-2 text-3xl font-black text-[#D4AF37]">{pick}</p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-bold text-white/60">Value Score</span>
        <span className="text-3xl font-black text-[#D4AF37]">
          {valueScore}%
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#D4AF37]"
          style={{ width: `${valueScore}%` }}
        />
      </div>

      <p className="mt-5 rounded-2xl bg-[#D4AF37]/10 px-4 py-3 text-center font-black text-[#D4AF37]">
        {rating}
      </p>
    </section>
  );
}