"use client";

import Link from "next/link";

export default function SEOQualityDashboardEntry() {
  return (
    <section className="rounded-[2rem] border border-[#D4AF37]/20 bg-gradient-to-br from-[#101827] to-[#0A1220] p-6 shadow-2xl shadow-black/20 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            SEO Director Intelligence
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            SEO Quality Dashboard
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
            Review SEO quality scores, publish readiness,
            duplicate risk, schema validation, internal links,
            and editorial status across every SEO draft.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/en/admin/ai-ceo/seo-dashboard"
            className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110"
          >
            Open SEO Dashboard
          </Link>

          <Link
            href="/en/admin/ai-ceo/seo-pages"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white/75 transition hover:border-[#D4AF37]/45 hover:text-white"
          >
            SEO Drafts
          </Link>
        </div>
      </div>
    </section>
  );
}