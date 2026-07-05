import { Hero } from "@/components/Hero";
import { PredictionCard } from "@/components/PredictionCard";
import { predictions, sports } from "@/data/predictions";
import { getDictionary, Locale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return <main>
    <Hero locale={locale} dict={dict} />
    <section className="mx-auto max-w-7xl px-5 py-10"><div className="mb-8 flex items-end justify-between"><div><p className="text-gold">Premium analytics</p><h2 className="text-3xl font-black md:text-5xl">{dict.sections.today}</h2></div><span className="hidden text-white/50 md:block">Auto API-ready match feed</span></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{predictions.map((p) => <PredictionCard key={p.teams} p={p} />)}</div></section>
    <section className="mx-auto max-w-7xl px-5 py-14"><h2 className="text-3xl font-black md:text-5xl">{dict.sections.sports}</h2><div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-5">{sports.map(s => <div key={s} className="glass rounded-2xl p-5 text-center font-bold">{s}</div>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 py-14"><div className="glass rounded-[2rem] p-8 md:p-12"><p className="text-gold">{dict.sections.vip}</p><h2 className="mt-2 text-4xl font-black">Weekly, Monthly, Quarterly and Yearly VIP</h2><p className="mt-4 max-w-2xl text-white/65">USDT TRC20 payment flow, premium predictions, confidence scores, AI summaries and advanced sports coverage.</p></div></section>
    <footer className="mx-auto max-w-7xl px-5 py-10 text-sm text-white/50">{dict.disclaimer}</footer>
  </main>;
}
