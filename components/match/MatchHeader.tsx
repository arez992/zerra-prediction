type MatchHeaderProps = {
  fixture: any;
};

export default function MatchHeader({ fixture }: MatchHeaderProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-2xl md:p-10">
      <p className="text-center text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        {fixture.league.name}
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-3 md:items-center">
        <TeamBlock
          logo={fixture.teams.home.logo}
          name={fixture.teams.home.name}
        />

        <div className="text-center">
          <div className="rounded-3xl bg-black/40 p-6">
            <p className="text-6xl font-black text-[#D4AF37]">
              {fixture.goals.home ?? "-"} : {fixture.goals.away ?? "-"}
            </p>
            <p className="mt-3 text-white/50">
              {fixture.fixture.status.long}
            </p>
          </div>
        </div>

        <TeamBlock
          logo={fixture.teams.away.logo}
          name={fixture.teams.away.name}
        />
      </div>
    </section>
  );
}

function TeamBlock({ logo, name }: { logo: string; name: string }) {
  return (
    <div className="text-center">
      {logo && (
        <img
          src={logo}
          alt={name}
          className="mx-auto h-24 w-24 rounded-full bg-white object-contain p-2"
        />
      )}
      <h2 className="mt-4 text-2xl font-black text-white">{name}</h2>
    </div>
  );
}