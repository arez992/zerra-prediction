"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DecisionAction = { enabled?: boolean; requiresApproval?: boolean; reason?: string };
type Decision = {
  id: string; status?: string; source?: string; confidence?: number; overallHealth?: string; summary?: string; approvalMode?: string; autoApprovalEligible?: boolean; createdAt?: string | null;
  actions?: Record<string, DecisionAction>;
  policy?: { mode?: string; reasons?: string[]; enabledActions?: string[]; eligibleForAutoApproval?: boolean };
};

type DecisionsResponse = { success: boolean; decisions?: Decision[]; error?: string };

async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok || data?.success === false) throw new Error(data?.error || "Request failed.");
  return data;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export default function CEOOwnerApprovalQueue() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/ai-ceo/decisions?limit=50", { cache: "no-store", credentials: "include" });
      const data = await readJson(response) as DecisionsResponse;
      setDecisions(data.decisions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Owner Approval Queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const queue = useMemo(() => decisions.filter((item) =>
    (item.status === "pending" || item.status === "approved") &&
    (item.approvalMode === "manual" || item.autoApprovalEligible === false)
  ), [decisions]);

  const act = useCallback(async (decision: Decision, action: "approve" | "reject" | "execute") => {
    let body: Record<string, unknown> | undefined;

    if (action === "reject") {
      const reason = window.prompt("Reason for rejection:", "Rejected by owner");
      if (reason === null) return;
      body = { reason: reason.trim() || "Rejected by owner" };
    }

    if (action === "execute" && !window.confirm("Execute this approved AI CEO decision through ZAOS Directors?")) return;

    try {
      setBusyId(decision.id);
      setError("");
      setMessage("");
      const response = await fetch(`/api/admin/ai-ceo/decisions/${encodeURIComponent(decision.id)}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      await readJson(response);
      setMessage(action === "approve" ? "Decision approved by Owner. It is now ready to execute." : action === "execute" ? "Decision execution completed through the registered ZAOS workflow." : "Decision rejected by Owner.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Unable to ${action} decision.`);
      await load();
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/25 bg-[#101827] p-6 shadow-xl md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">Owner Control</p>
          <h2 className="mt-3 text-3xl font-black">Owner Approval Queue</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Manual AI CEO decisions wait here. Review the evidence and policy reasons before approving, rejecting, or executing them.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-full border border-white/15 px-5 py-3 text-sm font-black disabled:opacity-40">{loading ? "Refreshing..." : "Refresh Queue"}</button>
      </div>

      {error && <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {message && <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4">
        <span className="text-xs font-black uppercase tracking-wider text-white/40">Waiting for Owner</span>
        <span className="ml-3 text-xl font-black text-[#D4AF37]">{queue.length}</span>
      </div>

      <div className="mt-5 space-y-4">
        {!loading && queue.length === 0 && <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-6 text-sm text-emerald-200">No manual AI CEO decisions currently require Owner action.</div>}

        {queue.map((decision) => {
          const enabledActions = Object.entries(decision.actions || {}).filter(([, value]) => value?.enabled === true);
          const busy = busyId === decision.id;
          return (
            <article key={decision.id} className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-300">{decision.status === "approved" ? "OWNER APPROVED" : "OWNER REVIEW REQUIRED"}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-white/60">{String(decision.source || "unknown").toUpperCase()}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-white/60">Confidence {Math.round(Number(decision.confidence || 0))}%</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-white/60">Health {decision.overallHealth || "Unknown"}</span>
                  </div>
                  <p className="mt-4 text-xs text-white/30">{formatDate(decision.createdAt)}</p>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-white/65">{decision.summary || "No executive summary was stored."}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-white/35">Enabled Actions</p>
                  <div className="mt-3 space-y-2">
                    {enabledActions.length === 0 ? <p className="text-sm text-white/40">No enabled actions.</p> : enabledActions.map(([key, action]) => <div key={key}><p className="text-sm font-black text-white">{key}</p><p className="mt-1 text-xs leading-5 text-white/40">{action.reason || "No reason provided."}</p></div>)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-white/35">Why Manual?</p>
                  <div className="mt-3 space-y-2">
                    {(decision.policy?.reasons || []).length === 0 ? <p className="text-sm text-white/40">No policy reason recorded.</p> : (decision.policy?.reasons || []).map((reason, index) => <p key={`${decision.id}-reason-${index}`} className="text-xs leading-5 text-white/50">• {reason}</p>)}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {decision.status === "pending" && <button type="button" disabled={busy} onClick={() => void act(decision, "approve")} className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{busy ? "Working..." : "Approve"}</button>}
                {decision.status === "approved" && <button type="button" disabled={busy} onClick={() => void act(decision, "execute")} className="rounded-full bg-[#D4AF37] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{busy ? "Working..." : "Execute through ZAOS"}</button>}
                <button type="button" disabled={busy} onClick={() => void act(decision, "reject")} className="rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-black text-red-300 disabled:opacity-40">Reject</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}