import Link from "next/link";
import { Locale } from "@/lib/i18n";
export function Navbar({ locale, dict }: { locale: Locale; dict: any }) {
  const langs = ["en","fr","es","ar"];
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-night/80 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
      <Link href={`/${locale}`} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold text-xl font-black text-night">Z</span><span className="text-xl font-black tracking-wide">ZERRA <span className="gold-text">Prediction</span></span></Link>
      <nav className="hidden gap-7 md:flex"><Link href={`/${locale}`}>{dict.nav.home}</Link><Link href={`/${locale}/predictions`}>{dict.nav.predictions}</Link><Link href={`/${locale}/vip`}>{dict.nav.vip}</Link><Link href={`/${locale}/login`}>{dict.nav.login}</Link></nav>
      <div className="flex gap-2">{langs.map(l => <Link key={l} className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase hover:border-gold" href={`/${l}`}>{l}</Link>)}</div>
    </div>
  </header>
}
