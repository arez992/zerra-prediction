import Link from "next/link";

type FixtureCardProps = {
  match: any;
};

function getStatusStyle(short: string) {
  if (["1H", "2H", "HT", "ET", "P"].includes(short)) {
    return "bg-red-500/20 text-red-400";
  }

  if (["FT", "AET", "PEN"].includes(short)) {
    return "bg-white/10 text-white/60";
  }

  return "bg-green-500/20 text-green-400";
}

export default function FixtureCard({ match }: FixtureCardProps) {
  const homePercent = 54;
  const drawPercent = 24;
  const awayPercent = 22;

  return (
    <Link
      href={`/en/match/${match.fixture.id}`}
      className="block rounded-[2rem] border border-white/10 bg-[#101827]/90 p-5 shadow-xl transition hover:border-[#D4AF37]/60 hover:bg-[#141f33] md:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {match.league.logo && (
            <img
              src={match.league.logo}
              alt={match.league.name}
              className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-1"
            />
          )}

          <div className="min-w-0">
            <p className="truncate font-black text-[#D4AF37]">
              {match.league.name}
            </p>
            <p className="truncate text-xs text-white/45">
              {match.league.country} • {match.fixture.status.long}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-4 py-1 text-xs font-black ${getStatusStyle(
            match.fixture.status.short
          )}`}
        >
          {match.fixture.status.short}
        </span>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3 md:items-center">
        <div className="flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
          {match.teams.home.logo && (
            <img
              src={match.teams.home.logo}
              alt={match.teams.home.name}
              className="h-14 w-14 shrink-0 rounded-full bg-white object-contain p-1"
            />
          )}
          <p className="max-w-[160px] text-xl font-black leading-tight text-white md:max-w-none">
            {match.teams.home.name}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[180px] rounded-3xl bg-black/40 px-4 py-5 text-center">
          <p className="text-5xl font-black leading-none text-[#D4AF37]">
            {match.goals.home ?? "-"}
          </p>
          <p className="text-3xl font-black leading-none text-[#D4AF37]">:</p>
          <p className="text-5xl font-black leading-none text-[#D4AF37]">
            {match.goals.away ?? "-"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:flex-row md:justify-end md:text-right">
          <p className="max-w-[160px] text-xl font-black leading-tight text-white md:max-w-none">
            {match.teams.away.name}
          </p>
          {match.teams.away.logo && (
            <img
              src={match.teams.away.logo}
              alt={match.teams.away.name}
              className="h-14 w-14 shrink-0 rounded-full bg-white object-contain p-1"
            />
          )}
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-black text-white">🤖 AI Prediction Signal</p>
          <p className="font-black text-[#D4AF37]">92%</p>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <PredictionBar label="Home Win" value={homePercent} />
          <PredictionBar label="Draw" value={drawPercent} />
          <PredictionBar label="Away Win" value={awayPercent} />
        </div>
      </div>
    </Link>
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