type FixtureCardProps = {
  match: any;
};

function getStatusStyle(short: string) {
  if (["1H", "2H", "HT", "ET", "P"].includes(short)) {
    return "bg-red-500/20 text-red-400";
  }

  if (short === "FT" || short === "AET" || short === "PEN") {
    return "bg-white/10 text-white/60";
  }

  return "bg-green-500/20 text-green-400";
}

export default function FixtureCard({ match }: FixtureCardProps) {
  const homePercent = 54;
  const drawPercent = 24;
  const awayPercent = 22;

  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#101827]/90 p-6 shadow-xl transition hover:border-[#D4AF37]/60 hover:bg-[#141f33]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {match.league.logo && (
            <img
              src={match.league.logo}
              alt={match.league.name}
              className="h-9 w-9 rounded-full bg-white object-contain p-1"
            />
          )}

          <div>
            <p className="font-black text-[#D4AF37]">{match.league.name}</p>
            <p className="text-xs text-white/45">
              {match.league.country} • {match.fixture.status.long}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-4 py-1 text-xs font-black ${getStatusStyle(
            match.fixture.status.short
          )}`}
        >
          {match.fixture.status.short}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-3 items-center gap-4">
        <div className="flex items-center gap-3">
          {match.teams.home.logo && (
            <img
              src={match.teams.home.logo}
              alt={match.teams.home.name}
              className="h-12 w-12 rounded-full bg-white object-contain p-1"
            />
          )}
          <p className="text-lg font-black text-white">{match.teams.home.name}</p>
        </div>

        <div className="rounded-2xl bg-black/40 px-4 py-4 text-center">
          <p className="text-4xl font-black text-[#D4AF37]">
            {match.goals.home ?? "-"} : {match.goals.away ?? "-"}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 text-right">
          <p className="text-lg font-black text-white">{match.teams.away.name}</p>
          {match.teams.away.logo && (
            <img
              src={match.teams.away.logo}
              alt={match.teams.away.name}
              className="h-12 w-12 rounded-full bg-white object-contain p-1"
            />
          )}
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <p className="font-black text-white">🤖 AI Prediction Signal</p>
          <p className="font-black text-[#D4AF37]">92%</p>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <PredictionBar label="Home Win" value={homePercent} />
          <PredictionBar label="Draw" value={drawPercent} />
          <PredictionBar label="Away Win" value={awayPercent} />
        </div>
      </div>
    </article>
  );
}

function PredictionBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-white/60">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-[#D4AF37]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}