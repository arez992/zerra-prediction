"use client";

export default function LearningDashboard() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#0f1422] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-500">
            ZAOS Learning
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            Learning Dashboard
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Monitor how ZAOS learns from completed executions,
            business outcomes, and historical recommendations.
          </p>
        </div>

        <button
          className="rounded-full border border-yellow-500 px-6 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
          type="button"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Total Learning",
          "Success Rate",
          "Failure Rate",
          "Average Score",
          "Best Strategy",
          "Worst Strategy",
          "Top Agent",
          "Last Learning",
        ].map((title) => (
          <div
            key={title}
            className="rounded-2xl border border-zinc-800 bg-[#151c2e] p-5"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              {title}
            </p>

            <div className="mt-5 h-10 w-24 animate-pulse rounded bg-zinc-700/40" />

            <div className="mt-6 h-3 w-full animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
        <h3 className="text-lg font-semibold text-white">
          Learning Timeline
        </h3>

        <div className="mt-6 h-48 animate-pulse rounded-xl bg-zinc-800/50" />
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#151c2e] p-6">
        <h3 className="text-lg font-semibold text-white">
          Strategy Performance
        </h3>

        <div className="mt-6 h-72 animate-pulse rounded-xl bg-zinc-800/50" />
      </div>
    </section>
  );
}