import { adminDb } from "@/lib/firebaseAdmin";

async function getMaintenanceMode() {
  try {
    const snap = await adminDb.collection("settings").doc("site").get();
    return snap.data()?.maintenanceMode === true;
  } catch {
    return false;
  }
}

export default async function MaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const maintenanceMode = await getMaintenanceMode();

  if (!maintenanceMode) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] px-5 text-center text-white">
      <section className="max-w-2xl rounded-[2rem] border border-[#D4AF37]/30 bg-[#0B1220] p-10 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
          ZERRA Maintenance
        </p>

        <h1 className="mt-4 text-4xl font-black">
          We&rsquo;ll be back soon
        </h1>

        <p className="mt-4 text-white/60">
          ZERRA Prediction is currently under maintenance. Please check back
          shortly.
        </p>
      </section>
    </main>
  );
}