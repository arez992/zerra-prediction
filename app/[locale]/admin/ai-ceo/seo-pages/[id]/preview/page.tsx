"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

type DraftResponse = {
  success: boolean;
  draft?: SEOPageDraftItem;
  error?: string;
};

export default function SEOPagePreviewPage() {
  const params = useParams<{
    locale: string;
    id: string;
  }>();

  const locale = params.locale || "en";
  const draftId = params.id;

  const [draft, setDraft] =
    useState<SEOPageDraftItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDraft() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/ai-ceo/seo-pages/${encodeURIComponent(
            draftId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        const raw = await response.text();

        let data: DraftResponse;

        try {
          data = JSON.parse(raw) as DraftResponse;
        } catch {
          throw new Error(
            `Invalid server response: ${raw.slice(0, 200)}`
          );
        }

        if (!response.ok || !data.success || !data.draft) {
          throw new Error(
            data.error || "Unable to load SEO page draft."
          );
        }

        setDraft(data.draft);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load SEO page draft."
        );
      } finally {
        setLoading(false);
      }
    }

    if (draftId) {
      void loadDraft();
    }
  }, [draftId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/50">
          Loading SEO page preview...
        </div>
      </main>
    );
  }

  if (error || !draft) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12 text-white">
        <Link
          href={`/${locale}/admin/ai-ceo`}
          className="text-sm font-bold text-[#D4AF37]"
        >
          ← Back to AI CEO
        </Link>

        <div className="mt-8 rounded-[2rem] border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          {error || "SEO page draft was not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/${locale}/admin/ai-ceo`}
          className="text-sm font-bold text-[#D4AF37]"
        >
          ← Back to AI CEO
        </Link>

        <div className="flex flex-wrap gap-2">
          <Badge>{draft.status}</Badge>
          <Badge>{draft.language}</Badge>

          {draft.country && <Badge>{draft.country}</Badge>}
        </div>
      </div>

      <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/25 bg-[#101827] p-6 shadow-xl md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          Draft Preview
        </p>

        <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
          {draft.h1 || draft.title}
        </h1>

        <p className="mt-5 text-lg leading-8 text-white/65">
          {draft.intro}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Info title="SEO Title" value={draft.title} />

          <Info
            title="Meta Description"
            value={draft.metaDescription}
          />

          <Info
            title="Canonical Path"
            value={draft.canonicalPath}
          />

          <Info
            title="Schema Type"
            value={draft.schemaType || "WebPage"}
          />
        </div>
      </section>

      <section className="mt-8 space-y-6">
        {(draft.sections || []).map((section, index) => (
          <article
            key={`${section.heading}-${index}`}
            className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8"
          >
            <h2 className="text-2xl font-black">
              {section.heading}
            </h2>

            <p className="mt-4 whitespace-pre-line leading-8 text-white/65">
              {section.content}
            </p>
          </article>
        ))}
      </section>

      {(draft.faq || []).length > 0 && (
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            FAQ
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Frequently Asked Questions
          </h2>

          <div className="mt-6 space-y-4">
            {(draft.faq || []).map((item, index) => (
              <article
                key={`${item.question}-${index}`}
                className="rounded-3xl bg-black/25 p-5"
              >
                <h3 className="text-lg font-black">
                  {item.question}
                </h3>

                <p className="mt-3 leading-7 text-white/60">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6">
          <h2 className="text-xl font-black">
            Internal Links
          </h2>

          {(draft.internalLinks || []).length === 0 ? (
            <p className="mt-4 text-sm text-white/40">
              No internal links added.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(draft.internalLinks || []).map((link) => (
                <li
                  key={link}
                  className="break-all rounded-2xl bg-black/25 p-3 text-sm text-[#D4AF37]"
                >
                  {link}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6">
          <h2 className="text-xl font-black">
            Related Keywords
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {(draft.relatedKeywords || []).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/60"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6">
        <h2 className="text-xl font-black">
          Safety Guardrails
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Guardrail
            title="People-first content"
            active={
              draft.guardrails?.peopleFirstContent === true
            }
          />

          <Guardrail
            title="Unique helpful content"
            active={
              draft.guardrails?.uniqueHelpfulContent === true
            }
          />

          <Guardrail
            title="Duplicate checked"
            active={
              draft.guardrails?.duplicateChecked === true
            }
          />

          <Guardrail
            title="Human approval required"
            active={
              draft.guardrails?.humanApprovalRequired === true
            }
          />

          <Guardrail
            title="Auto publish disabled"
            active={
              draft.guardrails?.autoPublishDisabled === true
            }
          />
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-sm leading-7 text-yellow-200/80">
        This is a private draft preview. It is not publicly published
        and Google cannot index it until the publishing workflow is
        approved.
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-black uppercase text-[#D4AF37]">
      {children}
    </span>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl bg-black/25 p-5">
      <p className="text-xs uppercase text-white/40">
        {title}
      </p>

      <p className="mt-3 break-words leading-7 text-white/75">
        {value}
      </p>
    </div>
  );
}

function Guardrail({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) {
  return (
    <div className="rounded-2xl bg-black/25 p-4 text-sm text-white/65">
      {active ? "✅" : "❌"} {title}
    </div>
  );
}