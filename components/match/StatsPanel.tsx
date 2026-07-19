type StatsPanelProps = {
  statistics?: any[];
};

type StatEntry = {
  type?: string;
  value?: unknown;
};

type TeamStatistics = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };

  statistics?: StatEntry[];
};

type DisplayStat = {
  label: string;
  keys: string[];
};

const DISPLAY_STATS: DisplayStat[] = [
  {
    label: "Ball Possession",
    keys: [
      "Ball Possession",
      "Possession",
    ],
  },
  {
    label: "Total Shots",
    keys: [
      "Total Shots",
      "Shots",
    ],
  },
  {
    label: "Shots on Goal",
    keys: [
      "Shots on Goal",
      "Shots on Target",
    ],
  },
  {
    label: "Corner Kicks",
    keys: [
      "Corner Kicks",
      "Corners",
    ],
  },
  {
    label: "Fouls",
    keys: [
      "Fouls",
    ],
  },
  {
    label: "Yellow Cards",
    keys: [
      "Yellow Cards",
    ],
  },
  {
    label: "Red Cards",
    keys: [
      "Red Cards",
    ],
  },
  {
    label: "Offsides",
    keys: [
      "Offsides",
    ],
  },
  {
    label: "Goalkeeper Saves",
    keys: [
      "Goalkeeper Saves",
    ],
  },
  {
    label: "Total Passes",
    keys: [
      "Total passes",
      "Total Passes",
    ],
  },
  {
    label: "Pass Accuracy",
    keys: [
      "Passes %",
      "Pass Accuracy",
    ],
  },
];

function normalizeStatistics(
  statistics: unknown
): TeamStatistics[] {
  if (
    !Array.isArray(
      statistics
    )
  ) {
    return [];
  }

  return statistics.filter(
    (
      item
    ): item is TeamStatistics =>
      Boolean(
        item &&
          typeof item ===
            "object"
      )
  );
}

function findStatValue(
  team:
    TeamStatistics | undefined,
  keys: string[]
): unknown {
  const stats =
    Array.isArray(
      team?.statistics
    )
      ? team?.statistics
      : [];

  const entry =
    stats.find(
      (
        stat
      ) => {
        const type =
          String(
            stat?.type ||
              ""
          ).toLowerCase();

        return keys.some(
          (
            key
          ) =>
            type ===
            key.toLowerCase()
        );
      }
    );

  return entry?.value ??
    null;
}

function formatStatValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(
    value
  );
}

function numericValue(
  value: unknown
): number {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  ) {
    return Math.max(
      0,
      value
    );
  }

  if (
    typeof value ===
      "string"
  ) {
    const parsed =
      Number(
        value.replace(
          "%",
          ""
        )
      );

    if (
      Number.isFinite(
        parsed
      )
    ) {
      return Math.max(
        0,
        parsed
      );
    }
  }

  return 0;
}

function getBarWidths(
  homeValue: unknown,
  awayValue: unknown
) {
  const home =
    numericValue(
      homeValue
    );

  const away =
    numericValue(
      awayValue
    );

  const total =
    home + away;

  if (
    total <= 0
  ) {
    return {
      home: 0,
      away: 0,
    };
  }

  return {
    home:
      (home /
        total) *
      100,

    away:
      (away /
        total) *
      100,
  };
}

export default function StatsPanel({
  statistics = [],
}: StatsPanelProps) {
  const teams =
    normalizeStatistics(
      statistics
    );

  const home =
    teams[0];

  const away =
    teams[1];

  const hasData =
    Boolean(
      home &&
        away
    );

  if (
    !hasData
  ) {
    return (
      <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
          Match Statistics
        </p>

        <h2 className="mt-2 text-2xl font-black text-[#102117]">
          Match Stats
        </h2>

        <div className="mt-8 rounded-2xl border border-dashed border-[#cfdcd2] bg-[#fbfdfb] p-10 text-center">
          <p className="font-black text-[#102117]">
            Statistics not
            available yet
          </p>

          <p className="mt-2 text-sm leading-6 text-[#758179]">
            Real match
            statistics will
            appear here when
            they become
            available from the
            football data
            provider.
          </p>
        </div>
      </section>
    );
  }

  const visibleStats =
    DISPLAY_STATS.map(
      (
        stat
      ) => {
        const homeValue =
          findStatValue(
            home,
            stat.keys
          );

        const awayValue =
          findStatValue(
            away,
            stat.keys
          );

        return {
          label:
            stat.label,

          homeValue,

          awayValue,
        };
      }
    ).filter(
      (
        stat
      ) =>
        stat.homeValue !==
          null ||
        stat.awayValue !==
          null
    );

  return (
    <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
            Match Statistics
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#102117]">
            Key Match Stats
          </h2>
        </div>

        <div className="flex items-center gap-5">
          <TeamBadge
            team={
              home?.team
            }
          />

          <span className="text-xs font-black text-[#9aa49d]">
            VS
          </span>

          <TeamBadge
            team={
              away?.team
            }
          />
        </div>
      </div>

      {visibleStats.length ===
      0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#cfdcd2] bg-[#fbfdfb] p-10 text-center">
          <p className="font-black text-[#102117]">
            No detailed
            statistics yet
          </p>

          <p className="mt-2 text-sm text-[#758179]">
            The match exists,
            but detailed
            statistics are not
            available yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 divide-y divide-[#edf2ee]">
          {visibleStats.map(
            (
              stat
            ) => {
              const widths =
                getBarWidths(
                  stat.homeValue,
                  stat.awayValue
                );

              return (
                <div
                  key={
                    stat.label
                  }
                  className="py-5 first:pt-0 last:pb-0"
                >
                  <div className="grid grid-cols-[80px_minmax(0,1fr)_80px] items-center gap-4">
                    <p className="text-left text-sm font-black text-[#102117]">
                      {formatStatValue(
                        stat.homeValue
                      )}
                    </p>

                    <p className="text-center text-xs font-bold text-[#758179]">
                      {
                        stat.label
                      }
                    </p>

                    <p className="text-right text-sm font-black text-[#102117]">
                      {formatStatValue(
                        stat.awayValue
                      )}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="flex h-2 justify-end overflow-hidden rounded-full bg-[#e8efea]">
                      <div
                        className="h-full rounded-full bg-[#139653]"
                        style={{
                          width:
                            `${widths.home}%`,
                        }}
                      />
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-[#e8efea]">
                      <div
                        className="h-full rounded-full bg-[#7bcf9c]"
                        style={{
                          width:
                            `${widths.away}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

function TeamBadge({
  team,
}: {
  team:
    | TeamStatistics["team"]
    | undefined;
}) {
  const name =
    team?.name ||
    "Team";

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center">
        {team?.logo ? (
          <img
            src={
              team.logo
            }
            alt={
              name
            }
            className="max-h-8 max-w-8 object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf7ef] text-xs font-black text-[#139653]">
            {name
              .slice(
                0,
                1
              )
              .toUpperCase()}
          </div>
        )}
      </div>

      <span className="hidden max-w-[120px] truncate text-xs font-black text-[#536158] md:block">
        {name}
      </span>
    </div>
  );
}