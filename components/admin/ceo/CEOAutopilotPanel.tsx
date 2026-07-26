"use client";

type Props = {
  autopilot: any;
  busy: boolean;
  onControl: (action: "start" | "pause" | "stop" | "kill") => void;
  onRunNow: () => void;
};

export default function CEOAutopilotPanel({ autopilot, busy, onControl, onRunNow }: Props) {
  const config = autopilot?.config;
  const usage = autopilot?.usage;
  const guard = autopilot?.guard;
  const status = config?.status || "unknown";
  const killSwitch = config?.kill_switch === true;
  const running = status === "running" && !killSwitch;

  return (
    <section className="mt-6 rounded-[2rem] border border-emerald-400/20 bg-[#101827] p-6 shadow-xl">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">AI CEO Autopilot</p>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${running ? "bg-emerald-400/15 text-emerald-300" : killSwitch ? "bg-red-500/15 text-red-300" : "bg-white/10 text-white/60"}`}>
              {killSwitch ? "KILL SWITCH ACTIVE" : status.toUpperCase()}
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-black">Guarded Autonomous Operations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Runs cost-controlled AI CEO and ZAOS cycles. Unchanged data is skipped and high-risk actions remain protected by policy.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/35">Cycles Today</p>
            <p className="mt-1 text-xl font-black">{usage?.cycles ?? 0} / {config?.max_cycles_per_day ?? 24}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/35">AI Calls Today</p>
            <p className="mt-1 text-xl font-black">{usage?.aiCalls ?? 0} / {config?.max_ai_calls_per_day ?? 8}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/35">Cycle Guard</p>
            <p className={`mt-1 text-sm font-black ${guard?.allowed ? "text-emerald-300" : "text-amber-300"}`}>{guard?.allowed ? "READY" : "BLOCKED"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/35">AI Cost Guard</p>
            <p className={`mt-1 text-sm font-black ${guard?.allowAiCall ? "text-emerald-300" : "text-amber-300"}`}>{guard?.allowAiCall ? "AI ALLOWED" : "AI LIMITED"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={busy || running} onClick={() => onControl("start")} className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-black disabled:opacity-40">
          {busy ? "Working..." : "Start AI CEO Auto"}
        </button>
        <button type="button" disabled={busy || status !== "running"} onClick={() => onControl("pause")} className="rounded-full border border-amber-400/40 px-5 py-3 text-sm font-black text-amber-300 disabled:opacity-40">Pause</button>
        <button type="button" disabled={busy || status === "stopped"} onClick={() => onControl("stop")} className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white disabled:opacity-40">Stop</button>
        <button type="button" disabled={busy || !running} onClick={onRunNow} className="rounded-full border border-[#D4AF37]/50 px-5 py-3 text-sm font-black text-[#D4AF37] disabled:opacity-40">Run Now</button>
        <button type="button" disabled={busy || killSwitch} onClick={() => onControl("kill")} className="rounded-full border border-red-500/50 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 disabled:opacity-40">Emergency Kill Switch</button>
      </div>

      {guard?.reason && (
        <p className="mt-4 text-xs text-white/40">Guard status: {guard.reason}</p>
      )}
    </section>
  );
}