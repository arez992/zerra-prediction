"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MatchHeader from "@/components/match/MatchHeader";
import PredictionPanel from "@/components/match/PredictionPanel";
import StatsPanel from "@/components/match/StatsPanel";
import TimelinePanel from "@/components/match/TimelinePanel";
import LineupsPanel from "@/components/match/LineupsPanel";
import AIConfidence from "@/components/ai/AIConfidence";
import WinProbability from "@/components/ai/WinProbability";
import GoalPrediction from "@/components/ai/GoalPrediction";
import RiskMeter from "@/components/ai/RiskMeter";
import ValueBet from "@/components/ai/ValueBet";
import MatchVerdict from "@/components/ai/MatchVerdict";
import { calculatePrediction } from "@/lib/ai/prediction";

export default function MatchDetailsPage() {
  const params = useParams();
  const fixtureId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    async function loadMatch() {
      try {
        const res = await fetch(
          `/api/sports/football/match?fixture=${fixtureId}`,
          { cache: "no-store" }
        );

        const data = await res.json();
        setMatch(data);
      } catch (error) {
        console.error("Failed to load match:", error);
      } finally {
        setLoading(false);
      }
    }

    if (fixtureId) loadMatch();
  }, [fixtureId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          Loading match details...
        </div>
      </main>
    );
  }

  if (!match?.fixture) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <Link href="/en/dashboard" className="text-sm font-bold text-[#D4AF37]">
          ← Back to Dashboard
        </Link>

        <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/30 bg-[#0B1220] p-8 text-center shadow-2xl">
          <h1 className="mt-6 text-4xl font-black">Match Data Unavailable</h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Match details are not available right now.
          </p>
        </section>
      </main>
    );
  }

  const prediction = calculatePrediction(match);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white">
      <Link href="/en/dashboard" className="text-sm font-bold text-[#D4AF37]">
        ← Back to Dashboard
      </Link>

      <div className="mt-8">
        <MatchHeader fixture={match.fixture} />
      </div>

      <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/30 bg-[#0B1220] p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
          ZERRA AI Engine
        </p>

        <h2 className="mt-3 text-3xl font-black text-white">
          Premium Match Prediction
        </h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <AIConfidence score={prediction.confidence} />
          <WinProbability
            home={prediction.homeWin}
            draw={prediction.draw}
            away={prediction.awayWin}
          />
          <GoalPrediction
            over25={prediction.over25}
            under25={prediction.under25}
            btts={prediction.btts}
          />
          <RiskMeter risk={prediction.risk} />
          <ValueBet
            pick={prediction.valueBet}
            valueScore={prediction.confidence}
          />
          <MatchVerdict
            confidence={prediction.confidence}
            risk={prediction.risk}
            valueBet={prediction.valueBet}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <PredictionPanel />
        <StatsPanel statistics={match.statistics} />
      </section>

      <div className="mt-8">
        <TimelinePanel events={match.events} />
      </div>

      <div className="mt-8">
        <LineupsPanel lineups={match.lineups} />
      </div>
    </main>
  );
}