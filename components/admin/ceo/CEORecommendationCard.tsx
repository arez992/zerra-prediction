"use client";

import type { CEORecommendation } from "@/lib/ai-ceo/client";

const priorityClasses = {
  low: "border-white/15 bg-white/5 text-white/70",
  medium:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  high:
    "border-orange-500/30 bg-orange-500/10 text-orange-300",
  critical:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

const statusClasses = {
  pending:
    "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  approved:
    "border-green-500/30 bg-green-500/10 text-green-300",
  rejected:
    "border-red-500/30 bg-red-500/10 text-red-300",
  executing:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

type CEORecommendationCardProps = {
  recommendation: CEORecommendation;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onExecute: (id: string) => void;
};

export default function CEORecommendationCard({
  recommendation,
  busy,
  onApprove,
  onReject,
  onExecute,
}: CEORecommendationCardProps) {
  function handleReject() {
    const reason = window.prompt(
      "Why do you want to reject this recommendation?",
      "Not suitable right now"
    );

    if (reason === null) return;

    const cleanReason = reason.trim();

    if (!cleanReason) {
      window.alert("Please enter a rejection reason.");
      return;
    }

    onReject(recommendation.id, cleanReason);
  }

  function handleExecute() {
    const confirmed = window.confirm(
      "Execute this approved recommendation now?"
    );

    if (confirmed) {
      onExecute(recommendation.id);
    }
  }

  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge
              className={priorityClasses[recommendation.priority]}
            >
              {recommendation.priority}
            </Badge>

            <Badge
              className={statusClasses[recommendation.status]}
            >
              {recommendation.status}
            </Badge>

            <Badge className="border-white/10 bg-black/20 text-white/60">
              {recommendation.category}
            </Badge>

            {recommendation.country && (
              <Badge className="border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
                {recommendation.country}
              </Badge>
            )}
          </div>

          <h3 className="mt-5 text-2xl font-black">
            {recommendation.title}
          </h3>

          <p className="mt-3 max-w-4xl leading-7 text-white/60">
            {recommendation.description}
          </p>
        </div>

        <div className="grid min-w-[210px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Metric
            title="Confidence"
            value={`${recommendation.confidence ?? 0}%`}
          />

          <Metric
            title="Risk"
            value={recommendation.risk || "—"}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info
          title="Expected Impact"
          value={recommendation.expectedImpact || "—"}
        />

        <Info
          title="Data Source"
          value={recommendation.source || "AI CEO"}
        />

        <Info
          title="Execution Type"
          value={recommendation.executionType || "Not assigned"}
        />

        <Info
          title="Created"
          value={formatDate(recommendation.createdAt)}
        />
      </div>

      {recommendation.result && (
        <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-xs font-black uppercase text-green-300">
            Result
          </p>

          <p className="mt-2 text-sm text-white/70">
            {recommendation.result}
          </p>
        </div>
      )}

      {recommendation.rejectionReason && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs font-black uppercase text-red-300">
            Rejection Reason
          </p>

          <p className="mt-2 text-sm text-white/70">
            {recommendation.rejectionReason}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6">
        {recommendation.status === "pending" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onApprove(recommendation.id)}
              className="rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Processing..." : "Approve"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleReject}
              className="rounded-full border border-red-500/30 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Processing..." : "Reject"}
            </button>
          </>
        )}

        {recommendation.status === "approved" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleExecute}
              className="rounded-full bg-green-500 px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Executing..." : "Execute"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleReject}
              className="rounded-full border border-red-500/30 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}

        {recommendation.status === "executing" && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-300">
            Execution in progress...
          </span>
        )}

        {recommendation.status === "completed" && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300">
            Execution completed
          </span>
        )}

        {recommendation.status === "rejected" && (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300">
            Recommendation rejected
          </span>
        )}

        {recommendation.status === "failed" && (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300">
            Execution failed
          </span>
        )}
      </div>
    </article>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${className}`}
    >
      {children}
    </span>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs uppercase text-white/40">
        {title}
      </p>

      <p className="mt-2 text-xl font-black capitalize text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-black/20 p-4">
      <p className="text-xs uppercase text-white/40">
        {title}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-white/75">
        {value}
      </p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}