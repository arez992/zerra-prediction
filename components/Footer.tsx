import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#050816] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-4">
        <div>
          <h2 className="text-2xl font-black text-[#D4AF37]">ZERRA</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            AI football prediction platform with premium insights, confidence
            scores, risk analysis, and VIP picks.
          </p>
        </div>

        <div>
          <p className="font-black text-white">Platform</p>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            <Link href="/en/dashboard">Dashboard</Link>
            <Link href="/en/predictions">Predictions</Link>
            <Link href="/en/vip">VIP</Link>
          </div>
        </div>

        <div>
          <p className="font-black text-white">Account</p>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            <Link href="/en/login">Login</Link>
            <Link href="/en/register">Register</Link>
          </div>
        </div>

        <div>
          <p className="font-black text-white">Legal</p>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            <Link href="/en/terms">Terms</Link>
            <Link href="/en/privacy">Privacy</Link>
            <Link href="/en/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-5 text-center text-sm text-white/40">
        © {new Date().getFullYear()} ZERRA Prediction. All rights reserved.
      </div>
    </footer>
  );
}