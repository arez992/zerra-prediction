import Link from "next/link";

import LearningDashboard from "@/components/admin/learning/LearningDashboard";
import LearningHistory from "@/components/admin/learning/LearningHistory";
import PredictionCalibrationDashboard from "@/components/admin/PredictionCalibrationDashboard";

export default function AdminLearningPage() {
  return (
    <main className="px-5 py-8 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Link
              href="/en/admin"
              className="text-sm font-black text-[#D4AF37]"
            >
              ← Back to Admin
            </Link>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Model Intelligence
            </p>

            <h1 className="mt-3 text-3xl font-black md:text-5xl">
              Learning & Calibration
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50 md:text-base">
              Analyze settled prediction performance, calibration,
              learning history, confidence quality, and model behavior
              without automatically modifying the production prediction
              model.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-5 py-3 text-xs font-black text-[#D4AF37]">
            Read-Only Intelligence
          </div>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <WorkspaceCard
            title="Prediction Operations"
            description="Generate, review, publish, and manage predictions."
            href="/en/admin/predictions"
          />

          <WorkspaceCard
            title="Today's Matches"
            description="View today's fixtures and generate individual predictions."
            href="/en/admin/matches"
          />

          <WorkspaceCard
            title="AI CEO"
            description="Return to executive decisions and strategic intelligence."
            href="/en/admin/ai-ceo"
          />
        </section>

        <section className="mt-10">
          <LearningDashboard />
        </section>

        <section className="mt-10">
          <PredictionCalibrationDashboard />
        </section>

        <section className="mt-10">
          <LearningHistory />
        </section>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
            Safety Architecture
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Human-Controlled Model Learning
          </h2>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">
            Learning and calibration analytics are used to understand
            prediction performance and identify model weaknesses.
            This workspace does not automatically change model weights,
            prediction rules, market thresholds, or deploy a new model.
            Production model changes remain controlled and reviewable.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SafetyItem
              title="Analytics"
              value="Read Only"
            />

            <SafetyItem
              title="Model Changes"
              value="Manual"
            />

            <SafetyItem
              title="Deployment"
              value="Controlled"
            />

            <SafetyItem
              title="Approval"
              value="Human Required"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function WorkspaceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.7rem] border border-white/10 bg-[#101827] p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/40"
    >
      <p className="font-black text-white/80">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/40">
        {description}
      </p>

      <p className="mt-4 text-xs font-black text-[#D4AF37]">
        Open →
      </p>
    </Link>
  );
}

function SafetyItem({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
        {title}
      </p>

      <p className="mt-2 font-black text-white/75">
        {value}
      </p>
    </div>
  );
}