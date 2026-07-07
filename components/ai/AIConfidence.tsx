type AIConfidenceProps = {
  score?: number;
};

export default function AIConfidence({ score = 92 }: AIConfidenceProps) {
  const level =
    score >= 85 ? "High Confidence" : score >= 65 ? "Medium Confidence" : "Low Confidence";

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        ZERRA AI Score
      </p>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-5xl font-black text-[#D4AF37]">{score}%</h2>
          <p className="mt-2 text-sm font-bold text-white/60">{level}</p>
        </div>

        <div className="rounded-2xl bg-[#D4AF37]/10 px-4 py-3 text-3xl">
          🧠
        </div>
      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#D4AF37]"
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="mt-5 text-sm leading-6 text-white/60">
        Confidence is calculated from team form, match context, scoring trend,
        defensive strength, home/away performance, and risk signals.
      </p>
    </section>
  );
}