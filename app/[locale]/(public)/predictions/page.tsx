import Link from "next/link";

export default function PredictionsPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-5xl font-bold">Predictions</h1>

        <p className="mt-3 text-white/70">
          AI-powered predictions for today's biggest matches.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <span className="text-sm text-[#D4AF37]">Football</span>
            <h2 className="mt-3 text-2xl font-bold">
              Man City vs Arsenal
            </h2>

            <p className="mt-4 text-white/60">
              Prediction
            </p>

            <p className="text-xl font-bold text-[#D4AF37]">
              Over 2.5 Goals
            </p>

            <div className="mt-6 flex justify-between">
              <span>Confidence</span>
              <span className="font-bold">92%</span>
            </div>

            <div className="mt-2 flex justify-between">
              <span>Risk</span>
              <span>Low</span>
            </div>

            <Link
              href="/en/predictions/man-city-arsenal"
              className="mt-6 inline-block rounded-full bg-[#D4AF37] px-5 py-3 font-bold text-black"
            >
              View Details
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}