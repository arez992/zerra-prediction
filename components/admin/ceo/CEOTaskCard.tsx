type CEOTaskItem = {
  id: string;
  recommendationId?: string;
  title?: string;
  description?: string;
  status?:
    | "pending"
    | "approved"
    | "running"
    | "completed"
    | "failed";
  executionType?: string | null;
  assignedTo?: string | null;
  result?: unknown;
  error?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

const statusClasses = {
  pending:
    "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  approved:
    "border-green-500/30 bg-green-500/10 text-green-300",
  running:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function CEOTaskCard({
  tasks,
  loading = false,
}: {
  tasks: CEOTaskItem[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-8 shadow-xl">
        <h2 className="text-2xl font-black">CEO Tasks</h2>

        <p className="mt-6 text-sm text-white/50">
          Loading AI CEO tasks...
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          Execution Engine
        </p>

        <h2 className="mt-3 text-2xl font-black">
          CEO Tasks
        </h2>

        <p className="mt-2 text-sm text-white/50">
          Track approved, running, completed, and failed AI CEO
          actions.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-black/20 p-8 text-center">
          <div className="text-4xl">📋</div>

          <h3 className="mt-4 text-lg font-black">
            No CEO Tasks Yet
          </h3>

          <p className="mt-2 text-sm text-white/40">
            Approving a recommendation creates a new execution task.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {tasks.slice(0, 10).map((task) => {
            const status = task.status || "pending";

            return (
              <article
                key={task.id}
                className="rounded-3xl bg-black/30 p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses[status]}`}
                      >
                        {status}
                      </span>

                      {task.executionType && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase text-white/50">
                          {task.executionType}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-xl font-black">
                      {task.title || "AI CEO Task"}
                    </h3>

                    <p className="mt-2 leading-7 text-white/60">
                      {task.description ||
                        "No task description available."}
                    </p>
                  </div>

                  <div className="grid min-w-[200px] gap-3">
                    <TaskMetric
                      title="Assigned To"
                      value={task.assignedTo || "AI CEO"}
                    />

                    <TaskMetric
                      title="Created"
                      value={formatDate(task.createdAt)}
                    />
                  </div>
                </div>

                {task.error && (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-xs font-black uppercase text-red-300">
                      Execution Error
                    </p>

                    <p className="mt-2 text-sm text-white/70">
                      {task.error}
                    </p>
                  </div>
                )}

                {task.result !== undefined &&
                  task.result !== null && (
                    <div className="mt-5 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
                      <p className="text-xs font-black uppercase text-green-300">
                        Task Result
                      </p>

                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/70">
                        {formatResult(task.result)}
                      </pre>
                    </div>
                  )}

                <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-xs text-white/40 sm:grid-cols-3">
                  <span>
                    Recommendation:{" "}
                    {task.recommendationId || "—"}
                  </span>

                  <span>
                    Started: {formatDate(task.startedAt)}
                  </span>

                  <span>
                    Completed: {formatDate(task.completedAt)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TaskMetric({
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

      <p className="mt-2 break-words text-sm font-black text-[#D4AF37]">
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

function formatResult(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to display task result.";
  }
}