type LineupsPanelProps = {
  lineups?: any[];
};

type LineupPlayer = {
  player?: {
    id?: number;
    name?: string;
    number?: number | null;
    pos?: string;
    position?: string;
  };
};

type LineupTeam = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  formation?: string;
  startXI?: LineupPlayer[];
  substitutes?: LineupPlayer[];
};

export default function LineupsPanel({
  lineups = [],
}: LineupsPanelProps) {
  const validLineups: LineupTeam[] =
    Array.isArray(lineups)
      ? lineups.filter(
          (
            item
          ): item is LineupTeam =>
            Boolean(
              item &&
                typeof item ===
                  "object"
            )
        )
      : [];

  const hasData =
    validLineups.length > 0;

  return (
    <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
            Starting XI
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#102117]">
            Team Lineups
          </h2>

          <p className="mt-2 text-sm text-[#758179]">
            Official lineup information from the football data provider.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide ${
            hasData
              ? "bg-[#eaf7ef] text-[#0d7a40]"
              : "bg-[#f4f7f5] text-[#7a877e]"
          }`}
        >
          {hasData
            ? "Available"
            : "Waiting for Data"}
        </span>
      </div>

      {!hasData ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#cfdcd2] bg-[#fbfdfb] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf7ef] text-xl font-black text-[#139653]">
            XI
          </div>

          <h3 className="mt-4 text-xl font-black text-[#102117]">
            Lineups not available yet
          </h3>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#758179]">
            Official starting elevens, formations, coaches and bench players
            will appear here when they become available.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {validLineups.map(
            (
              lineupTeam,
              teamIndex
            ) => {
              const teamInfo =
                lineupTeam.team ||
                {};

              const startXI: LineupPlayer[] =
                Array.isArray(
                  lineupTeam.startXI
                )
                  ? lineupTeam.startXI
                  : [];

              const substitutes: LineupPlayer[] =
                Array.isArray(
                  lineupTeam.substitutes
                )
                  ? lineupTeam.substitutes
                  : [];

              const formation =
                typeof lineupTeam.formation ===
                  "string" &&
                lineupTeam.formation.trim()
                  ? lineupTeam.formation
                  : "Unavailable";

              const teamName =
                teamInfo.name ||
                `Team ${teamIndex + 1}`;

              return (
                <article
                  key={
                    teamInfo.id ||
                    `${teamName}-${teamIndex}`
                  }
                  className="overflow-hidden rounded-2xl border border-[#dce8df] bg-[#fbfdfb]"
                >
                  <div className="border-b border-[#e7eee9] bg-white p-5">
                    <div className="flex items-center gap-4">
                      <TeamLogo
                        logo={
                          teamInfo.logo
                        }
                        name={
                          teamName
                        }
                      />

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-[#102117]">
                          {teamName}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-[#758179]">
                          Formation{" "}
                          <span className="text-[#139653]">
                            {formation}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#839087]">
                      Starting XI
                    </p>

                    {startXI.length ===
                    0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-[#d7e2da] bg-white p-6 text-center">
                        <p className="text-sm font-bold text-[#758179]">
                          Starting XI data unavailable.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2">
                        {startXI.map(
                          (
                            player: LineupPlayer,
                            playerIndex: number
                          ) => (
                            <PlayerRow
                              key={
                                player
                                  ?.player
                                  ?.id ||
                                `${teamName}-starter-${playerIndex}`
                              }
                              player={
                                player.player
                              }
                            />
                          )
                        )}
                      </div>
                    )}

                    {substitutes.length >
                      0 && (
                      <div className="mt-7 border-t border-[#e2ebe5] pt-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#839087]">
                          Substitutes
                        </p>

                        <div className="mt-4 grid gap-2">
                          {substitutes.map(
                            (
                              player: LineupPlayer,
                              playerIndex: number
                            ) => (
                              <PlayerRow
                                key={
                                  player
                                    ?.player
                                    ?.id ||
                                  `${teamName}-sub-${playerIndex}`
                                }
                                player={
                                  player.player
                                }
                                substitute
                              />
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

function TeamLogo({
  logo,
  name,
}: {
  logo?: string;
  name: string;
}) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#dce8df] bg-[#f7faf8] p-1.5">
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-sm font-black text-[#139653]">
          {name
            .slice(
              0,
              1
            )
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  substitute = false,
}: {
  player?: {
    id?: number;
    name?: string;
    number?: number | null;
    pos?: string;
    position?: string;
  };
  substitute?: boolean;
}) {
  const name =
    player?.name ||
    "Player";

  const number =
    player?.number;

  const position =
    player?.pos ||
    player?.position;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e4ece6] bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#102117]">
          {name}
        </p>

        {position && (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#8a978e]">
            {position}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {substitute && (
          <span className="rounded-full bg-[#f3f7f4] px-2.5 py-1 text-[9px] font-black uppercase text-[#7a877e]">
            SUB
          </span>
        )}

        {number !==
          null &&
          number !==
            undefined && (
          <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#eaf7ef] px-2 text-xs font-black text-[#139653]">
            #{number}
          </span>
        )}
      </div>
    </div>
  );
}