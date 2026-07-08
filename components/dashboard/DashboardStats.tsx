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
    {
      title: "Today's Matches",
      value: total,
      color: "text-yellow-400",
    },
    {
      title: "Live",
      value: live,
      color: "text-red-400",
    },
    {
      title: "Finished",
      value: finished,
      color: "text-green-400",
    },
    {
      title: "Upcoming",
      value: upcoming,
      color: "text-blue-400",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-white/10 bg-[#111827] p-6"
        >
          <p className="text-sm text-gray-400">{item.title}</p>

          <h2 className={`mt-2 text-4xl font-black ${item.color}`}>
            {item.value}
          </h2>
        </div>
      ))}
    </section>
  );
}