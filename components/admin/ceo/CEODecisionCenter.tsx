"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CEOActionDecision = {
  enabled: boolean;
  requiresApproval: boolean;
  reason: string;
};

type CEOActionKey =
  | "publishPredictions"
  | "publishArticles"
  | "promoteVip"
  | "pauseMarketing"
  | "improveSeo"
  | "retrainAi"
  | "investigateApi";

type CEOPriority = {
  id: string;
  title: string;
  reason: string;
  impact: "Low" | "Medium" | "High";
  urgency: "Low" | "Medium" | "High";
  requiresApproval: boolean;
  actionKey: CEOActionKey | null;
};

type CEORisk = {
  title: string;
  level: "Low" | "Medium" | "High" | "Critical";
  reason: string;
  mitigation: string;
};

type CEOOpportunity = {
  title: string;
  reason: string;
  expectedImpact: "Low" | "Medium" | "High";
  nextStep: string;
};

type CEODecision = {
  id?: string;
  version: string;
  generatedAt: string;
  summary: string;
  confidence: number;
  overallHealth: "Excellent" | "Good" | "Warning" | "Critical";
  insufficientData: string[];
  todayPriorities: CEOPriority[];
  actions: Record<CEOActionKey, CEOActionDecision>;
  risks: CEORisk[];
  opportunities: CEOOpportunity[];
  evidence: string[];
  source?: "openai" | "rules";
  status?: string;
  createdAt?: string | null;
  createdBy?: string;
  metrics?: CEOMetrics;
};

type CEOMetrics = {
  generatedAt: string;
  revenue: {
    total: number | null;
    currency: string;
    trendPercent: number | null;
  };
  vip: {
    activeMembers: number | null;
    newMembers: number | null;
    conversionRate: number | null;
    revenue: number | null;
  };
  users: {
    total: number | null;
    active: number | null;
    newUsers: number | null;
  };
  traffic: {
    sessions: number | null;
    users: number | null;
    trendPercent: number | null;
  };
  seo: {
    publishedPages: number | null;
    averageQualityScore: number | null;
    pagesNeedingReview: number | null;
    organicClicks: number | null;
  };
  predictions: {
    total: number | null;
    published: number | null;
    pendingReview: number | null;
    checked: number | null;
    correct: number | null;
    accuracyPercent: number | null;
  };
  apiHealth: {
    apiFootballAvailable: boolean | null;
    openAiAvailable: boolean | null;
    paymentProviderAvailable: boolean | null;
    recentErrors: number | null;
  };
  costs: {
    total: number | null;
    apiFootball: number | null;
    openAi: number | null;
    infrastructure: number | null;
  };
  competitors: {
    monitored: number | null;
    notableChanges: string[];
  };
};

type HistoryResponse = {
  success: boolean;
  decisions?: CEODecision[];
  error?: string;
};

type LatestResponse = {
  success: boolean;
  decision?: CEODecision | null;
  error?: string;
};

type GenerateResponse = {
  success: boolean;
  decision?: CEODecision;
  metrics?: CEOMetrics;
  source?: "openai" | "rules";
  error?: string;
};

const ACTION_LABELS: Record<CEOActionKey, string> = {
  publishPredictions: "Publish predictions",
  publishArticles: "Publish articles",
  promoteVip: "Promote VIP",
  pauseMarketing: "Pause marketing",
  improveSeo: "Improve SEO",
  retrainAi: "Retrain AI",
  investigateApi: "Investigate API",
};

export default function CEODecisionCenter() {
  const [latest, setLatest] = useState<CEODecision | null>(null);
  const [history, setHistory] = useState<CEODecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [latestResponse, historyResponse] = await Promise.all([
        fetch("/api/admin/ai-ceo/decisions?mode=latest", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/admin/ai-ceo/decisions?limit=10", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const latestData = (await latestResponse.json()) as LatestResponse;
      const historyData = (await historyResponse.json()) as HistoryResponse;

      if (!latestResponse.ok || !latestData.success) {
        throw new Error(latestData.error || "Unable to load latest CEO decision.");
      }

      if (!historyResponse.ok || !historyData.success) {
        throw new Error(historyData.error || "Unable to load CEO decision history.");
      }

      setLatest(latestData.decision || null);
      setHistory(historyData.decisions || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load AI CEO data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function generateDecision() {
    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/admin/ai-ceo/decisions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instruction: instruction.trim() || undefined,
        }),
      });

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success || !data.decision) {
        throw new Error(data.error || "Unable to generate AI CEO decision.");
      }

      setInstruction("");
      setMessage(
        `New ${data.source === "openai" ? "OpenAI" : "rule-based"} CEO decision generated successfully.`
      );

      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate AI CEO decision."
      );
    } finally {
      setGenerating(false);
    }
  }

  const activeActions = useMemo(() => {
    if (!latest?.actions) return [];

    return (Object.entries(latest.actions) as Array<
      [CEOActionKey, CEOActionDecision]
    >).filter(([, action]) => action.enabled);
  }, [latest]);

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/25 bg-[#0B1220] p-6 shadow-2xl md:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            AI CEO Decision Center
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            Observe → Decide → Approve → Execute
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
            Generates executive decisions from verified ZERRA metrics. Every
            sensitive action remains approval-gated and no prediction is
            auto-published.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white/75 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
        <label className="text-sm font-black text-white">
          Optional executive instruction
        </label>

        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Example: Prioritize API reliability and VIP conversion without publishing anything."
          rows={3}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-[#07101D] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#D4AF37]/50"
        />

        <button
          type="button"
          onClick={() => void generateDecision()}
          disabled={generating}
          className="mt-4 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black disabled:opacity-60"
        >
          {generating ? "Generating decision..." : "Generate New CEO Decision"}
        </button>
      </div>

      {loading ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/45">
          Loading AI CEO decisions...
        </div>
      ) : !latest ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <h3 className="text-2xl font-black">No CEO decision yet</h3>
          <p className="mt-3 text-sm text-white/50">
            Generate the first decision to create the executive baseline.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Overall Health"
              value={latest.overallHealth}
              accent={getHealthAccent(latest.overallHealth)}
            />
            <MetricCard
              label="Confidence"
              value={`${latest.confidence}%`}
            />
            <MetricCard
              label="Decision Source"
              value={(latest.source || "rules").toUpperCase()}
            />
            <MetricCard
              label="Status"
              value={(latest.status || "pending").toUpperCase()}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-[#101827] p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
              Executive Summary
            </p>
            <p className="mt-4 text-base leading-8 text-white/65">
              {latest.summary}
            </p>
            <p className="mt-4 text-xs text-white/35">
              Generated: {formatDate(latest.generatedAt || latest.createdAt)}
              {" · "}
              Version: {latest.version}
            </p>
          </div>

          <MetricsGrid metrics={latest.metrics} />

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <Panel title="Today's Priorities" eyebrow="Priority Queue">
              {latest.todayPriorities.length > 0 ? (
                <div className="grid gap-3">
                  {latest.todayPriorities.map((priority, index) => (
                    <article
                      key={priority.id}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-[#D4AF37]">
                          #{index + 1}
                        </span>
                        <Tag value={`Impact: ${priority.impact}`} />
                        <Tag value={`Urgency: ${priority.urgency}`} />
                        {priority.requiresApproval && (
                          <Tag value="Approval required" />
                        )}
                      </div>
                      <h4 className="mt-3 text-lg font-black">
                        {priority.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-white/55">
                        {priority.reason}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyText text="No priorities were generated." />
              )}
            </Panel>

            <Panel title="Active Decisions" eyebrow="Action Policy">
              {activeActions.length > 0 ? (
                <div className="grid gap-3">
                  {activeActions.map(([key, action]) => (
                    <article
                      key={key}
                      className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="font-black">
                          {ACTION_LABELS[key]}
                        </h4>
                        <Tag
                          value={
                            action.requiresApproval
                              ? "Approval required"
                              : "Operational"
                          }
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/55">
                        {action.reason}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyText text="No active action decision is enabled." />
              )}
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel title="Risks" eyebrow="Risk Register">
              {latest.risks.length > 0 ? (
                <div className="grid gap-3">
                  {latest.risks.map((risk, index) => (
                    <article
                      key={`${risk.title}-${index}`}
                      className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-black">{risk.title}</h4>
                        <Tag value={risk.level} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/55">
                        {risk.reason}
                      </p>
                      <p className="mt-3 text-xs leading-6 text-red-200/65">
                        Mitigation: {risk.mitigation}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyText text="No verified risk was identified." />
              )}
            </Panel>

            <Panel title="Opportunities" eyebrow="Growth Signals">
              {latest.opportunities.length > 0 ? (
                <div className="grid gap-3">
                  {latest.opportunities.map((opportunity, index) => (
                    <article
                      key={`${opportunity.title}-${index}`}
                      className="rounded-2xl border border-green-500/15 bg-green-500/5 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-black">{opportunity.title}</h4>
                        <Tag value={`Impact: ${opportunity.expectedImpact}`} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/55">
                        {opportunity.reason}
                      </p>
                      <p className="mt-3 text-xs leading-6 text-green-200/65">
                        Next step: {opportunity.nextStep}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyText text="No verified opportunity was identified." />
              )}
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel title="Missing Data" eyebrow="Data Quality">
              {latest.insufficientData.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {latest.insufficientData.map((item) => (
                    <Tag key={item} value={item} />
                  ))}
                </div>
              ) : (
                <EmptyText text="All core executive metrics are available." />
              )}
            </Panel>

            <Panel title="Evidence" eyebrow="Decision Trace">
              {latest.evidence.length > 0 ? (
                <ul className="grid gap-3">
                  {latest.evidence.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/55"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyText text="No evidence trace was recorded." />
              )}
            </Panel>
          </div>
        </>
      )}

      <div className="mt-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          Decision History
        </p>

        <h3 className="mt-3 text-2xl font-black">
          Recent Executive Decisions
        </h3>

        <div className="mt-5 grid gap-3">
          {history.length > 0 ? (
            history.map((item) => (
              <article
                key={item.id || `${item.generatedAt}-${item.summary}`}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Tag value={item.overallHealth} />
                      <Tag value={`${item.confidence}% confidence`} />
                      <Tag value={(item.source || "rules").toUpperCase()} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {item.summary}
                    </p>
                  </div>
                  <p className="text-xs text-white/35">
                    {formatDate(item.createdAt || item.generatedAt)}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <EmptyText text="No decision history is available." />
          )}
        </div>
      </div>
    </section>
  );
}

function MetricsGrid({ metrics }: { metrics?: CEOMetrics }) {
  if (!metrics) return null;

  return (
    <section className="mt-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
        Verified Metrics
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Revenue"
          value={formatMoney(
            metrics.revenue.total,
            metrics.revenue.currency
          )}
        />
        <MetricCard
          label="Active VIP"
          value={formatValue(metrics.vip.activeMembers)}
        />
        <MetricCard
          label="VIP Conversion"
          value={formatPercent(metrics.vip.conversionRate)}
        />
        <MetricCard
          label="Prediction Accuracy"
          value={formatPercent(metrics.predictions.accuracyPercent)}
        />
        <MetricCard
          label="SEO Quality"
          value={formatValue(metrics.seo.averageQualityScore)}
        />
        <MetricCard
          label="Recent Errors"
          value={formatValue(metrics.apiHealth.recentErrors)}
        />
      </div>
    </section>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-black">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#101827] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className={`mt-3 break-words text-xl font-black ${accent || "text-[#D4AF37]"}`}>
        {value}
      </p>
    </div>
  );
}

function Tag({ value }: { value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
      {value}
    </span>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-white/40">{text}</p>;
}

function getHealthAccent(
  health: CEODecision["overallHealth"]
): string {
  if (health === "Excellent") return "text-green-300";
  if (health === "Good") return "text-blue-300";
  if (health === "Warning") return "text-yellow-300";
  return "text-red-300";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatValue(value: number | null) {
  return value === null ? "—" : String(value);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function formatMoney(value: number | null, currency: string) {
  return value === null ? "—" : `${value} ${currency}`;
}