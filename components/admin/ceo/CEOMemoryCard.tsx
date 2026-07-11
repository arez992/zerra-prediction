type CEOMemoryItem = {
  id: string;
  recommendationId?: string;
  lesson?: string;
  success?: boolean;
  roi?: number;
  source?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt?: string | null;
};

export default function CEOMemoryCard({
  memories,
  loading = false,
}: {
  memories: CEOMemoryItem[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-8 shadow-xl">
        <h2 className="text-2xl font-black">CEO Memory</h2>

        <p className="mt-6 text-sm text-white/50">
          Loading AI CEO memory...
        </p>
      </section>
    );
  }

  const successful = memories.filter(
    (memory) => memory.success === true
  ).length;

  const successRate =
    memories.length === 0
      ? 0
      : Number(
          ((successful / memories.length) * 100).toFixed(1)
        );

  const averageROI =
    memories.length === 0
      ? 0
      : Number(
          (
            memories.reduce(
              (total, memory) =>
                total + Number(memory.roi || 0),
              0
            ) / memories.length
          ).toFixed(2)
        );

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Learning Engine
          </p>

          <h2 className="mt-3 text-2xl font-black">
            CEO Memory
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Lessons learned from previous decisions and executions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <SummaryMetric
            title="Success Rate"
            value={`${successRate}%`}
          />

          <SummaryMetric
            title="Average ROI"
            value={`${averageROI}%`}
          />
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-black/20 p-8 text-center">
          <div className="text-4xl">🧠</div>

          <h3 className="mt-4 text-lg font-black">
            No CEO Memory Yet
          </h3>

          <p className="mt-2 text-sm text-white/40">
            Approve and execute recommendations to create learning
            memories.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {memories.slice(0, 10).map((memory) => (
            <article
              key={memory.id}
              className="rounded-3xl bg-black/30 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge success={memory.success === true} />

                    {memory.source && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase text-white/50">
                        {memory.source}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 leading-7 text-white/75">
                    {memory.lesson || "No lesson recorded."}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 px-5 py-4">
                  <p className="text-xs uppercase text-white/40">
                    ROI
                  </p>

                  <p className="mt-2 text-2xl font-black text-[#D4AF37]">
                    {Number(memory.roi || 0)}%
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-white/40">
                <span>
                  Recommendation:{" "}
                  {memory.recommendationId || "—"}
                </span>

                <span>
                  Created: {formatDate(memory.createdAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryMetric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-black/30 px-5 py-4">
      <p className="text-xs uppercase text-white/40">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ success }: { success: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
        success
          ? "border-green-500/30 bg-green-500/10 text-green-300"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {success ? "Successful" : "Unsuccessful"}
    </span>
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