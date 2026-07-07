type LineupsPanelProps = {
  lineups?: any[];
};

export default function LineupsPanel({
  lineups = [],
}: LineupsPanelProps) {
  const hasData = lineups.length > 0;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Starting XI
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Team Lineups
          </h2>
        </div>

        <span className="rounded-full bg-[#D4AF37]/10 px-4 py-2 text-xs font-black text-[#D4AF37]">
          {hasData ? "LIVE" : "Waiting API"}
        </span>
      </div>

      {!hasData ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/10 p-10 text-center">
          <div className="text-6xl">👥</div>

          <h3 className="mt-4 text-2xl font-black text-white">
            Lineups will appear here
          </h3>

          <p className="mt-3 text-white/60">
            As soon as API data becomes available, the official starting XI,
            substitutes, formations, coaches and bench players will be shown
            here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {lineups.map((team: any) => (
            <div
              key={team.team.id}
              className="rounded-3xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex items-center gap-3">
                <img
                  src={team.team.logo}
                  alt={team.team.name}
                  className="h-10 w-10 rounded-full bg-white p-1"
                />

                <div>
                  <h3 className="font-black text-white">
                    {team.team.name}
                  </h3>

                  <p className="text-sm text-white/50">
                    Formation {team.formation}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {team.startXI?.map((player: any) => (
                  <div
                    key={player.player.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                  >
                    <span className="text-white">
                      {player.player.name}
                    </span>

                    <span className="font-black text-[#D4AF37]">
                      #{player.player.number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}