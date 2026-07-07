import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-14 text-white">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
        Legal
      </p>

      <h1 className="mt-4 text-5xl font-black">Privacy Policy</h1>

      <div className="mt-8 space-y-6 text-white/70">
        <p>
          ZERRA Prediction respects user privacy and only collects information
          needed to provide account access, VIP payments, and platform services.
        </p>

        <p>
          Payment processing is handled by third-party providers such as
          NOWPayments. ZERRA does not store private payment credentials.
        </p>

        <p>
          We may use basic analytics and technical data to improve performance,
          security, and user experience.
        </p>

        <p>
          By using ZERRA, you agree that your account and usage data may be used
          to provide and improve our AI football prediction services.
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