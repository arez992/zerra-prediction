"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  SEOPageDraftItem,
  SEOPageFAQItem,
  SEOPageSectionItem,
} from "@/lib/ai-ceo/client";

type DraftResponse = {
  success: boolean;
  draft?: SEOPageDraftItem;
  error?: string;
};

type UpdateDraftResponse = {
  success: boolean;
  message?: string;
  draft?: SEOPageDraftItem;
  error?: string;
};

type EditorState = {
  title: string;
  metaDescription: string;
  slug: string;
  h1: string;
  intro: string;
  schemaType: string;
  sections: SEOPageSectionItem[];
  faq: SEOPageFAQItem[];
  internalLinksText: string;
  relatedKeywordsText: string;
};

const emptyEditorState: EditorState = {
  title: "",
  metaDescription: "",
  slug: "",
  h1: "",
  intro: "",
  schemaType: "WebPage",
  sections: [],
  faq: [],
  internalLinksText: "",
  relatedKeywordsText: "",
};

export default function SEOPageDraftEditPage() {
  const params = useParams<{
    locale: string;
    id: string;
  }>();

  const router = useRouter();

  const locale = params?.locale || "en";
  const draftId = params?.id || "";

  const [draft, setDraft] =
    useState<SEOPageDraftItem | null>(null);

  const [form, setForm] =
    useState<EditorState>(emptyEditorState);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const previewHref = `/${locale}/admin/ai-ceo/seo-pages/${encodeURIComponent(
    draftId
  )}/preview`;

  const canonicalPreview = useMemo(() => {
    const cleanSlug = form.slug
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) return "—";

    const pageLocale =
      draft?.language === "ku" ? "ku" : "en";

    return `/${pageLocale}/predictions/${cleanSlug}`;
  }, [draft?.language, form.slug]);

  useEffect(() => {
    async function loadDraft() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

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

        const data =
          await parseResponse<DraftResponse>(response);

        if (!response.ok || !data.success || !data.draft) {
          throw new Error(
            data.error || "Unable to load SEO draft."
          );
        }

        const loadedDraft = data.draft;

        setDraft(loadedDraft);

        setForm({
          title: loadedDraft.title || "",
          metaDescription:
            loadedDraft.metaDescription || "",
          slug: loadedDraft.slug || "",
          h1: loadedDraft.h1 || "",
          intro: loadedDraft.intro || "",
          schemaType:
            loadedDraft.schemaType || "WebPage",
          sections: loadedDraft.sections || [],
          faq: loadedDraft.faq || [],
          internalLinksText:
            loadedDraft.internalLinks?.join("\n") || "",
          relatedKeywordsText:
            loadedDraft.relatedKeywords?.join("\n") || "",
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load SEO draft."
        );
      } finally {
        setLoading(false);
      }
    }

    if (draftId) {
      void loadDraft();
    }
  }, [draftId]);

  function updateField<K extends keyof EditorState>(
    key: K,
    value: EditorState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function addSection() {
    setForm((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          heading: "",
          content: "",
        },
      ],
    }));
  }

  function updateSection(
    index: number,
    field: keyof SEOPageSectionItem,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, itemIndex) =>
        itemIndex === index
          ? {
              ...section,
              [field]: value,
            }
          : section
      ),
    }));
  }

  function removeSection(index: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function addFAQ() {
    setForm((current) => ({
      ...current,
      faq: [
        ...current.faq,
        {
          question: "",
          answer: "",
        },
      ],
    }));
  }

  function updateFAQ(
    index: number,
    field: keyof SEOPageFAQItem,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      faq: current.faq.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  }

  function removeFAQ(index: number) {
    setForm((current) => ({
      ...current,
      faq: current.faq.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/ai-ceo/seo-pages/${encodeURIComponent(
          draftId
        )}/update`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: form.title,
            metaDescription: form.metaDescription,
            slug: form.slug,
            h1: form.h1,
            intro: form.intro,
            schemaType: form.schemaType,

            sections: form.sections
              .map((section) => ({
                heading: section.heading.trim(),
                content: section.content.trim(),
              }))
              .filter(
                (section) =>
                  section.heading && section.content
              ),

            faq: form.faq
              .map((item) => ({
                question: item.question.trim(),
                answer: item.answer.trim(),
              }))
              .filter(
                (item) => item.question && item.answer
              ),

            internalLinks: splitLines(
              form.internalLinksText
            ),

            relatedKeywords: splitLines(
              form.relatedKeywordsText
            ),
          }),
        }
      );

      const data =
        await parseResponse<UpdateDraftResponse>(
          response
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to update SEO draft."
        );
      }

      setMessage(
        data.message ||
          "SEO draft updated successfully."
      );

      if (data.draft) {
        setDraft(data.draft);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update SEO draft."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-12 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/50">
          Loading SEO draft editor...
        </div>
      </main>
    );
  }

  if (error && !draft) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-12 text-white">
        <Link
          href={`/${locale}/admin/ai-ceo`}
          className="text-sm font-bold text-[#D4AF37]"
        >
          ← Back to AI CEO
        </Link>

        <div className="mt-8 rounded-[2rem] border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={previewHref}
          className="text-sm font-bold text-[#D4AF37]"
        >
          ← Back to Preview
        </Link>

        <div className="flex flex-wrap gap-2">
          <StatusBadge>
            {draft?.status || "draft"}
          </StatusBadge>

          <StatusBadge>
            {draft?.language || "en"}
          </StatusBadge>

          {draft?.country && (
            <StatusBadge>{draft.country}</StatusBadge>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
          SEO Draft Editor
        </p>

        <h1 className="mt-4 text-4xl font-black">
          Edit SEO Draft
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/55">
          Edit the SEO metadata, page content, FAQ,
          internal links, and structured-data type before
          approval and publishing.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Info
            title="Draft ID"
            value={draftId || "—"}
          />

          <Info
            title="Canonical Preview"
            value={canonicalPreview}
          />
        </div>
      </section>

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

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-8"
      >
        <EditorSection title="SEO Metadata">
          <div className="grid gap-5">
            <TextInput
              label="SEO Title"
              value={form.title}
              onChange={(value) =>
                updateField("title", value)
              }
              maxLength={180}
              required
            />

            <TextArea
              label="Meta Description"
              value={form.metaDescription}
              onChange={(value) =>
                updateField(
                  "metaDescription",
                  value
                )
              }
              maxLength={320}
              rows={4}
              required
            />

            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Slug"
                value={form.slug}
                onChange={(value) =>
                  updateField("slug", value)
                }
                maxLength={120}
                required
              />

              <SelectInput
                label="Schema Type"
                value={form.schemaType}
                onChange={(value) =>
                  updateField("schemaType", value)
                }
                options={[
                  "WebPage",
                  "Article",
                  "SportsEvent",
                  "FAQPage",
                ]}
              />
            </div>
          </div>
        </EditorSection>

        <EditorSection title="Main Content">
          <div className="grid gap-5">
            <TextInput
              label="H1"
              value={form.h1}
              onChange={(value) =>
                updateField("h1", value)
              }
              maxLength={200}
              required
            />

            <TextArea
              label="Introduction"
              value={form.intro}
              onChange={(value) =>
                updateField("intro", value)
              }
              maxLength={5000}
              rows={8}
            />
          </div>
        </EditorSection>

        <EditorSection
          title="Content Sections"
          action={
            <button
              type="button"
              onClick={addSection}
              className="rounded-full border border-[#D4AF37]/40 px-4 py-2 text-sm font-black text-[#D4AF37]"
            >
              + Add Section
            </button>
          }
        >
          {form.sections.length === 0 ? (
            <EmptyState text="No content sections added." />
          ) : (
            <div className="space-y-5">
              {form.sections.map(
                (section, index) => (
                  <div
                    key={`section-${index}`}
                    className="rounded-3xl bg-black/25 p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-black text-[#D4AF37]">
                        Section {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeSection(index)
                        }
                        className="text-sm font-bold text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <TextInput
                        label="Heading"
                        value={section.heading}
                        onChange={(value) =>
                          updateSection(
                            index,
                            "heading",
                            value
                          )
                        }
                        maxLength={180}
                      />

                      <TextArea
                        label="Content"
                        value={section.content}
                        onChange={(value) =>
                          updateSection(
                            index,
                            "content",
                            value
                          )
                        }
                        maxLength={8000}
                        rows={8}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </EditorSection>

        <EditorSection
          title="Frequently Asked Questions"
          action={
            <button
              type="button"
              onClick={addFAQ}
              className="rounded-full border border-[#D4AF37]/40 px-4 py-2 text-sm font-black text-[#D4AF37]"
            >
              + Add FAQ
            </button>
          }
        >
          {form.faq.length === 0 ? (
            <EmptyState text="No FAQ items added." />
          ) : (
            <div className="space-y-5">
              {form.faq.map((item, index) => (
                <div
                  key={`faq-${index}`}
                  className="rounded-3xl bg-black/25 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black text-[#D4AF37]">
                      FAQ {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeFAQ(index)}
                      className="text-sm font-bold text-red-300"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <TextInput
                      label="Question"
                      value={item.question}
                      onChange={(value) =>
                        updateFAQ(
                          index,
                          "question",
                          value
                        )
                      }
                      maxLength={300}
                    />

                    <TextArea
                      label="Answer"
                      value={item.answer}
                      onChange={(value) =>
                        updateFAQ(
                          index,
                          "answer",
                          value
                        )
                      }
                      maxLength={3000}
                      rows={5}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </EditorSection>

        <EditorSection title="Links and Keywords">
          <div className="grid gap-5 lg:grid-cols-2">
            <TextArea
              label="Internal Links"
              helperText="Add one internal link per line."
              value={form.internalLinksText}
              onChange={(value) =>
                updateField(
                  "internalLinksText",
                  value
                )
              }
              rows={8}
            />

            <TextArea
              label="Related Keywords"
              helperText="Add one related keyword per line."
              value={form.relatedKeywordsText}
              onChange={(value) =>
                updateField(
                  "relatedKeywordsText",
                  value
                )
              }
              rows={8}
            />
          </div>
        </EditorSection>

        <div className="sticky bottom-4 flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-[#101827]/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            Editing an approved draft returns it to draft
            status for another review.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={previewHref}
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-black"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#D4AF37] px-7 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving Changes..."
                : "Save Changes"}
            </button>

            {message && (
              <button
                type="button"
                onClick={() =>
                  router.push(previewHref)
                }
                className="rounded-full border border-green-500/30 px-6 py-3 text-sm font-black text-green-300"
              >
                View Preview
              </button>
            )}
          </div>
        </div>
      </form>
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

function splitLines(value: string) {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function EditorSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-black">
          {title}
        </h2>

        {action}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  maxLength,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-white/65">
          {label}
        </span>

        {maxLength && (
          <span className="text-xs text-white/30">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      <input
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-[#D4AF37]/50"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  maxLength,
  required = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  maxLength?: number;
  required?: boolean;
  helperText?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-white/65">
          {label}
        </span>

        {maxLength && (
          <span className="text-xs text-white/30">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {helperText && (
        <p className="mb-3 text-xs text-white/35">
          {helperText}
        </p>
      )}

      <textarea
        value={value}
        required={required}
        rows={rows}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 leading-7 text-white outline-none placeholder:text-white/25 focus:border-[#D4AF37]/50"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white/65">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({
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

      <p className="mt-3 break-all text-sm font-bold text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-black/20 p-7 text-center text-sm text-white/40">
      {text}
    </div>
  );
}