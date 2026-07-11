import type { CEORecommendation } from "@/lib/ai-ceo/client";
import CEORecommendationCard from "./CEORecommendationCard";

export default function CEORecommendationList({
  recommendations,
  loading,
}: {
  recommendations: CEORecommendation[];
  loading: boolean;
}) {
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
          Click Generate Recommendations to let the AI CEO
          analyze the latest business data.
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
        />
      ))}
    </section>
  );
}