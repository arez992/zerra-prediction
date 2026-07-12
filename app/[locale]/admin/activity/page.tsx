"use client";

import Link from "next/link";

import SEOAuditLogCard from "@/components/admin/ceo/SEOAuditLogCard";

export default function AdminActivityPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link
        href="/en/admin"
        className="text-sm font-bold text-[#D4AF37]"
      >
        ← Back to Admin
      </Link>

      <div className="mt-6">
        <h1 className="text-5xl font-black">Activity Log</h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/60">
          Review SEO publishing, approvals, edits,
          unpublishing, and rollback activity.
        </p>
      </div>

      <div className="mt-10">
        <SEOAuditLogCard
          title="Complete SEO Activity"
          description="A detailed administrator audit trail for the SEO publishing workflow."
          pageSize={25}
          showActivityLink={false}
        />
      </div>
    </main>
  );
}
