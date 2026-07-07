type LivePredictionsProps = {
  fixtures?: any[];
};

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "P"];

export default function LivePredictions({ fixtures = [] }: LivePredictionsProps) {
  const liveMatches = fixtures
    .filter((match) => LIVE_STATUSES.includes(match?.fixture?.status?.short))
    .slice(0, 3);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold text-[#D4AF37]">Live AI Signals</p>
          <h2 className="text-3xl font-black text-white">
            Live Football Predictions
          </h2>
        </div>

        <span className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
          LIVE
        </span>
      </div>

      {liveMatches.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center text-white/60">
          No live football matches right now.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {liveMatches.map((item) => (
            <div
              key={item.fixture.id}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition hover:border-[#D4AF37]/50"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                  Football
                </span>
                <span className="text-xs text-white/50">
                  {item.league.name}
                </span>
              </div>

              <h3 className="text-xl font-black text-white">
                {item.teams.home.name} vs {item.teams.away.name}
              </h3>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-black/30 p-4">
                <div>
                  <p className="text-xs text-white/50">Time</p>
                  <p className="font-bold text-white">
                    {item.fixture.status.elapsed ?? 0}&apos;
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-white/50">Score</p>
                  <p className="font-black text-[#D4AF37]">
                    {item.goals.home ?? "-"} - {item.goals.away ?? "-"}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-white/50">AI Live Pick</p>
              <p className="text-lg font-bold text-[#D4AF37]">
                Live Analysis Available
              </p>

              <div className="mt-5 rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-white/50">Live Confidence</p>
                <p className="text-3xl font-black text-white">AI</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}