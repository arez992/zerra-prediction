import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-14 text-white">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        Legal
      </p>

      <h1 className="mt-4 text-5xl font-black">Terms of Service</h1>

      <div className="mt-8 space-y-6 text-white/70">
        <p>
          ZERRA Prediction provides AI-generated football analysis, confidence
          scores, risk indicators, and prediction insights for informational and
          entertainment purposes only.
        </p>

        <p>
          Predictions are not guaranteed results. Football outcomes are
          uncertain, and users are responsible for their own decisions.
        </p>

        <p>
          VIP access provides premium analysis and additional insights, but does
          not guarantee profit, success, or betting outcomes.
        </p>

        <p>
          By using ZERRA, you agree to use the platform responsibly and comply
          with your local laws and regulations.
        </p>
      </div>

      <Link
        href="/en"
        className="mt-10 inline-block rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black"
      >
        Back Home
      </Link>
    </main>
  );
}