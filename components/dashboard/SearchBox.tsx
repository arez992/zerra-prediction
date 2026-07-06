type SearchBoxProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
};

export default function SearchBox({
  searchTerm,
  onSearchChange,
}: SearchBoxProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search team, league, or country..."
        className="w-full rounded-2xl bg-black/40 px-5 py-4 text-sm font-bold text-white outline-none placeholder:text-white/40 focus:border-[#D4AF37]"
      />
    </div>
  );
}