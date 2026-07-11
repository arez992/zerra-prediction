"use client";

type CEOHeaderProps = {
  generating: boolean;
  loading: boolean;
  onGenerate: () => void;
  onRefresh: () => void;
};

export default function CEOHeader({
  generating,
  loading,
  onGenerate,
  onRefresh,
}: CEOHeaderProps) {
  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/25 bg-[#101827] p-7 shadow-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
            ZERRA Executive Intelligence
          </p>

          <h1 className="mt-4 text-4xl font-black sm:text-5xl">
            AI CEO Command Center
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-white/60">
            Analyze internal data, Google Analytics, Search
            Console, payments, users, markets, and business
            performance to generate executive recommendations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:border-[#D4AF37]/60 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : "Generate Recommendations"}
          </button>
        </div>
      </div>
    </section>
  );
}