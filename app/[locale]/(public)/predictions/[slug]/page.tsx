import Link from "next/link";

export default function PredictionDetailsPage() {
  return (
    <main className="min-h-screen bg-[#050816] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/en/predictions" className="text-sm text-[#D4AF37]">
          ← Back to Predictions
        </Link>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-[#D4AF37]">Football · Premier League</p>

          <h1 className="mt-3 text-5xl font-black">
            Man City vs Arsenal
          </h1>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-black/30 p-5">
              <p className="text-white/50">Prediction</p>
              <h2 className="mt-2 text-2xl font-black text-[#D4AF37]">
                Over 2.5 Goals
              </h2>
            </div>

            <div className="rounded-2xl bg-black/30 p-5">
              <p className="text-white/50">AI Confidence</p>
              <h2 className="mt-2 text-2xl font-black">92%</h2>
            </div>

            <div className="rounded-2xl bg-black/30 p-5">
              <p className="text-white/50">Risk Level</p>
              <h2 className="mt-2 text-2xl font-black">Low</h2>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-2xl font-black">AI Analysis</h3>
              <p className="mt-4 text-white/70">
                Both teams have strong attacking trends, high shot volume, and recent matches
                with multiple goals. The model detects strong value in the goals market.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-2xl font-black">Key Factors</h3>
              <ul className="mt-4 space-y-3 text-white/70">
                <li>• Strong recent scoring form</li>
                <li>• High attacking pressure</li>
                <li>• Positive head-to-head goal trend</li>
                <li>• Medium defensive instability</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-6">
            <p className="text-[#D4AF37]">VIP Recommendation</p>
            <h3 className="mt-2 text-2xl font-black">
              Full premium breakdown available for VIP members.
            </h3>
          </div>
        </div>
      </div>
    </main>
  );
}