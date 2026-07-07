import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-14 text-white">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        Legal
      </p>

      <h1 className="mt-4 text-5xl font-black">Responsible Use Disclaimer</h1>

      <div className="mt-8 space-y-6 text-white/70">
        <p>
          ZERRA Prediction provides AI-generated football insights for
          informational and entertainment purposes only.
        </p>

        <p>
          No prediction, confidence score, value bet, or AI verdict should be
          treated as guaranteed financial advice or a guaranteed match result.
        </p>

        <p>
          Football outcomes are uncertain. Users are responsible for their own
          decisions and should never risk money they cannot afford to lose.
        </p>

        <p>
          Please follow your local laws and use prediction information
          responsibly.
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