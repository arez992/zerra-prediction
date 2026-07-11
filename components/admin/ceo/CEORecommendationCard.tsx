import type { CEORecommendation } from "@/lib/ai-ceo/client";

const priorityClasses = {
  low: "border-white/15 bg-white/5 text-white/70",
  medium:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
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

export default function CEORecommendationCard({
  recommendation,
}: {
  recommendation: CEORecommendation;
}) {
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

      {recommendation.status === "pending" && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6">
          <button
            type="button"
            disabled
            title="Approve API will be added in the next step"
            className="rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black opacity-50"
          >
            Approve
          </button>

          <button
            type="button"
            disabled
            title="Reject API will be added in the next step"
            className="rounded-full border border-red-500/30 px-5 py-3 text-sm font-black text-red-300 opacity-50"
          >
            Reject
          </button>

          <p className="flex items-center text-xs text-white/35">
            Approval and execution APIs are added in the next step.
          </p>
        </div>
      )}
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

      <p className="mt-2 text-xl font-black text-[#D4AF37] capitalize">
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