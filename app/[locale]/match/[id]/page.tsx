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
    !Number.isFinite(
      parsed
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        parsed
      )
    )
  );
}

function formatFixtureDate(
  value?: string
): string {
  if (
    !value
  ) {
    return "Date unavailable";
  }

  const date =
    new Date(
      value
    );

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
  ).format(
    date
  );
}

function formatFixtureTime(
  value?: string
): string {
  if (
    !value
  ) {
    return "TBD";
  }

  const date =
    new Date(
      value
    );

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
  ).format(
    date
  );
}

function formatMarketValue(
  value:
    number | undefined
): string {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    return "Unavailable";
  }

  return `${Math.round(
    value
  )}%`;
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
    enrichedMatch,
    setEnrichedMatch,
  ] =
    useState<any>(
      null
    );

  const [
    enrichmentLoading,
    setEnrichmentLoading,
  ] =
    useState(
      false
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ActiveTab>(
      "overview"
    );

  /*
   * FAST INITIAL LOAD
   *
   * This request intentionally asks only for
   * the lightweight match payload. It lets the
   * header and fixture information appear as
   * quickly as possible.
   */
  useEffect(() => {
    const controller =
      new AbortController();

    async function loadMatch() {
      try {
        setLoading(
          true
        );

        setMatch(
          null
        );

        setEnrichedMatch(
          null
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

  /*
   * BACKGROUND ENRICHMENT
   *
   * Heavy team history / H2H / injuries are
   * fetched only after the lightweight fixture
   * has already rendered.
   *
   * AI prediction and AI analysis wait for this
   * richer payload so we do not calculate twice
   * or trigger duplicate OpenAI requests.
   */
  useEffect(() => {
    if (
      !fixtureId ||
      !match?.fixture ||
      enrichedMatch
    ) {
      return;
    }

    const controller =
      new AbortController();

    async function loadEnrichment() {
      try {
        setEnrichmentLoading(
          true
        );

        const response =
          await fetch(
            `/api/sports/football/match?fixture=${fixtureId}&enrichment=true&h2h=true&injuries=true`,
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
          return;
        }

        const data =
          await response.json();

        if (
          !controller.signal
            .aborted
        ) {
          setEnrichedMatch(
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
          "Failed to enrich match:",
          error
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setEnrichmentLoading(
            false
          );
        }
      }
    }

    void loadEnrichment();

    return () => {
      controller.abort();
    };
  }, [
    fixtureId,
    match,
    enrichedMatch,
  ]);

  const predictionSource =
    enrichedMatch?.fixture
      ? enrichedMatch
      : null;

  const prediction =
    useMemo(
      () => {
        if (
          !predictionSource
            ?.fixture
        ) {
          return null;
        }

        return calculatePrediction(
          predictionSource
        );
      },
      [
        predictionSource,
      ]
    );

  const explanation =
    useMemo(
      () => {
        if (
          !predictionSource
            ?.fixture ||
          !prediction
        ) {
          return null;
        }

        return generateExplanation(
          predictionSource,
          prediction
        );
      },
      [
        predictionSource,
        prediction,
      ]
    );

  const detailedMatch =
    enrichedMatch?.fixture
      ? enrichedMatch
      : match;

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
            ZERRA is loading the
            core fixture first for
            a faster experience.
          </p>
        </div>
      </main>
    );
  }

  if (
    !match?.fixture
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
    fixture
      ?.teams
      ?.home;

  const awayTeam =
    fixture
      ?.teams
      ?.away;

  const homeGoals =
    fixture
      ?.goals
      ?.home;

  const awayGoals =
    fixture
      ?.goals
      ?.away;

  const primaryPrediction =
    prediction
      ?.vipPrediction
      ?.primaryPrediction;

  const markets =
    prediction
      ?.vipPrediction
      ?.markets;

  const hasStrongPrediction =
    Boolean(
      primaryPrediction
        ?.qualified
    );

  const primaryPick =
    primaryPrediction
      ?.pick ||
    "Analyzing...";

  const primaryCategory =
    primaryPrediction
      ?.category ||
    "Pending";

  const primaryConfidence =
    primaryPrediction
      ?.confidence ||
    0;

  const tabs: {
    label:
      string;

    value:
      ActiveTab;
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
        {(activeTab ===
          "overview" ||
          activeTab ===
            "prediction") &&
          (
            enrichmentLoading ||
            !prediction ||
            !explanation
          ) && (
          <PredictionLoadingPanel />
        )}

        {activeTab ===
          "overview" &&
          prediction &&
          explanation && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
            <div className="grid gap-6">
              <VipGate
                fallbackTitle="Premium AI Prediction Locked"
                fallbackText="Upgrade to VIP to unlock ZERRA's strongest qualified market pick, confidence, market probabilities, risk intelligence, and premium match reasoning."
              >
                <section className="overflow-hidden rounded-[1.75rem] border border-[#dce8df] bg-white">
                  <div className="border-b border-[#e7eee9] px-6 py-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
                      ZERRA AI Primary Prediction
                    </p>

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-black">
                          Strongest Market Signal
                        </h2>

                        <p className="mt-2 text-sm text-[#66756c]">
                          ZERRA evaluates multiple
                          football markets and
                          selects only the strongest
                          qualified prediction.
                        </p>
                      </div>

                      <ConfidenceBadge
                        value={
                          primaryConfidence
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 md:grid-cols-2">
                    <HighlightCard
                      label="Primary Prediction"
                      value={
                        primaryPick
                      }
                      detail={
                        hasStrongPrediction
                          ? `${primaryCategory} · Qualified`
                          : primaryCategory
                      }
                    />

                    <HighlightCard
                      label="Market Category"
                      value={
                        primaryCategory
                      }
                      detail={
                        hasStrongPrediction
                          ? "Selected as strongest qualified market"
                          : "No market passed the required threshold"
                      }
                    />

                    <HighlightCard
                      label="Expected Goals"
                      value={`${Number(
                        prediction
                          .homeExpectedGoals ??
                          0
                      ).toFixed(
                        1
                      )} - ${Number(
                        prediction
                          .awayExpectedGoals ??
                          0
                      ).toFixed(
                        1
                      )}`}
                      detail={`Total xG ${Number(
                        prediction
                          .expectedGoals ??
                          0
                      ).toFixed(
                        1
                      )}`}
                    />

                    <HighlightCard
                      label="Supplemental Score Estimate"
                      value={
                        prediction
                          .vipPrediction
                          .exactScore ||
                        "Unavailable"
                      }
                      detail="Supplemental model estimate only"
                    />
                  </div>

                  {!hasStrongPrediction && (
                    <div className="mx-6 mb-6 rounded-2xl border border-[#f0e1b8] bg-[#fffaf0] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9a741c]">
                        Prediction Withheld
                      </p>

                      <p className="mt-2 text-sm leading-7 text-[#6c6042]">
                        {
                          primaryPrediction
                            ?.reason
                        }
                      </p>
                    </div>
                  )}
                </section>

                <PrimaryMarketSection
                  prediction={
                    prediction
                  }
                />

                <SupportingOutcomeSection
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
                  match={
                    predictionSource
                  }
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

              <VipGate hideFallback>
                <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
                    Core Goal Signals
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    Market Probabilities
                  </h2>

                  <div className="mt-6 grid gap-5">
                    <ProbabilityBar
                      label="Over 2.5 Goals"
                      value={
                        markets?.over25 ??
                        0
                      }
                    />

                    <ProbabilityBar
                      label="Under 2.5 Goals"
                      value={
                        markets?.under25 ??
                        0
                      }
                    />

                    <ProbabilityBar
                      label="BTTS Yes"
                      value={
                        markets
                          ?.bttsYes ??
                        markets
                          ?.btts ??
                        0
                      }
                    />

                    <ProbabilityBar
                      label="BTTS No"
                      value={
                        markets
                          ?.bttsNo ??
                        (
                          100 -
                          (
                            markets
                              ?.btts ??
                            0
                          )
                        )
                      }
                    />
                  </div>
                </section>

                <section className="rounded-[1.75rem] bg-[#102117] p-6 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6be39e]">
                    ZERRA Primary Verdict
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    {
                      primaryPick
                    }
                  </h2>

                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#6be39e]">
                    {
                      primaryCategory
                    }
                  </p>

                  <p className="mt-3 text-sm leading-6 text-white/60">
                    Confidence{" "}
                    {Math.round(
                      primaryConfidence
                    )}
                    % · Risk{" "}
                    {
                      prediction.risk
                    }
                  </p>

                  {!hasStrongPrediction && (
                    <p className="mt-4 text-sm leading-6 text-white/55">
                      ZERRA is not forcing
                      a weak prediction for
                      this match.
                    </p>
                  )}
                </section>
              </VipGate>
            </aside>
          </div>
        )}

        {activeTab ===
          "prediction" &&
          prediction &&
          explanation && (
          <VipGate
            fallbackTitle="Premium AI Prediction Locked"
            fallbackText="Upgrade to VIP to unlock full ZERRA AI market prediction intelligence."
          >
            <div className="grid gap-6">
              <section className="grid gap-5 md:grid-cols-3">
                <HighlightCard
                  label="Primary Prediction"
                  value={
                    primaryPick
                  }
                  detail={
                    primaryCategory
                  }
                />

                <HighlightCard
                  label="Confidence"
                  value={`${Math.round(
                    primaryConfidence
                  )}%`}
                  detail={
                    hasStrongPrediction
                      ? "Evidence-adjusted market confidence"
                      : "Below qualification standard"
                  }
                />

                <HighlightCard
                  label="Risk"
                  value={
                    prediction.risk
                  }
                  detail={`${prediction.riskScore}/100 risk score`}
                />
              </section>

              <PrimaryMarketSection
                prediction={
                  prediction
                }
              />

              <SupportingOutcomeSection
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

              <AIAnalysis
                match={
                  predictionSource
                }
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
              detailedMatch
                ?.statistics ||
              []
            }
          />
        )}

        {activeTab ===
          "timeline" && (
          <TimelinePanel
            events={
              detailedMatch
                ?.events ||
              []
            }
          />
        )}

        {activeTab ===
          "lineups" && (
          <LineupsPanel
            lineups={
              detailedMatch
                ?.lineups ||
              []
            }
          />
        )}
      </div>
    </main>
  );
}

function PredictionLoadingPanel() {
  return (
    <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-8 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#dce8df] border-t-[#139653]" />

      <p className="mt-4 font-black text-[#102117]">
        Preparing ZERRA AI analysis...
      </p>

      <p className="mt-2 text-sm leading-6 text-[#758179]">
        Match information is already
        available. Advanced prediction
        intelligence is loading in the
        background.
      </p>
    </section>
  );
}

function TeamHero({
  team,
}: {
  team:
    any;
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
  value:
    number;
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
          Primary Market
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
  label:
    string;

  value:
    string;

  detail:
    string;
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

function PrimaryMarketSection({
  prediction,
}: {
  prediction:
    ReturnType<
      typeof calculatePrediction
    >;
}) {
  const markets =
    prediction
      .vipPrediction
      .markets;

  return (
    <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
        ZERRA Market Intelligence
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Primary Market Analysis
      </h2>

      <p className="mt-3 text-sm leading-7 text-[#66756c]">
        ZERRA compares multiple
        football markets and selects
        the strongest qualified signal
        instead of forcing a match-winner
        prediction.
      </p>

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <MarketGroup
          title="Total Goals"
          items={[
            {
              label:
                "Over 1.5",

              value:
                markets.over15,
            },
            {
              label:
                "Under 1.5",

              value:
                markets.under15,
            },
            {
              label:
                "Over 2.5",

              value:
                markets.over25,
            },
            {
              label:
                "Under 2.5",

              value:
                markets.under25,
            },
            {
              label:
                "Over 3.5",

              value:
                markets.over35,
            },
            {
              label:
                "Under 3.5",

              value:
                markets.under35,
            },
          ]}
        />

        <MarketGroup
          title="Both Teams To Score"
          items={[
            {
              label:
                "BTTS Yes",

              value:
                markets.bttsYes ??
                markets.btts,
            },
            {
              label:
                "BTTS No",

              value:
                markets.bttsNo ??
                (
                  100 -
                  markets.btts
                ),
            },
          ]}
        />

        <MarketGroup
          title="Home Team Goals"
          items={[
            {
              label:
                "Over 0.5",

              value:
                markets.homeOver05,
            },
            {
              label:
                "Under 0.5",

              value:
                markets.homeUnder05,
            },
            {
              label:
                "Over 1.5",

              value:
                markets.homeOver15,
            },
            {
              label:
                "Under 1.5",

              value:
                markets.homeUnder15,
            },
          ]}
        />

        <MarketGroup
          title="Away Team Goals"
          items={[
            {
              label:
                "Over 0.5",

              value:
                markets.awayOver05,
            },
            {
              label:
                "Under 0.5",

              value:
                markets.awayUnder05,
            },
            {
              label:
                "Over 1.5",

              value:
                markets.awayOver15,
            },
            {
              label:
                "Under 1.5",

              value:
                markets.awayUnder15,
            },
          ]}
        />

        <MarketGroup
          title="Double Chance"
          items={[
            {
              label:
                "1X",

              value:
                markets.doubleChance1X,
            },
            {
              label:
                "X2",

              value:
                markets.doubleChanceX2,
            },
            {
              label:
                "12",

              value:
                markets.doubleChance12,
            },
          ]}
        />
      </div>
    </section>
  );
}

function MarketGroup({
  title,
  items,
}: {
  title:
    string;

  items:
    Array<{
      label:
        string;

      value:
        number | undefined;
    }>;
}) {
  return (
    <div className="rounded-2xl border border-[#e2ebe5] bg-[#fbfdfb] p-5">
      <p className="text-sm font-black text-[#102117]">
        {title}
      </p>

      <div className="mt-5 grid gap-4">
        {items.map(
          (
            item
          ) => (
            <div
              key={
                item.label
              }
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm font-bold text-[#66756c]">
                {
                  item.label
                }
              </span>

              <span className="text-sm font-black text-[#139653]">
                {formatMarketValue(
                  item.value
                )}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SupportingOutcomeSection({
  homeName,
  awayName,
  home,
  draw,
  away,
}: {
  homeName:
    string;

  awayName:
    string;

  home:
    number;

  draw:
    number;

  away:
    number;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#139653]">
        Supporting Analysis
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Match Outcome Probabilities
      </h2>

      <p className="mt-3 text-sm leading-7 text-[#66756c]">
        These 1X2 probabilities
        provide supporting context only.
        They do not define ZERRA&apos;s
        canonical primary prediction.
      </p>

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
  label:
    string;

  value:
    number;
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
  label:
    string;

  value:
    string;
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
