export default function MaintenancePage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-5 text-center text-white">
      <section className="max-w-2xl rounded-[2rem] border border-[#D4AF37]/30 bg-[#0B1220] p-10 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
          ZERRA Maintenance
        </p>

        <h1 className="mt-4 text-5xl font-black">We’ll be back soon</h1>

        <p className="mt-5 text-white/60">
          ZERRA Prediction is currently under maintenance. Please check back
          shortly.
        </p>
      </section>
    </main>
  );
}