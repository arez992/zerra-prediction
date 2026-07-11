import type { CEORecommendationStats } from "@/lib/ai-ceo/client";

export default function CEOStats({
  stats,
}: {
  stats: CEORecommendationStats;
}) {
  const items = [
    {
      title: "Pending",
      value: stats.pending,
      icon: "⏳",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: "✅",
    },
    {
      title: "Executing",
      value: stats.executing,
      icon: "🚀",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: "🏆",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: "❌",
    },
    {
      title: "Failed",
      value: stats.failed,
      icon: "⚠️",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-3xl border border-white/10 bg-[#101827] p-5 shadow-xl"
        >
          <div className="text-2xl">{item.icon}</div>

          <p className="mt-4 text-sm text-white/50">
            {item.title}
          </p>

          <p className="mt-2 text-3xl font-black text-[#D4AF37]">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}