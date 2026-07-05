import Link from "next/link";

export default function Navbar() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-white">
      <Link href="/en" className="font-black text-[#D4AF37]">
        ZERRA Prediction
      </Link>

      <nav className="flex gap-5 text-sm">
        <Link href="/en">Home</Link>
        <Link href="/en/predictions">Predictions</Link>
        <Link href="/en/vip">VIP</Link>
        <Link href="/en/login">Login</Link>
        <Link href="/en/register">Register</Link>
      </nav>
    </header>
  );
}