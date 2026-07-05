export function PredictionCard({ p }: { p: any }) {
  return <article className="glass rounded-3xl p-5 shadow-glow">
    <div className="mb-4 flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{p.sport} • {p.league}</span><span className={p.vip ? "rounded-full bg-gold px-3 py-1 text-xs font-bold text-night" : "rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-200"}>{p.vip ? "VIP" : "FREE"}</span></div>
    <h3 className="text-xl font-bold">{p.teams}</h3><p className="mt-1 text-white/60">Kickoff: {p.time}</p>
    <div className="mt-5 rounded-2xl bg-black/30 p-4"><p className="text-sm text-white/60">AI Best Pick</p><p className="text-2xl font-black gold-text">{p.pick}</p></div>
    <div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>Confidence</span><b>{p.confidence}%</b></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gold" style={{ width: `${p.confidence}%` }} /></div></div>
  </article>
}
