"use client";

import { useEffect, useState } from "react";

type AIAnalysisProps = {
  match: any;
  prediction: any;
};

type Analysis = {
  summary: string;
  verdict: string;
  reasons: string[];
  bestPick: string;
  riskNote: string;
};

export default function AIAnalysis({ match, prediction }: AIAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalysis() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/ai/match-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ match, prediction }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "AI analysis failed");
        }

        setAnalysis(data.analysis);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "AI analysis unavailable.");
      } finally {
        setLoading(false);
      }
    }

    loadAnalysis();
  }, [match, prediction]);

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          GPT AI Analysis
        </p>
        <h2 className="mt-3 text-2xl font-black text-white">
          Generating professional match analysis...
        </h2>
        <p className="mt-4 text-white/60">
          ZERRA AI is reviewing prediction signals, risk level, and value-bet
          context.
        </p>
      </section>
    );
  }

  if (error || !analysis) {
    return (
      <section className="rounded-[2rem] border border-red-500/30 bg-[#101827] p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
          AI Analysis Error
        </p>
        <h2 className="mt-3 text-2xl font-black text-white">
          Analysis unavailable
        </h2>
        <p className="mt-4 text-white/60">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        GPT AI Analysis
      </p>

      <h2 className="mt-3 text-2xl font-black text-white">
        Professional Match Verdict
      </h2>

      <p className="mt-5 leading-7 text-white/70">{analysis.summary}</p>

      <div className="mt-6 rounded-3xl bg-black/30 p-5">
        <p className="text-sm text-white/50">Final Verdict</p>
        <p className="mt-2 text-2xl font-black text-[#D4AF37]">
          {analysis.verdict}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {analysis.reasons?.map((reason) => (
          <div
            key={reason}
            className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <span className="text-[#D4AF37]">✓</span>
            <p className="text-sm font-bold text-white/70">{reason}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs text-white/50">Best Pick</p>
          <p className="mt-2 font-black text-[#D4AF37]">{analysis.bestPick}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs text-white/50">Risk Note</p>
          <p className="mt-2 font-black text-white">{analysis.riskNote}</p>
        </div>
      </div>
    </section>
  );
}