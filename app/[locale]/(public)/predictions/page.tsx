import { PredictionCard } from "@/components/PredictionCard";
import { predictions } from "@/data/predictions";
export default function PredictionsPage(){return <main className="mx-auto max-w-7xl px-5 py-14"><p className="text-gold">ZERRA Prediction</p><h1 className="text-5xl font-black">Predictions</h1><p className="mt-4 max-w-2xl text-white/60">Multi-sport AI picks with confidence scores. VIP cards are locked until subscription activation.</p><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{predictions.map(p=><PredictionCard key={p.teams} p={p}/>)}</div></main>}
