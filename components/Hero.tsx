import Link from "next/link";
import { Locale } from "@/lib/i18n";
export function Hero({ locale, dict }: { locale: Locale; dict: any }) {
  return <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
    <div><p className="mb-5 inline-flex rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm text-gold">{dict.hero.eyebrow}</p>
      <h1 className="text-5xl font-black leading-tight md:text-7xl"><span className="gold-text">ZERRA</span><br />{dict.hero.title}</h1>
      <p className="mt-6 max-w-2xl text-lg text-white/65">{dict.hero.subtitle}</p>
      <div className="mt-8 flex flex-wrap gap-4"><Link className="rounded-2xl bg-gold px-6 py-4 font-bold text-night" href={`/${locale}/predictions`}>{dict.hero.cta}</Link><Link className="rounded-2xl border border-white/15 px-6 py-4 font-bold" href={`/${locale}/vip`}>{dict.hero.vip}</Link></div>
    </div>
    <div className="glass rounded-[2rem] p-6"><div className="rounded-[1.5rem] bg-black/30 p-6"><p className="text-white/60">Live AI Signal</p><h2 className="mt-3 text-4xl font-black gold-text">92.4%</h2><p className="mt-3 text-white/70">Cross-sport model confidence based on form, trends, injuries, H2H and recent performance.</p><div className="mt-8 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-white/10 p-4"><b>10</b><p className="text-xs text-white/55">Sports</p></div><div className="rounded-2xl bg-white/10 p-4"><b>4</b><p className="text-xs text-white/55">Languages</p></div><div className="rounded-2xl bg-white/10 p-4"><b>VIP</b><p className="text-xs text-white/55">Analytics</p></div></div></div></div>
  </section>
}
