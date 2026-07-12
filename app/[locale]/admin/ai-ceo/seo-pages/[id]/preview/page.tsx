"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

type DraftResponse = {
  success: boolean;
  draft?: SEOPageDraftItem;
  message?: string;
  error?: string;
};

type DraftAction = "approve" | "reject";

export default function SEOPagePreviewPage() {
  const params = useParams<{
    locale: string;
    id: string;
  }>();

  const locale = params?.locale || "en";
  const draftId = params?.id || "";

  const [draft, setDraft] =
    useState<SEOPageDraftItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] =
    useState<DraftAction | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDraft = useCallback(async () => {
    if (!draftId) return;

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

      const data = await parseResponse<DraftResponse>(
        response
      );

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
  }, [draftId]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  async function runDraftAction(
    action: DraftAction,
    body?: Record<string, unknown>
  ) {
    try {
      setActiveAction(action);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/ai-ceo/seo-pages/${encodeURIComponent(
          draftId
        )}/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body || {}),
        }
      );

      const data = await parseResponse<DraftResponse>(
        response
      );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Unable to ${action} SEO draft.`
        );
      }

      setMessage(
        data.message ||
          `SEO draft ${action}d successfully.`
      );

      await loadDraft();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Unable to ${action} SEO draft.`
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handleApprove() {
    const confirmed = window.confirm(
      "Approve this SEO draft?"
    );

    if (!confirmed) return;

    await runDraftAction("approve");
  }

  async function handleReject() {
    const reason = window.prompt(
      "Why do you want to reject this SEO draft?",
      "Needs more improvement"
    );

    if (reason === null) return;

    const cleanReason = reason.trim();

    if (!cleanReason) {
      window.alert("Please enter a rejection reason.");
      return;
    }

    await runDraftAction("reject", {
      reason: cleanReason,
    });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/50">
          Loading SEO page preview...
        </div>
      </main>
    );
  }

  if (error && !draft) {
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

  if (!draft) {
    return null;
  }

  const canEdit =
    draft.status !== "published";

  const canApprove =
    draft.status === "draft" ||
    draft.status === "rejected";

  const canReject =
    draft.status === "draft" ||
    draft.status === "approved";

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
          <StatusBadge status={draft.status}>
            {draft.status}
          </StatusBadge>

          <Badge>{draft.language}</Badge>

          {draft.country && (
            <Badge>{draft.country}</Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/25 bg-[#101827] p-6 shadow-xl md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Draft Preview
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              {draft.h1 || draft.title}
            </h1>

            <p className="mt-5 text-lg leading-8 text-white/65">
              {draft.intro}
            </p>
          </div>

          <div className="flex min-w-[220px] flex-col gap-3">
            {canEdit && (
              <Link
                href={`/${locale}/admin/ai-ceo/seo-pages/${encodeURIComponent(
                  draftId
                )}/edit`}
                className="flex items-center justify-center rounded-full border border-[#D4AF37]/40 px-5 py-3 text-sm font-black text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
              >
                Edit Draft
              </Link>
            )}

            {canApprove && (
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={activeAction !== null}
                className="rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === "approve"
                  ? "Approving..."
                  : "Approve Draft"}
              </button>
            )}

            {canReject && (
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={activeAction !== null}
                className="rounded-full border border-red-500/30 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === "reject"
                  ? "Rejecting..."
                  : "Reject Draft"}
              </button>
            )}

            {draft.status === "approved" && (
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center text-sm font-bold text-green-300">
                Ready for publishing workflow
              </div>
            )}

            {draft.status === "rejected" && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm font-bold text-red-300">
                This draft needs revision
              </div>
            )}

            {draft.status === "published" && (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-center text-sm font-bold text-blue-300">
                This page is published
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Info
            title="SEO Title"
            value={draft.title}
          />

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
        {(draft.sections || []).length === 0 ? (
          <EmptyState text="No content sections available." />
        ) : (
          (draft.sections || []).map(
            (section, index) => (
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
            )
          )
        )}
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

          {(draft.relatedKeywords || []).length === 0 ? (
            <p className="mt-4 text-sm text-white/40">
              No related keywords added.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {(draft.relatedKeywords || []).map(
                (keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/60"
                  >
                    {keyword}
                  </span>
                )
              )}
            </div>
          )}
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
        This is a private draft preview. It is not publicly
        published and Google cannot index it until the publishing
        workflow is completed.
      </div>
    </main>
  );
}

async function parseResponse<T>(
  response: Response
): Promise<T> {
  const raw = await response.text();

  if (!raw) {
    throw new Error(
      `The server returned an empty response. HTTP ${response.status}`
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Invalid server response: ${raw.slice(0, 200)}`
    );
  }
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-black uppercase text-[#D4AF37]">
      {children}
    </span>
  );
}

function StatusBadge({
  children,
  status,
}: {
  children: React.ReactNode;
  status: SEOPageDraftItem["status"];
}) {
  const classes = {
    draft:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    approved:
      "border-green-500/30 bg-green-500/10 text-green-300",
    published:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",
    rejected:
      "border-red-500/30 bg-red-500/10 text-red-300",
    failed:
      "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${classes[status]}`}
    >
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-8 text-center text-sm text-white/40">
      {text}
    </div>
  );
}