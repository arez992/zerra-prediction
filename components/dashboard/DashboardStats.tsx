type DashboardStatsProps = {
  total: number;
  live: number;
  finished: number;
  upcoming: number;
};

export default function DashboardStats({
  total,
  live,
  finished,
  upcoming,
}: DashboardStatsProps) {
  const stats = [
    { label: "Today's Matches", value: total },
    { label: "Live Now", value: live },
    { label: "Finished", value: finished },
    { label: "Upcoming", value: upcoming },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-white/10 bg-white/5 p-5"
        >
          <p className="text-sm text-white/50">{item.label}</p>
          <p className="mt-2 text-3xl font-black text-[#D4AF37]">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
