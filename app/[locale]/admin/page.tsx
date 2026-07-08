export default function AdminPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        ZERRA Admin
      </p>

      <h1 className="mt-4 text-5xl font-black">Admin Dashboard</h1>

      <p className="mt-4 max-w-2xl text-white/60">
        Manage VIP users, payments, prediction history, AI cache, and platform
        performance.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard title="VIP Users" value="0" />
        <AdminCard title="Payments" value="0" />
        <AdminCard title="Predictions" value="0" />
        <AdminCard title="AI Cache" value="0" />
      </section>
    </main>
  );
}

function AdminCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <p className="text-sm text-white/50">{title}</p>
      <p className="mt-3 text-4xl font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}