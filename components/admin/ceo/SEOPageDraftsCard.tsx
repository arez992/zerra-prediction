"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

type Props = {
  drafts: SEOPageDraftItem[];
  loading: boolean;
  creating: boolean;
  onRefresh: () => void;
  onCreate: (input: {
    keyword: string;
    language: "en" | "ku";
    country?: string;
  }) => void | Promise<void>;
};

export default function SEOPageDraftsCard({
  drafts,
  loading,
  creating,
  onRefresh,
  onCreate,
}: Props) {
  const params = useParams<{
    locale?: string;
  }>();

  const locale = params?.locale || "en";

  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] =
    useState<"en" | "ku">("en");
  const [country, setCountry] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanKeyword = keyword.trim();
    const cleanCountry = country.trim();

    if (!cleanKeyword) {
      window.alert("Please enter an SEO keyword.");
      return;
    }

    await onCreate({
      keyword: cleanKeyword,
      language,
      country: cleanCountry || undefined,
    });

    setKeyword("");
    setCountry("");
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            AI Page Builder
          </p>

          <h2 className="mt-3 text-3xl font-black">
            SEO Page Drafts
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">
            Create people-first SEO page drafts with metadata,
            headings, FAQ, internal links, duplicate protection,
            editing, approval, and private preview.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || creating}
          className="rounded-full border border-white/15 px-5 py-3 text-sm font-black transition hover:border-[#D4AF37]/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Drafts"}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-4 rounded-3xl bg-black/25 p-5 lg:grid-cols-[1fr_160px_180px_auto]"
      >
        <input
          type="text"
          value={keyword}
          disabled={creating}
          onChange={(event) =>
            setKeyword(event.target.value)
          }
          placeholder="Example: Liverpool vs Arsenal prediction"
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/50 disabled:opacity-50"
        />

        <select
          value={language}
          disabled={creating}
          onChange={(event) =>
            setLanguage(
              event.target.value === "ku"
                ? "ku"
                : "en"
            )
          }
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50 disabled:opacity-50"
        >
          <option value="en">English</option>
          <option value="ku">Kurdish</option>
        </select>

        <input
          type="text"
          value={country}
          disabled={creating}
          onChange={(event) =>
            setCountry(event.target.value)
          }
          placeholder="Country (optional)"
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/50 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={creating || !keyword.trim()}
          className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Draft"}
        </button>
      </form>

      {loading && drafts.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-black/20 p-8 text-center text-white/45">
          Loading SEO drafts...
        </div>
      ) : drafts.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-black/20 p-8 text-center">
          <div className="text-4xl">📄</div>

          <h3 className="mt-4 text-xl font-black">
            No SEO Drafts Yet
          </h3>

          <p className="mt-2 text-sm text-white/40">
            Enter a keyword above and click Create Draft.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {drafts.map((draft) => {
            const previewHref =
              `/${locale}/admin/ai-ceo/seo-pages/` +
              `${encodeURIComponent(draft.id)}/preview`;

            const editHref =
              `/${locale}/admin/ai-ceo/seo-pages/` +
              `${encodeURIComponent(draft.id)}/edit`;

            return (
              <article
                key={draft.id}
                className="rounded-3xl border border-white/5 bg-black/25 p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={draft.status}>
                        {draft.status || "draft"}
                      </StatusBadge>

                      <Badge>
                        {draft.language || "en"}
                      </Badge>

                      {draft.country && (
                        <Badge>{draft.country}</Badge>
                      )}
                    </div>

                    <h3 className="mt-4 text-xl font-black">
                      {draft.title || draft.keyword}
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-white/55">
                      {draft.metaDescription ||
                        "No meta description."}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Info
                        title="Keyword"
                        value={draft.keyword || "—"}
                      />

                      <Info
                        title="Canonical Path"
                        value={
                          draft.canonicalPath || "—"
                        }
                      />

                      <Info
                        title="Slug"
                        value={draft.slug || "—"}
                      />

                      <Info
                        title="Schema"
                        value={
                          draft.schemaType || "—"
                        }
                      />
                    </div>
                  </div>

                  <div className="min-w-[230px]">
                    <div className="rounded-2xl bg-black/30 p-4">
                      <p className="text-xs uppercase text-white/40">
                        Guardrails
                      </p>

                      <div className="mt-3 space-y-2 text-sm text-white/65">
                        <p>
                          {draft.guardrails
                            ?.peopleFirstContent
                            ? "✅"
                            : "❌"}{" "}
                          People-first
                        </p>

                        <p>
                          {draft.guardrails
                            ?.duplicateChecked
                            ? "✅"
                            : "❌"}{" "}
                          Duplicate checked
                        </p>

                        <p>
                          {draft.guardrails
                            ?.humanApprovalRequired
                            ? "✅"
                            : "❌"}{" "}
                          Human approval
                        </p>

                        <p>
                          {draft.guardrails
                            ?.autoPublishDisabled
                            ? "✅"
                            : "❌"}{" "}
                          Auto publish disabled
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <Link
                        href={previewHref}
                        className="flex items-center justify-center rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:brightness-110"
                      >
                        Preview Page
                      </Link>

                      {draft.status !== "published" && (
                        <Link
                          href={editHref}
                          className="flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:border-[#D4AF37]/50 hover:text-[#D4AF37]"
                        >
                          Edit Draft
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 text-xs text-white/35">
                  Created: {formatDate(draft.createdAt)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase text-white/55">
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
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs uppercase text-white/40">
        {title}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}