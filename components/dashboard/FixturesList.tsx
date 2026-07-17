import FixtureCard from "./FixtureCard";

import type {
  PredictionResult,
} from "@/lib/ai/prediction";

type FixturesListProps = {
  fixtures: any[];
  isVip: boolean;
  predictions: Record<
    number,
    PredictionResult | null
  >;
  loadingPredictionIds: Set<number>;
  predictionErrorIds: Set<number>;
};

export default function FixturesList({
  fixtures,
  isVip,
  predictions,
  loadingPredictionIds,
  predictionErrorIds,
}: FixturesListProps) {
  if (!fixtures.length) {
    return (
      <section className="rounded-3xl border border-[#D4AF37]/30 bg-[#0B1220] p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37]/10 text-3xl">
          ⚠️
        </div>

        <h3 className="mt-5 text-2xl font-black text-white">
          No fixtures available right now
        </h3>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/60">
          We could not load football fixtures at the moment. This can happen if
          there are no matches for the selected date, the API daily limit has
          been reached, or the provider is temporarily unavailable.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-left text-sm text-white/60">
          <p>Try these:</p>

          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Clear search text</li>
            <li>Select “All Leagues”</li>
            <li>Select “All Matches”</li>
            <li>Refresh again later after API quota resets</li>
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      {fixtures.map((match) => {
        const fixtureId =
          Number(match.fixture.id);

        return (
          <FixtureCard
            key={fixtureId}
            match={match}
            isVip={isVip}
            prediction={
              predictions[fixtureId]
            }
            predictionLoading={loadingPredictionIds.has(
              fixtureId
            )}
            predictionError={predictionErrorIds.has(
              fixtureId
            )}
          />
        );
      })}
    </section>
  );
}