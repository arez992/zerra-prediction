import type { CEORecommendation } from "@/lib/ai-ceo/client";
import CEORecommendationCard from "./CEORecommendationCard";

type Props = {
  recommendations: CEORecommendation[];
  loading: boolean;
  activeActionId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onExecute: (id: string) => void;
};

export default function CEORecommendationList({
  recommendations,
  loading,
  activeActionId,
  onApprove,
  onReject,
  onExecute,
}: Props) {
  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/50">
        Loading AI CEO recommendations...
      </section>
    );
  }

  if (recommendations.length === 0) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center">
        <div className="text-5xl">🧠</div>

        <h2 className="mt-5 text-2xl font-black">
          No Recommendations Yet
        </h2>

        <p className="mt-3 text-white/50">
          Click Generate Recommendations to analyze the latest business data.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {recommendations.map((recommendation) => (
        <CEORecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          busy={activeActionId === recommendation.id}
          onApprove={onApprove}
          onReject={onReject}
          onExecute={onExecute}
        />
      ))}
    </section>
  );
}