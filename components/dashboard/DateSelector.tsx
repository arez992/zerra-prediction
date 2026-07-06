type DateSelectorProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
};

function getDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
}

export default function DateSelector({
  selectedDate,
  onDateChange,
}: DateSelectorProps) {
  const dates = [
    { label: "Yesterday", value: getDate(-1) },
    { label: "Today", value: getDate(0) },
    { label: "Tomorrow", value: getDate(1) },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Match Date
      </p>

      <div className="flex flex-wrap gap-3">
        {dates.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onDateChange(item.value)}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              selectedDate === item.value
                ? "bg-[#D4AF37] text-black"
                : "bg-black/50 text-white hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}