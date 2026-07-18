type ValueBetProps = {
  pick?: string;
  valueScore?: number;
};

function clampPercent(
  value: number
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

export default function ValueBet({
  pick = "No Pick",
  valueScore = 0,
}: ValueBetProps) {
  const score =
    clampPercent(
      valueScore
    );

  const rating =
    score >= 80
      ? "Strong Model Signal"
      : score >= 60
        ? "Moderate Model Signal"
        : "Low Model Signal";

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Model Pick
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        AI Selected Opportunity
      </h2>

      <div className="mt-8 rounded-3xl border border-[#D4AF37]/20 bg-black/30 p-6">
        <p className="text-sm text-white/50">
          AI Selected Pick
        </p>

        <p className="mt-2 text-3xl font-black text-[#D4AF37]">
          {pick || "No Pick"}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-bold text-white/60">
          Model Confidence
        </span>

        <span className="text-3xl font-black text-[#D4AF37]">
          {score}%
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#D4AF37]"
          style={{
            width: `${score}%`,
          }}
        />
      </div>

      <p className="mt-5 rounded-2xl bg-[#D4AF37]/10 px-4 py-3 text-center font-black text-[#D4AF37]">
        {rating}
      </p>
    </section>
  );
}