"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

type SEOPageSection = {
  heading: string;
  content: string;
};

type SEOFAQItem = {
  question: string;
  answer: string;
};

type DraftResponse = {
  success: boolean;
  draft?: SEOPageDraftItem;
  message?: string;
  versionId?: string;
  error?: string;
};

type EditorForm = {
  title: string;
  metaDescription: string;
  slug: string;
  canonicalPath: string;
  h1: string;
  intro: string;
  sections: SEOPageSection[];
  faq: SEOFAQItem[];
  internalLinks: string[];
  relatedKeywords: string[];
  schemaType: string;
};

const EMPTY_SECTION: SEOPageSection = {
  heading: "",
  content: "",
};

const EMPTY_FAQ: SEOFAQItem = {
  question: "",
  answer: "",
};

function normalizeList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function toTextList(value: string[]): string {
  return value.join("\n");
}

function createForm(
  draft: SEOPageDraftItem
): EditorForm {
  return {
    title: draft.title || "",
    metaDescription:
      draft.metaDescription || "",
    slug: draft.slug || "",
    canonicalPath:
      draft.canonicalPath || "",
    h1: draft.h1 || "",
    intro: draft.intro || "",
    sections:
      Array.isArray(draft.sections) &&
      draft.sections.length > 0
        ? draft.sections.map((item) => ({
            heading: item.heading || "",
            content: item.content || "",
          }))
        : [{ ...EMPTY_SECTION }],
    faq:
      Array.isArray(draft.faq) &&
      draft.faq.length > 0
        ? draft.faq.map((item) => ({
            question: item.question || "",
            answer: item.answer || "",
          }))
        : [{ ...EMPTY_FAQ }],
    internalLinks: Array.isArray(
      draft.internalLinks
    )
      ? draft.internalLinks
      : [],
    relatedKeywords: Array.isArray(
      draft.relatedKeywords
    )
      ? draft.relatedKeywords
      : [],
    schemaType:
      draft.schemaType || "WebPage",
  };
}

function cleanSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function stableSerialize(
  form: EditorForm
): string {
  return JSON.stringify(form);
}

export default function SEOPageEditPage() {
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
    useState<EditorForm | null>(null);

  const [initialSnapshot, setInitialSnapshot] =
    useState("");

  const [internalLinksText, setInternalLinksText] =
    useState("");

  const [
    relatedKeywordsText,
    setRelatedKeywordsText,
  ] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const previewPath = useMemo(
    () =>
      `/${locale}/admin/seo/pages/${encodeURIComponent(
        draftId
      )}/preview`,
    [locale, draftId]
  );

  const currentCanonicalPath = useMemo(() => {
    if (!form) return "";

    const language =
      draft?.language === "ku" ? "ku" : "en";

    return `/${language}/predictions/${cleanSlug(
      form.slug
    )}`;
  }, [form, draft]);

  const hasUnsavedChanges = useMemo(() => {
    if (!form || !initialSnapshot) {
      return false;
    }

    const currentForm: EditorForm = {
      ...form,
      canonicalPath: currentCanonicalPath,
      internalLinks:
        normalizeList(internalLinksText),
      relatedKeywords:
        normalizeList(relatedKeywordsText),
    };

    return (
      stableSerialize(currentForm) !==
      initialSnapshot
    );
  }, [
    form,
    currentCanonicalPath,
    internalLinksText,
    relatedKeywordsText,
    initialSnapshot,
  ]);

  const loadDraft = useCallback(async () => {
    if (!draftId) {
      setLoading(false);
      setError("SEO draft ID is missing.");
      return;
    }

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

      const data =
        await parseResponse<DraftResponse>(
          response
        );

      if (
        !response.ok ||
        !data.success ||
        !data.draft
      ) {
        throw new Error(
          data.error ||
            "Unable to load SEO draft."
        );
      }

      if (data.draft.status === "published") {
        throw new Error(
          "Published SEO pages cannot be edited directly. Unpublish the page first."
        );
      }

      const nextForm = createForm(data.draft);

      setDraft(data.draft);
      setForm(nextForm);
      setInternalLinksText(
        toTextList(nextForm.internalLinks)
      );
      setRelatedKeywordsText(
        toTextList(
          nextForm.relatedKeywords
        )
      );
      setInitialSnapshot(
        stableSerialize(nextForm)
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load SEO draft."
      );
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [hasUnsavedChanges]);

  function updateField<K extends keyof EditorForm>(
    key: K,
    value: EditorForm[K]
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  }

  function updateSection(
    index: number,
    key: keyof SEOPageSection,
    value: string
  ) {
    if (!form) return;

    const sections = form.sections.map(
      (section, sectionIndex) =>
        sectionIndex === index
          ? {
              ...section,
              [key]: value,
            }
          : section
    );

    updateField("sections", sections);
  }

  function addSection() {
    if (!form) return;

    updateField("sections", [
      ...form.sections,
      { ...EMPTY_SECTION },
    ]);
  }

  function removeSection(index: number) {
    if (!form) return;

    if (form.sections.length === 1) {
      window.alert(
        "At least one content section must remain."
      );
      return;
    }

    updateField(
      "sections",
      form.sections.filter(
        (_, sectionIndex) =>
          sectionIndex !== index
      )
    );
  }

  function moveSection(
    index: number,
    direction: "up" | "down"
  ) {
    if (!form) return;

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= form.sections.length
    ) {
      return;
    }

    const sections = [...form.sections];
    const [section] = sections.splice(
      index,
      1
    );

    sections.splice(
      targetIndex,
      0,
      section
    );

    updateField("sections", sections);
  }

  function updateFAQ(
    index: number,
    key: keyof SEOFAQItem,
    value: string
  ) {
    if (!form) return;

    const faq = form.faq.map(
      (item, faqIndex) =>
        faqIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
    );

    updateField("faq", faq);
  }

  function addFAQ() {
    if (!form) return;

    updateField("faq", [
      ...form.faq,
      { ...EMPTY_FAQ },
    ]);
  }

  function removeFAQ(index: number) {
    if (!form) return;

    if (form.faq.length === 1) {
      window.alert(
        "At least one FAQ item must remain."
      );
      return;
    }

    updateField(
      "faq",
      form.faq.filter(
        (_, faqIndex) => faqIndex !== index
      )
    );
  }

  function moveFAQ(
    index: number,
    direction: "up" | "down"
  ) {
    if (!form) return;

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= form.faq.length
    ) {
      return;
    }

    const faq = [...form.faq];
    const [item] = faq.splice(index, 1);

    faq.splice(targetIndex, 0, item);

    updateField("faq", faq);
  }

  function validateForm(): string | null {
    if (!form) {
      return "Editor data is unavailable.";
    }

    if (!form.title.trim()) {
      return "SEO title is required.";
    }

    if (!form.metaDescription.trim()) {
      return "Meta description is required.";
    }

    if (!cleanSlug(form.slug)) {
      return "A valid slug is required.";
    }

    if (!form.h1.trim()) {
      return "H1 is required.";
    }

    if (!form.intro.trim()) {
      return "Intro is required.";
    }

    const validSections =
      form.sections.filter(
        (section) =>
          section.heading.trim() &&
          section.content.trim()
      );

    if (validSections.length === 0) {
      return "Add at least one complete content section.";
    }

    const validFAQ = form.faq.filter(
      (item) =>
        item.question.trim() &&
        item.answer.trim()
    );

    if (validFAQ.length === 0) {
      return "Add at least one complete FAQ item.";
    }

    if (
      form.metaDescription.trim().length >
      320
    ) {
      return "Meta description must be 320 characters or fewer.";
    }

    return null;
  }

  async function handleSave() {
    if (!form) return;

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    const confirmed = window.confirm(
      "Save these SEO draft changes? The current version will be backed up, approval will be reset, and human review must be completed again."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        title: form.title.trim(),
        metaDescription:
          form.metaDescription.trim(),
        slug: cleanSlug(form.slug),
        canonicalPath:
          currentCanonicalPath,
        h1: form.h1.trim(),
        intro: form.intro.trim(),
        sections: form.sections
          .map((section) => ({
            heading:
              section.heading.trim(),
            content:
              section.content.trim(),
          }))
          .filter(
            (section) =>
              section.heading &&
              section.content
          ),
        faq: form.faq
          .map((item) => ({
            question:
              item.question.trim(),
            answer: item.answer.trim(),
          }))
          .filter(
            (item) =>
              item.question &&
              item.answer
          ),
        internalLinks:
          normalizeList(internalLinksText),
        relatedKeywords:
          normalizeList(
            relatedKeywordsText
          ),
        schemaType:
          form.schemaType || "WebPage",
      };

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
          body: JSON.stringify(payload),
        }
      );

      const data =
        await parseResponse<DraftResponse>(
          response
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to save SEO draft."
        );
      }

      const nextDraft =
        data.draft || draft;

      if (nextDraft) {
        const nextForm =
          createForm(nextDraft);

        setDraft(nextDraft);
        setForm(nextForm);
        setInternalLinksText(
          toTextList(
            nextForm.internalLinks
          )
        );
        setRelatedKeywordsText(
          toTextList(
            nextForm.relatedKeywords
          )
        );
        setInitialSnapshot(
          stableSerialize(nextForm)
        );
      }

      setMessage(
        data.message ||
          "SEO draft saved successfully."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save SEO draft."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleBackToPreview() {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "You have unsaved changes. Leave this page without saving?"
      )
    ) {
      return;
    }

    router.push(previewPath);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07101E] px-5 py-12 text-white">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[#101827] p-10 text-center text-white/50">
          Loading SEO draft editor...
        </div>
      </main>
    );
  }

  if (error && !form) {
    return (
      <main className="min-h-screen bg-[#07101E] px-5 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href={`/${locale}/admin/seo`}
            className="text-sm font-black text-[#D4AF37]"
          >
            ← Back to SEO
          </Link>

          <div className="mt-8 rounded-[2rem] border border-red-500/30 bg-red-500/10 p-8 text-red-300">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!form || !draft) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#07101E] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-[#D4AF37]/20 bg-gradient-to-br from-[#101827] to-[#0A1220] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                SEO CMS · Draft Editor
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Edit SEO Draft
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 md:text-base">
                Update public SEO content, metadata,
                FAQ, internal links, related keywords,
                and schema settings. Saving creates a
                backup version and resets human review.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBackToPreview}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white/75 transition hover:border-[#D4AF37]/45 hover:text-white"
              >
                Back to Preview
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={
                  saving ||
                  !hasUnsavedChanges
                }
                className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving
                  ? "Saving..."
                  : hasUnsavedChanges
                  ? "Save Changes"
                  : "No Changes"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>
              Status: {draft.status}
            </Badge>

            <Badge>
              Language: {draft.language}
            </Badge>

            {draft.country && (
              <Badge>
                Country: {draft.country}
              </Badge>
            )}

            {hasUnsavedChanges && (
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase text-amber-200">
                Unsaved changes
              </span>
            )}
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-3xl border border-green-500/30 bg-green-500/10 p-5 text-sm leading-7 text-green-300">
            {message}
          </div>
        )}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
          <SectionHeading
            eyebrow="Basic SEO"
            title="Metadata and Routing"
            description="These fields control search snippets, page headings, and the public URL."
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Field
              label="SEO Title"
              required
              value={form.title}
              onChange={(value) =>
                updateField("title", value)
              }
              maximumLength={180}
            />

            <Field
              label="H1"
              required
              value={form.h1}
              onChange={(value) =>
                updateField("h1", value)
              }
              maximumLength={200}
            />

            <TextArea
              label="Meta Description"
              required
              value={
                form.metaDescription
              }
              onChange={(value) =>
                updateField(
                  "metaDescription",
                  value
                )
              }
              maximumLength={320}
              rows={4}
            />

            <div>
              <Field
                label="Slug"
                required
                value={form.slug}
                onChange={(value) =>
                  updateField(
                    "slug",
                    cleanSlug(value)
                  )
                }
                maximumLength={120}
              />

              <p className="mt-2 break-all text-xs text-white/35">
                Public path:{" "}
                <span className="text-[#D4AF37]">
                  {currentCanonicalPath}
                </span>
              </p>
            </div>

            <div className="lg:col-span-2">
              <TextArea
                label="Intro"
                required
                value={form.intro}
                onChange={(value) =>
                  updateField(
                    "intro",
                    value
                  )
                }
                maximumLength={5000}
                rows={6}
              />
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                Schema Type
              </span>

              <select
                value={form.schemaType}
                onChange={(event) =>
                  updateField(
                    "schemaType",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#D4AF37]/60"
              >
                <option value="SportsEvent">
                  SportsEvent
                </option>
                <option value="Article">
                  Article
                </option>
                <option value="FAQPage">
                  FAQPage
                </option>
                <option value="WebPage">
                  WebPage
                </option>
              </select>
            </label>

            <InfoCard
              title="Canonical Path"
              value={currentCanonicalPath}
            />
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Content"
              title="Page Sections"
              description="Edit, add, remove, and reorder public SEO sections."
            />

            <button
              type="button"
              onClick={addSection}
              className="rounded-full border border-[#D4AF37]/35 px-5 py-3 text-sm font-black text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
            >
              + Add Section
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {form.sections.map(
              (section, index) => (
                <article
                  key={`section-${index}`}
                  className="rounded-3xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-white/70">
                      Section {index + 1}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <SmallButton
                        label="↑"
                        onClick={() =>
                          moveSection(
                            index,
                            "up"
                          )
                        }
                        disabled={index === 0}
                      />

                      <SmallButton
                        label="↓"
                        onClick={() =>
                          moveSection(
                            index,
                            "down"
                          )
                        }
                        disabled={
                          index ===
                          form.sections.length - 1
                        }
                      />

                      <SmallButton
                        label="Remove"
                        danger
                        onClick={() =>
                          removeSection(index)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <Field
                      label="Heading"
                      required
                      value={section.heading}
                      onChange={(value) =>
                        updateSection(
                          index,
                          "heading",
                          value
                        )
                      }
                      maximumLength={180}
                    />

                    <TextArea
                      label="Content"
                      required
                      value={section.content}
                      onChange={(value) =>
                        updateSection(
                          index,
                          "content",
                          value
                        )
                      }
                      maximumLength={8000}
                      rows={8}
                    />
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="FAQ"
              title="Frequently Asked Questions"
              description="Keep questions helpful, public-safe, and free from hidden VIP answers."
            />

            <button
              type="button"
              onClick={addFAQ}
              className="rounded-full border border-[#D4AF37]/35 px-5 py-3 text-sm font-black text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
            >
              + Add FAQ
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {form.faq.map((item, index) => (
              <article
                key={`faq-${index}`}
                className="rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-black text-white/70">
                    FAQ {index + 1}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <SmallButton
                      label="↑"
                      onClick={() =>
                        moveFAQ(index, "up")
                      }
                      disabled={index === 0}
                    />

                    <SmallButton
                      label="↓"
                      onClick={() =>
                        moveFAQ(
                          index,
                          "down"
                        )
                      }
                      disabled={
                        index ===
                        form.faq.length - 1
                      }
                    />

                    <SmallButton
                      label="Remove"
                      danger
                      onClick={() =>
                        removeFAQ(index)
                      }
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <Field
                    label="Question"
                    required
                    value={item.question}
                    onChange={(value) =>
                      updateFAQ(
                        index,
                        "question",
                        value
                      )
                    }
                    maximumLength={300}
                  />

                  <TextArea
                    label="Answer"
                    required
                    value={item.answer}
                    onChange={(value) =>
                      updateFAQ(
                        index,
                        "answer",
                        value
                      )
                    }
                    maximumLength={3000}
                    rows={5}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
            <SectionHeading
              eyebrow="Navigation"
              title="Internal Links"
              description="Add one route per line or separate values with commas."
            />

            <textarea
              value={internalLinksText}
              onChange={(event) =>
                setInternalLinksText(
                  event.target.value
                )
              }
              rows={10}
              className="mt-6 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-[#D4AF37]/60"
              placeholder="/en/predictions&#10;/en/vip&#10;/en/ai-accuracy"
            />

            <p className="mt-3 text-xs text-white/35">
              {
                normalizeList(
                  internalLinksText
                ).length
              }{" "}
              unique link(s)
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
            <SectionHeading
              eyebrow="SEO"
              title="Related Keywords"
              description="Add one keyword per line or separate values with commas."
            />

            <textarea
              value={relatedKeywordsText}
              onChange={(event) =>
                setRelatedKeywordsText(
                  event.target.value
                )
              }
              rows={10}
              className="mt-6 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-[#D4AF37]/60"
              placeholder="match analysis&#10;football preview&#10;team news"
            />

            <p className="mt-3 text-xs text-white/35">
              {
                normalizeList(
                  relatedKeywordsText
                ).length
              }{" "}
              unique keyword(s)
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-amber-400/20 bg-amber-400/5 p-6 text-sm leading-7 text-amber-100/75">
          Saving this draft creates a version backup,
          invalidates any previous approval, resets the
          human-review checklist, and requires the
          draft to pass editorial review again before
          publishing.
        </section>

        <div className="sticky bottom-4 mt-6 rounded-[2rem] border border-white/10 bg-[#0B1422]/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/45">
              {hasUnsavedChanges
                ? "You have unsaved changes."
                : "All changes are saved."}
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBackToPreview}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white/75"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={
                  saving ||
                  !hasUnsavedChanges
                }
                className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
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
      `Invalid server response: ${raw.slice(
        0,
        200
      )}`
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

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-2xl font-black md:text-3xl">
        {title}
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  maximumLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maximumLength: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
        {label}
        {required ? " *" : ""}
      </span>

      <input
        type="text"
        value={value}
        maxLength={maximumLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-[#D4AF37]/60"
      />

      <p className="mt-2 text-right text-xs text-white/30">
        {value.length}/{maximumLength}
      </p>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
  maximumLength,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maximumLength: number;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
        {label}
        {required ? " *" : ""}
      </span>

      <textarea
        value={value}
        maxLength={maximumLength}
        rows={rows}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-[#D4AF37]/60"
      />

      <p className="mt-2 text-right text-xs text-white/30">
        {value.length}/{maximumLength}
      </p>
    </label>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
        {title}
      </p>

      <p className="mt-3 break-all text-sm leading-7 text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function SmallButton({
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
          : "border-white/15 text-white/65 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}