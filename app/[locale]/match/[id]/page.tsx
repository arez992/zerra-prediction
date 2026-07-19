"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import AIAnalysis from "@/components/ai/AIAnalysis";
import VipGate from "@/components/vip/VipGate";
import StatsPanel from "@/components/match/StatsPanel";
import TimelinePanel from "@/components/match/TimelinePanel";
import LineupsPanel from "@/components/match/LineupsPanel";

import {
  calculatePrediction,
} from "@/lib/ai/prediction";

import {
  generateExplanation,
} from "@/lib/ai/explanation";

type ActiveTab =
  | "overview"
  | "prediction"
  | "statistics"
  | "timeline"
  | "lineups";

function clampPercent(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(parsed)
    )
  );
}

function formatFixtureDate(
  value?: string
): string {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      weekday:
        "short",
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    }
  ).format(date);
}

function formatFixtureTime(
  value?: string
): string {
  if (!value) {
    return "TBD";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "TBD";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(date);
}

function getStrongestGoalMarket(
  prediction: any
) {
  const over25 =
    clampPercent(
      prediction?.over25
    );

  const under25 =
    clampPercent(
      prediction?.under25
    );

  if (
    over25 >= under25
  ) {
    return {
      label:
        "Over 2.5 Goals",
      confidence:
        over25,
    };
  }

  return {
    label:
      "Under 2.5 Goals",
    confidence:
      under25,
  };
}

export default function MatchDetailsPage() {
  const params =
    useParams<{
      locale: string;
      id: string;
    }>();

  const locale =
    params?.locale ||
    "en";

  const fixtureId =
    params?.id;

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    match,
    setMatch,
  ] =
    useState<any>(
      null
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ActiveTab>(
      "overview"
    );

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadMatch() {
      try {
        setLoading(
          true
        );

        const response =
          await fetch(
            `/api/sports/football/match?fixture=${fixtureId}`,
            {
              cache:
                "no-store",
              signal:
                controller.signal,
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Match request failed"
          );
        }

        const data =
          await response.json();

        if (
          !controller.signal
            .aborted
        ) {
          setMatch(
            data
          );
        }
      } catch (
        error
      ) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Failed to load match:",
          error
        );

        if (
          !controller.signal
            .aborted
        ) {
          setMatch(
            null
          );
        }
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(
            false
          );
        }
      }
    }

    if (
      fixtureId
    ) {
      void loadMatch();
    }

    return () => {
      controller.abort();
    };
  }, [
    fixtureId,
  ]);

  const prediction =
    useMemo(
      () => {
        if (
          !match?.fixture
        ) {
          return null;
        }

        return calculatePrediction(
          match
        );
      },
      [
        match,
      ]
    );

  const explanation =
    useMemo(
      () => {
        if (
          !match?.fixture ||
          !prediction
        ) {
          return null;
        }

        return generateExplanation(
          match,
          prediction
        );
      },
      [
        match,
        prediction,
      ]
    );

  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-[#f7faf8] px-4 py-10 text-[#102117]">
        <div className="mx-auto max-w-7xl rounded-2xl border border-[#dce8df] bg-white p-12 text-center">
          <p className="font-black">
            Loading match details...
          </p>

          <p className="mt-2 text-sm text-[#758179]">
            ZERRA is loading real
            fixture information.
          </p>
        </div>
      </main>
    );
  }

  if (
    !match?.fixture ||
    !prediction ||
    !explanation
  ) {
    return (
      <main className="min-h-screen bg-[#f7faf8] px-4 py-10 text-[#102117]">
        <div className="mx-auto max-w-7xl">
          <Link
            href={`/${locale}/dashboard`}
            className="text-sm font-black text-[#139653]"
          >
            ← Back to Predictions
          </Link>

          <section className="mt-8 rounded-[2rem] border border-[#dce8df] bg-white p-10 text-center">
            <h1 className="text-3xl font-black">
              Match Data Unavailable
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#66756c]">
              Match information is
              temporarily unavailable.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const fixture =
    match.fixture;

  const homeTeam =
    fixture?.teams
      ?.home;

  const awayTeam =
    fixture?.teams
      ?.away;

  const homeGoals =
    fixture?.goals
      ?.home;

  const awayGoals =
    fixture?.goals
      ?.away;

  const goalMarket =
    getStrongestGoalMarket(
      prediction
    );

  const tabs: {
    label: string;
    value: ActiveTab;
  }[] = [
    {
      label:
        "Match Overview",
      value:
        "overview",
    },
    {
      label:
        "AI Prediction",
      value:
        "prediction",
    },
    {
      label:
        "Statistics",
      value:
        "statistics",
    },
    {
      label:
        "Timeline",
      value:
        "timeline",
    },
    {
      label:
        "Lineups",
      value:
        "lineups",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#102117]">
      <section className="border-b border-[#e0e9e2] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Link
            href={`/${locale}/dashboard`}
            className="text-sm font-black text-[#139653]"
          >
            ← Back to Predictions
          </Link>

          <div className="mt-6 rounded-[2rem] border border-[#dce8df] bg-[#fbfdfb] px-5 py-8 md:px-10">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
                {fixture
                  ?.league
                  ?.name ||
                  "Football"}
              </p>

              <p className="mt-2 text-sm text-[#758179]">
                {fixture
                  ?.league
                  ?.round ||
                  fixture
                    ?.league
                    ?.country ||
                  "Match"}
              </p>
            </div>

            <div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
              <TeamHero
                team={
                  homeTeam
                }
              />

              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a978e]">
                  {
                    fixture
                      ?.fixture
                      ?.status
                      ?.long ||
                    "Scheduled"
                  }
                </p>

                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="text-4xl font-black md:text-5xl">
                    {homeGoals ??
                      "-"}
                  </span>

                  <span className="text-xl font-black text-[#a4afa7]">
                    :
                  </span>

                  <span className="text-4xl font-black md:text-5xl">
                    {awayGoals ??
                      "-"}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-[#e0e9e2] bg-white px-5 py-3">
                  <p className="text-sm font-black">
                    {formatFixtureTime(
                      fixture
                        ?.fixture
                        ?.date
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[#7a877e]">
                    {formatFixtureDate(
                      fixture
                        ?.fixture
                        ?.date
                    )}
                  </p>
                </div>
              </div>

              <TeamHero
                team={
                  awayTeam
                }
              />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4 border-t border-[#e7eee9] pt-6 text-xs text-[#66756c]">
              {fixture
                ?.fixture
                ?.venue
                ?.name && (
                <span>
                  Stadium:{" "}
                  <strong className="text-[#102117]">
                    {
                      fixture
                        .fixture
                        .venue
                        .name
                    }
                  </strong>
                </span>
              )}

              {fixture
                ?.fixture
                ?.venue
                ?.city && (
                <span>
                  City:{" "}
                  <strong className="text-[#102117]">
                    {
                      fixture
                        .fixture
                        .venue
                        .city
                    }
                  </strong>
                </span>
              )}

              {fixture
                ?.fixture
                ?.referee && (
                <span>
                  Referee:{" "}
                  <strong className="text-[#102117]">
                    {
                      fixture
                        .fixture
                        .referee
                    }
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <nav className="border-b border-[#e0e9e2] bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 md:px-6">
          {tabs.map(
            (
              tab
            ) => (
              <button
                key={
                  tab.value
                }
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.value
                  )
                }
                className={`shrink-0 border-b-2 px-5 py-4 text-sm font-black transition ${
                  activeTab ===
                  tab.value
                    ? "border-[#139653] text-[#139653]"
                    : "border-transparent text-[#77847b] hover:text-[#102117]"
                }`}
              >
                {
                  tab.label
                }
              </button>
            )
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {activeTab ===
          "overview" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
            <div className="grid gap-6">
              <VipGate
                fallbackTitle="Premium AI Prediction Locked"
                fallbackText="Upgrade to VIP to unlock ZERRA AI confidence, goal prediction, probability analysis, risk intelligence, and premium match verdict."
              >
                <section className="overflow-hidden rounded-[1.75rem] border border-[#dce8df] bg-white">
                  <div className="border-b border-[#e7eee9] px-6 py-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
                      ZERRA AI Prediction
                    </p>

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-black">
                          AI Match Prediction
                        </h2>

                        <p className="mt-2 text-sm text-[#66756c]">
                          ZERRA model
                          analysis based
                          on available
                          football data.
                        </p>
                      </div>

                      <ConfidenceBadge
                        value={
                          prediction.confidence
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 md:grid-cols-2">
                    <HighlightCard
                      label="Goal Prediction"
                      value={
                        goalMarket.label
                      }
                      detail={`${goalMarket.confidence}% model probability`}
                    />

                    <HighlightCard
                      label="Model Pick"
                      value={
                        prediction.valueBet ||
                        "No value pick"
                      }
                      detail={`Risk: ${prediction.risk}`}
                    />

                    <HighlightCard
                      label="Expected Goals"
                      value={`${Number(
                        prediction.homeExpectedGoals ??
                          0
                      ).toFixed(
                        1
                      )} - ${Number(
                        prediction.awayExpectedGoals ??
                          0
                      ).toFixed(
                        1
                      )}`}
                      detail={`Total xG ${Number(
                        prediction.expectedGoals ??
                          0
                      ).toFixed(
                        1
                      )}`}
                    />

                    <HighlightCard
                      label="Exact Score Estimate"
                      value={
                        prediction
                          ?.vipPrediction
                          ?.exactScore ||
                        "Unavailable"
                      }
                      detail="Model estimate"
                    />
                  </div>
                </section>

                <ProbabilitySection
                  homeName={
                    homeTeam
                      ?.name ||
                    "Home"
                  }
                  awayName={
                    awayTeam
                      ?.name ||
                    "Away"
                  }
                  home={
                    prediction.homeWin
                  }
                  draw={
                    prediction.draw
                  }
                  away={
                    prediction.awayWin
                  }
                />

                <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
                    Prediction Summary
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Why ZERRA sees
                    this match this
                    way
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-[#66756c]">
                    {
                      explanation.summary
                    }
                  </p>

                  {explanation
                    .reasons
                    ?.length >
                    0 && (
                    <div className="mt-6 grid gap-3">
                      {explanation.reasons.map(
                        (
                          reason:
                            string,
                          index:
                            number
                        ) => (
                          <div
                            key={`${index}-${reason}`}
                            className="flex gap-3 rounded-xl bg-[#f7faf8] px-4 py-3"
                          >
                            <span className="font-black text-[#139653]">
                              ✓
                            </span>

                            <p className="text-sm font-bold text-[#536158]">
                              {
                                reason
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>

                <AIAnalysis
                  match={match}
                  prediction={
                    prediction
                  }
                />
              </VipGate>
            </div>

            <aside className="grid content-start gap-6">
              <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
                  Match Information
                </p>

                <div className="mt-5 grid gap-4">
                  <InfoRow
                    label="Competition"
                    value={
                      fixture
                        ?.league
                        ?.name ||
                      "Football"
                    }
                  />

                  <InfoRow
                    label="Round"
                    value={
                      fixture
                        ?.league
                        ?.round ||
                      "Unavailable"
                    }
                  />

                  <InfoRow
                    label="Status"
                    value={
                      fixture
                        ?.fixture
                        ?.status
                        ?.long ||
                      "Unavailable"
                    }
                  />

                  <InfoRow
                    label="Date"
                    value={formatFixtureDate(
                      fixture
                        ?.fixture
                        ?.date
                    )}
                  />

                  <InfoRow
                    label="Kickoff"
                    value={formatFixtureTime(
                      fixture
                        ?.fixture
                        ?.date
                    )}
                  />

                  {fixture
                    ?.fixture
                    ?.venue
                    ?.name && (
                    <InfoRow
                      label="Venue"
                      value={
                        fixture
                          .fixture
                          .venue
                          .name
                      }
                    />
                  )}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
                  Goal Markets
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Model Probabilities
                </h2>

                <div className="mt-6 grid gap-5">
                  <ProbabilityBar
                    label="Over 2.5 Goals"
                    value={
                      prediction.over25
                    }
                  />

                  <ProbabilityBar
                    label="Under 2.5 Goals"
                    value={
                      prediction.under25
                    }
                  />

                  <ProbabilityBar
                    label="Both Teams to Score"
                    value={
                      prediction.btts
                    }
                  />
                </div>
              </section>

              <section className="rounded-[1.75rem] bg-[#102117] p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6be39e]">
                  ZERRA Verdict
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  {
                    prediction
                      ?.vipPrediction
                      ?.finalPrediction ||
                    prediction.valueBet ||
                    goalMarket.label
                  }
                </h2>

                <p className="mt-3 text-sm leading-6 text-white/60">
                  Confidence{" "}
                  {Math.round(
                    prediction.confidence
                  )}
                  % · Risk{" "}
                  {
                    prediction.risk
                  }
                </p>
              </section>
            </aside>
          </div>
        )}

        {activeTab ===
          "prediction" && (
          <VipGate
            fallbackTitle="Premium AI Prediction Locked"
            fallbackText="Upgrade to VIP to unlock full ZERRA AI match prediction intelligence."
          >
            <div className="grid gap-6">
              <ProbabilitySection
                homeName={
                  homeTeam
                    ?.name ||
                  "Home"
                }
                awayName={
                  awayTeam
                    ?.name ||
                  "Away"
                }
                home={
                  prediction.homeWin
                }
                draw={
                  prediction.draw
                }
                away={
                  prediction.awayWin
                }
              />

              <section className="grid gap-5 md:grid-cols-3">
                <HighlightCard
                  label="Goal Prediction"
                  value={
                    goalMarket.label
                  }
                  detail={`${goalMarket.confidence}% probability`}
                />

                <HighlightCard
                  label="Value Pick"
                  value={
                    prediction.valueBet ||
                    "No value pick"
                  }
                  detail={`Risk: ${prediction.risk}`}
                />

                <HighlightCard
                  label="Confidence"
                  value={`${Math.round(
                    prediction.confidence
                  )}%`}
                  detail="ZERRA model confidence"
                />
              </section>

              <AIAnalysis
                match={match}
                prediction={
                  prediction
                }
              />
            </div>
          </VipGate>
        )}

        {activeTab ===
          "statistics" && (
          <StatsPanel
            statistics={
              match.statistics
            }
          />
        )}

        {activeTab ===
          "timeline" && (
          <TimelinePanel
            events={
              match.events
            }
          />
        )}

        {activeTab ===
          "lineups" && (
          <LineupsPanel
            lineups={
              match.lineups
            }
          />
        )}
      </div>
    </main>
  );
}

function TeamHero({
  team,
}: {
  team: any;
}) {
  const name =
    team?.name ||
    "Team";

  return (
    <div className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-[#dce8df] bg-white p-3 shadow-sm">
        {team?.logo ? (
          <img
            src={
              team.logo
            }
            alt={
              name
            }
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-3xl font-black text-[#139653]">
            {name
              .slice(
                0,
                1
              )
              .toUpperCase()}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-xl font-black md:text-2xl">
        {name}
      </h2>
    </div>
  );
}

function ConfidenceBadge({
  value,
}: {
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#eaf7ef] px-4 py-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-[4px] border-[#139653] bg-white">
        <span className="text-xs font-black text-[#139653]">
          {Math.round(
            value
          )}
          %
        </span>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-[#6c7b71]">
          Confidence
        </p>

        <p className="text-sm font-black text-[#102117]">
          AI Model
        </p>
      </div>
    </div>
  );
}

function HighlightCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dce8df] bg-[#fbfdfb] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#87948b]">
        {label}
      </p>

      <p className="mt-3 text-lg font-black text-[#139653]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#758179]">
        {detail}
      </p>
    </div>
  );
}

function ProbabilitySection({
  homeName,
  awayName,
  home,
  draw,
  away,
}: {
  homeName: string;
  awayName: string;
  home: number;
  draw: number;
  away: number;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
        Probability Breakdown
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Match Outcome
        Probability
      </h2>

      <div className="mt-7 grid gap-6">
        <ProbabilityBar
          label={
            homeName
          }
          value={
            home
          }
        />

        <ProbabilityBar
          label="Draw"
          value={
            draw
          }
        />

        <ProbabilityBar
          label={
            awayName
          }
          value={
            away
          }
        />
      </div>
    </section>
  );
}

function ProbabilityBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const safeValue =
    clampPercent(
      value
    );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-[#4f5f55]">
          {label}
        </span>

        <span className="text-sm font-black text-[#139653]">
          {safeValue}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[#e8efea]">
        <div
          className="h-full rounded-full bg-[#139653]"
          style={{
            width:
              `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#edf2ee] pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-bold text-[#839087]">
        {label}
      </span>

      <span className="text-right text-sm font-black text-[#102117]">
        {value}
      </span>
    </div>
  );
}