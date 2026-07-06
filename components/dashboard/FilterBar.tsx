type FilterType = "all" | "live" | "upcoming" | "finished";

type FilterBarProps = {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
};

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "🔴 Live", value: "live" },
  { label: "⏰ Upcoming", value: "upcoming" },
  { label: "✅ Finished", value: "finished" },
];

export default function FilterBar({
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className="flex gap-3 overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-3">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-bold transition ${
            activeFilter === filter.value
              ? "bg-[#D4AF37] text-black"
              : "bg-black/30 text-white/60 hover:text-white"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}