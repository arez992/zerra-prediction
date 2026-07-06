type FilterType = "all" | "live" | "upcoming" | "finished";

type FilterBarProps = {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
};

const filters: { label: string; value: FilterType }[] = [
  { label: "All Matches", value: "all" },
  { label: "🔴 Live", value: "live" },
  { label: "⏰ Upcoming", value: "upcoming" },
  { label: "✅ Finished", value: "finished" },
];

export default function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <section className="mt-2 rounded-3xl border-2 border-[#D4AF37]/60 bg-[#0B1220] p-4 shadow-xl">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Match Filters
      </p>

      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              activeFilter === filter.value
                ? "bg-[#D4AF37] text-black"
                : "bg-black/50 text-white hover:bg-white/10"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </section>
  );
}