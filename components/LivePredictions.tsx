const liveMatches = [
  {
    sport: "Football",
    league: "La Liga",
    match: "Barcelona vs Atletico Madrid",
    minute: "67'",
    score: "2 - 1",
    pick: "Over 2.5 Goals",
    confidence: 91,
  },
  {
    sport: "Basketball",
    league: "EuroLeague",
    match: "Real Madrid vs Fenerbahce",
    minute: "Q3",
    score: "64 - 59",
    pick: "Real Madrid Win",
    confidence: 86,
  },
  {
    sport: "Tennis",
    league: "WTA",
    match: "Swiatek vs Gauff",
    minute: "Set 2",
    score: "6-4, 3-2",
    pick: "Swiatek Win",
    confidence: 89,
  },
];

export default function LivePredictions() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold text-[#D4AF37]">Live AI Signals</p>
          <h2 className="text-3xl font-black text-white">Live Predictions</h2>
        </div>
        <span className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
          LIVE
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {liveMatches.map((item) => (
          <div
            key={item.match}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition hover:border-[#D4AF37]/50"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                {item.sport}
              </span>
              <span className="text-xs text-white/50">{item.league}</span>
            </div>

            <h3 className="text-xl font-black text-white">{item.match}</h3>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-black/30 p-4">
              <div>
                <p className="text-xs text-white/50">Time</p>
                <p className="font-bold text-white">{item.minute}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">Score</p>
                <p className="font-black text-[#D4AF37]">{item.score}</p>
              </div>
            </div>

            <p className="mt-5 text-sm text-white/50">AI Live Pick</p>
            <p className="text-lg font-bold text-[#D4AF37]">{item.pick}</p>

            <div className="mt-5 rounded-2xl bg-black/30 p-4">
              <p className="text-sm text-white/50">Live Confidence</p>
              <p className="text-3xl font-black text-white">{item.confidence}%</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}