type MatchVerdictProps = {
  confidence?: number;
  risk?: "Low" | "Medium" | "High";
  valueBet?: string;
};

export default function MatchVerdict({
  confidence = 92,
  risk = "Low",
  valueBet = "Over 2.5 Goals",
}: MatchVerdictProps) {
  const reasons = [
    "Home advantage included in the model",
    "Team strength and form signals analyzed",
    "Goals market probability checked",
    `Risk level detected as ${risk}`,
    `Best value opportunity: ${valueBet}`,
  ];

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        AI Verdict
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Why this prediction?
      </h2>

      <div className="mt-6 rounded-3xl bg-black/30 p-5">
        <p className="text-sm text-white/50">Final AI Confidence</p>
        <p className="mt-2 text-4xl font-black text-[#D4AF37]">
          {confidence}%
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {reasons.map((reason) => (
          <div
            key={reason}
            className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <span className="text-[#D4AF37]">✓</span>
            <p className="text-sm font-bold text-white/70">{reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}