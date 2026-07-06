import FixtureCard from "./FixtureCard";

type FixturesListProps = {
  fixtures: any[];
};

export default function FixturesList({ fixtures }: FixturesListProps) {
  if (!fixtures.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
        No football fixtures found today.
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      {fixtures.map((match) => (
        <FixtureCard key={match.fixture.id} match={match} />
      ))}
    </section>
  );
}