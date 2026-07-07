type TimelinePanelProps = {
  events?: any[];
};

export default function TimelinePanel({ events = [] }: TimelinePanelProps) {
  const demoEvents = [
    { time: "12'", icon: "⚽", title: "Goal", team: "Home Team" },
    { time: "28'", icon: "🟨", title: "Yellow Card", team: "Away Team" },
    { time: "61'", icon: "🔄", title: "Substitution", team: "Home Team" },
    { time: "84'", icon: "⚽", title: "Goal", team: "Away Team" },
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        Match Timeline
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Key Events
      </h2>

      <div className="mt-8 space-y-4">
        {demoEvents.map((event, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <div className="w-12 text-center font-black text-[#D4AF37]">
              {event.time}
            </div>

            <div className="text-2xl">{event.icon}</div>

            <div>
              <p className="font-black text-white">{event.title}</p>
              <p className="text-sm text-white/50">{event.team}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}