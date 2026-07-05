const sports = [
  "Football",
  "Basketball",
  "Tennis",
  "MMA",
  "Boxing",
  "Esports",
  "Hockey",
  "Volleyball",
];

export default function PopularSports() {
  return (
    <section className="mt-16">
      <h2 className="text-3xl font-bold mb-8 text-white">
        Popular Sports
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sports.map((sport) => (
          <div
            key={sport}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-yellow-500 transition cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-white">
              {sport}
            </h3>
          </div>
        ))}
      </div>
    </section>
  );
}