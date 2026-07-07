import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/en" },
  { label: "Dashboard", href: "/en/dashboard" },
  { label: "Predictions", href: "/en/predictions" },
  { label: "VIP", href: "/en/vip" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-white md:px-6">
        <Link href="/en" className="flex flex-col">
          <span className="text-xl font-black tracking-wider text-[#D4AF37]">
            ZERRA
          </span>
          <span className="text-xs text-white/50">AI Football Prediction</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-white/70 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-[#D4AF37]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/en/login"
            className="hidden text-sm font-bold text-white/60 transition hover:text-white md:block"
          >
            Login
          </Link>

          <Link
            href="/en/vip"
            className="rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-black text-black transition hover:scale-105"
          >
            Go VIP
          </Link>
        </div>
      </div>
    </header>
  );
}