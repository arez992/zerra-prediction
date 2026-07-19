type TimelinePanelProps = {
  events?: any[];
};

function getEventIcon(
  type?: string,
  detail?: string
): string {
  const normalizedType =
    String(
      type || ""
    ).toLowerCase();

  const normalizedDetail =
    String(
      detail || ""
    ).toLowerCase();

  if (
    normalizedType.includes(
      "goal"
    )
  ) {
    return "⚽";
  }

  if (
    normalizedType.includes(
      "card"
    )
  ) {
    if (
      normalizedDetail.includes(
        "red"
      )
    ) {
      return "🟥";
    }

    return "🟨";
  }

  if (
    normalizedType.includes(
      "subst"
    )
  ) {
    return "↔";
  }

  if (
    normalizedType.includes(
      "var"
    )
  ) {
    return "VAR";
  }

  return "•";
}

function formatEventTitle(
  event: any
): string {
  const type =
    String(
      event?.type ||
        ""
    ).trim();

  const detail =
    String(
      event?.detail ||
        ""
    ).trim();

  if (
    detail &&
    detail !== type
  ) {
    return detail;
  }

  return (
    type ||
    "Match Event"
  );
}

function formatEventTime(
  event: any
): string {
  const elapsed =
    event?.time
      ?.elapsed;

  const extra =
    event?.time
      ?.extra;

  if (
    elapsed === null ||
    elapsed === undefined
  ) {
    return "—";
  }

  if (
    extra !== null &&
    extra !== undefined
  ) {
    return `${elapsed}+${extra}'`;
  }

  return `${elapsed}'`;
}

export default function TimelinePanel({
  events = [],
}: TimelinePanelProps) {
  const validEvents =
    Array.isArray(
      events
    )
      ? events.filter(
          (
            event
          ) =>
            Boolean(
              event &&
                typeof event ===
                  "object"
            )
        )
      : [];

  return (
    <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
        Match Timeline
      </p>

      <h2 className="mt-2 text-2xl font-black text-[#102117]">
        Key Match Events
      </h2>

      <p className="mt-2 text-sm text-[#758179]">
        Real events from the
        football data provider.
      </p>

      {validEvents.length ===
      0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#cfdcd2] bg-[#fbfdfb] p-10 text-center">
          <p className="font-black text-[#102117]">
            No match events
            available yet
          </p>

          <p className="mt-2 text-sm leading-6 text-[#758179]">
            Goals, cards,
            substitutions, VAR
            events, and other key
            match moments will
            appear here when the
            live data becomes
            available.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="relative">
            <div className="absolute bottom-0 left-[23px] top-0 w-px bg-[#dfe8e2]" />

            <div className="relative grid gap-4">
              {validEvents.map(
                (
                  event,
                  index
                ) => {
                  const icon =
                    getEventIcon(
                      event?.type,
                      event?.detail
                    );

                  const player =
                    event?.player
                      ?.name;

                  const assist =
                    event?.assist
                      ?.name;

                  const team =
                    event?.team
                      ?.name;

                  const comments =
                    event?.comments;

                  return (
                    <article
                      key={
                        event?.id ||
                        `${event?.time?.elapsed || "event"}-${index}`
                      }
                      className="relative grid grid-cols-[48px_minmax(0,1fr)] gap-4"
                    >
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#dce8df] bg-white text-sm font-black text-[#139653] shadow-sm">
                        {icon}
                      </div>

                      <div className="rounded-2xl border border-[#e2ebe5] bg-[#fbfdfb] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-[#102117]">
                              {formatEventTitle(
                                event
                              )}
                            </p>

                            {team && (
                              <p className="mt-1 text-xs font-bold text-[#139653]">
                                {team}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-black text-[#0d7a40]">
                            {formatEventTime(
                              event
                            )}
                          </span>
                        </div>

                        {(player ||
                          assist ||
                          comments) && (
                          <div className="mt-3 grid gap-1 text-xs text-[#66756c]">
                            {player && (
                              <p>
                                Player:{" "}
                                <strong className="text-[#102117]">
                                  {player}
                                </strong>
                              </p>
                            )}

                            {assist && (
                              <p>
                                Assist / Related Player:{" "}
                                <strong className="text-[#102117]">
                                  {assist}
                                </strong>
                              </p>
                            )}

                            {comments && (
                              <p className="leading-5">
                                {String(
                                  comments
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}