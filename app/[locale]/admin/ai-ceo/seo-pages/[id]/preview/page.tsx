"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";
import {
  evaluateSEOContentQuality,
  type SEOQualityCheckStatus,
} from "@/lib/ai-ceo/contentQuality";
import {
  evaluateDuplicateSimilarity,
  type SEODuplicateSimilarityResult,
} from "@/lib/ai-ceo/duplicateSimilarity";
import {
  validateInternalLinks,
  type InternalLinkStatus,
} from "@/lib/ai-ceo/internalLinkValidation";
import {
  evaluateFAQQuality,
  type FAQQualityStatus,
} from "@/lib/ai-ceo/faqQuality";
import {
  validateSEOPageSchema,
  type SchemaValidationStatus,
} from "@/lib/ai-ceo/schemaValidation";

type DraftResponse = {
  success: boolean;
  draft?: SEOPageDraftItem;
  message?: string;
  publicPath?: string | null;
  error?: string;
};

type VersionItem = {
  id: string;
  sourceAction: string;
  createdBy: string | null;
  createdAt: string | null;
  status: string;
  title: string;
  canonicalPath: string | null;
};

type VersionsResponse = {
  success: boolean;
  versions?: VersionItem[];
  error?: string;
};

type DraftsResponse = {
  success: boolean;
  drafts?: SEOPageDraftItem[];
  error?: string;
};

type DraftAction =
  | "approve"
  | "reject"
  | "publish"
  | "unpublish"
  | "rollback";

type HumanReviewChecklist = {
  factsVerified: boolean;
  noMisleadingClaims: boolean;
  titleMetaReviewed: boolean;
  faqReviewed: boolean;
  linksChecked: boolean;
  schemaChecked: boolean;
  riskWordingReviewed: boolean;
  finalEditorialApproval: boolean;
};

const emptyHumanReview: HumanReviewChecklist = {
  factsVerified: false,
  noMisleadingClaims: false,
  titleMetaReviewed: false,
  faqReviewed: false,
  linksChecked: false,
  schemaChecked: false,
  riskWordingReviewed: false,
  finalEditorialApproval: false,
};

const humanReviewItems: Array<{
  key: keyof HumanReviewChecklist;
  title: string;
  description: string;
}> = [
  {
    key: "factsVerified",
    title: "Facts verified",
    description:
      "Match details and factual claims were checked against trusted data.",
  },
  {
    key: "noMisleadingClaims",
    title: "No misleading claims",
    description:
      "The draft does not promise results or present uncertain claims as facts.",
  },
  {
    key: "titleMetaReviewed",
    title: "Title and metadata reviewed",
    description:
      "SEO title, H1, description, and canonical path are accurate.",
  },
  {
    key: "faqReviewed",
    title: "FAQ reviewed",
    description:
      "FAQ questions and answers are useful, complete, and non-duplicative.",
  },
  {
    key: "linksChecked",
    title: "Links checked",
    description:
      "Internal-link validation and broken-link checks were reviewed.",
  },
  {
    key: "schemaChecked",
    title: "Schema checked",
    description:
      "Generated structured data and required event fields were reviewed.",
  },
  {
    key: "riskWordingReviewed",
    title: "Risk wording reviewed",
    description:
      "Prediction uncertainty and responsible-risk wording are clear.",
  },
  {
    key: "finalEditorialApproval",
    title: "Final editorial approval",
    description:
      "The reviewer confirms the page is ready for approval.",
  },
];

type BrokenLinkStatus =
  | "healthy"
  | "redirect"
  | "broken"
  | "error";

type BrokenLinkCheck = {
  link: string;
  normalizedLink: string;
  status: BrokenLinkStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  responseTimeMs: number;
  message: string;
};

type BrokenLinksResponse = {
  success: boolean;
  checkedAt?: string;
  summary?: {
    total: number;
    healthy: number;
    redirects: number;
    broken: number;
    errors: number;
  };
  checks?: BrokenLinkCheck[];
  error?: string;
};

export default function SEOPagePreviewPage() {
  const params = useParams<{
    locale: string;
    id: string;
  }>();

  const locale = params?.locale || "en";
  const draftId = params?.id || "";

  const [draft, setDraft] =
    useState<SEOPageDraftItem | null>(null);

  const [versions, setVersions] = useState<
    VersionItem[]
  >([]);

  const [allDrafts, setAllDrafts] = useState<
    SEOPageDraftItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] =
    useState(true);

  const [similarityLoading, setSimilarityLoading] =
    useState(true);

  const [brokenLinkChecking, setBrokenLinkChecking] =
    useState(false);

  const [brokenLinks, setBrokenLinks] =
    useState<BrokenLinksResponse | null>(null);

  const [activeAction, setActiveAction] =
    useState<DraftAction | null>(null);

  const [activeVersionId, setActiveVersionId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [humanReview, setHumanReview] =
    useState<HumanReviewChecklist>(
      emptyHumanReview
    );

  const loadDraft = useCallback(async () => {
    if (!draftId) {
      setLoading(false);
      setError("SEO page draft ID is missing.");
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
        await parseResponse<DraftResponse>(response);

      if (
        !response.ok ||
        !data.success ||
        !data.draft
      ) {
        throw new Error(
          data.error ||
            "Unable to load SEO page draft."
        );
      }

      setDraft(data.draft);

      const savedReview =
        data.draft.humanReview;

      setHumanReview({
        factsVerified:
          savedReview?.factsVerified === true,
        noMisleadingClaims:
          savedReview?.noMisleadingClaims === true,
        titleMetaReviewed:
          savedReview?.titleMetaReviewed === true,
        faqReviewed:
          savedReview?.faqReviewed === true,
        linksChecked:
          savedReview?.linksChecked === true,
        schemaChecked:
          savedReview?.schemaChecked === true,
        riskWordingReviewed:
          savedReview?.riskWordingReviewed === true,
        finalEditorialApproval:
          savedReview?.finalEditorialApproval === true,
      });
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

  const loadAllDrafts = useCallback(async () => {
    try {
      setSimilarityLoading(true);

      const response = await fetch(
        "/api/admin/ai-ceo/seo-pages",
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      const data =
        await parseResponse<DraftsResponse>(
          response
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load SEO drafts for similarity checking."
        );
      }

      setAllDrafts(data.drafts || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to check duplicate similarity."
      );
    } finally {
      setSimilarityLoading(false);
    }
  }, []);

  const loadVersions = useCallback(async () => {
    if (!draftId) {
      setVersionsLoading(false);
      return;
    }

    try {
      setVersionsLoading(true);

      const response = await fetch(
        `/api/admin/ai-ceo/seo-pages/${encodeURIComponent(
          draftId
        )}/versions`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      const data =
        await parseResponse<VersionsResponse>(
          response
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load version history."
        );
      }

      setVersions(data.versions || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load version history."
      );
    } finally {
      setVersionsLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    void Promise.all([
      loadDraft(),
      loadVersions(),
      loadAllDrafts(),
    ]);
  }, [
    loadDraft,
    loadVersions,
    loadAllDrafts,
  ]);

  async function runDraftAction(
    action: Exclude<DraftAction, "rollback">,
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

      const data =
        await parseResponse<DraftResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Unable to ${action} SEO draft.`
        );
      }

      setMessage(
        data.message ||
          `SEO draft ${action} action completed successfully.`
      );

      await Promise.all([
        loadDraft(),
        loadVersions(),
        loadAllDrafts(),
      ]);

      if (
        action === "publish" &&
        data.publicPath
      ) {
        window.open(
          data.publicPath,
          "_blank",
          "noopener,noreferrer"
        );
      }
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

  async function handleBrokenLinkCheck() {
    const links = draft?.internalLinks || [];

    if (links.length === 0) {
      window.alert(
        "No internal links are available to check."
      );
      return;
    }

    try {
      setBrokenLinkChecking(true);
      setError("");
      setBrokenLinks(null);

      const response = await fetch(
        `/api/admin/ai-ceo/seo-pages/${encodeURIComponent(
          draftId
        )}/broken-links`,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            links,
          }),
        }
      );

      const data =
        await parseResponse<BrokenLinksResponse>(
          response
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to check broken links."
        );
      }

      setBrokenLinks(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to check broken links."
      );
    } finally {
      setBrokenLinkChecking(false);
    }
  }

  async function handleApprove() {
    const completed =
      Object.values(humanReview).every(
        (value) => value === true
      );

    if (!completed) {
      window.alert(
        "Complete every human review checklist item before approval."
      );
      return;
    }

    const confirmed = window.confirm(
      "Approve this SEO draft after completing the human review?"
    );

    if (!confirmed) return;

    await runDraftAction("approve", {
      humanReview,
    });
  }

  async function handleReject() {
    const reason = window.prompt(
      "Why do you want to reject this SEO draft?",
      "Needs more improvement"
    );

    if (reason === null) return;

    const cleanReason = reason.trim();

    if (!cleanReason) {
      window.alert(
        "Please enter a rejection reason."
      );
      return;
    }

    await runDraftAction("reject", {
      reason: cleanReason,
    });
  }

  async function handlePublish() {
    const confirmed = window.confirm(
      "Publish this approved SEO page? It will become publicly accessible and may be indexed by search engines."
    );

    if (!confirmed) return;

    await runDraftAction("publish");
  }

  async function handleUnpublish() {
    const confirmed = window.confirm(
      "Unpublish this SEO page? The public page will become unavailable and the draft will return to approved status."
    );

    if (!confirmed) return;

    await runDraftAction("unpublish");
  }

  async function handleRollback(
    version: VersionItem
  ) {
    const createdLabel = formatDateTime(
      version.createdAt
    );

    const confirmed = window.confirm(
      `Roll back to this saved version?\n\n${version.title}\nSaved: ${createdLabel}\nStatus at save: ${version.status}\n\nThe current content will be backed up first. The restored page will return to draft status and must be approved again before publishing.`
    );

    if (!confirmed) return;

    try {
      setActiveAction("rollback");
      setActiveVersionId(version.id);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/ai-ceo/seo-pages/${encodeURIComponent(
          draftId
        )}/rollback`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            versionId: version.id,
          }),
        }
      );

      const data =
        await parseResponse<DraftResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to roll back SEO page."
        );
      }

      setMessage(
        data.message ||
          "SEO page rolled back successfully."
      );

      await Promise.all([
        loadDraft(),
        loadVersions(),
        loadAllDrafts(),
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to roll back SEO page."
      );
    } finally {
      setActiveAction(null);
      setActiveVersionId(null);
    }
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
          {error ||
            "SEO page draft was not found."}
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

  const canPublish =
    draft.status === "approved";

  const canUnpublish =
    draft.status === "published";

  const publicPath =
    draft.canonicalPath || "";

  const humanReviewCompleted =
    Object.values(humanReview).every(
      (value) => value === true
    );

  const quality =
    evaluateSEOContentQuality(draft);

  const duplicateSimilarity:
    SEODuplicateSimilarityResult =
      evaluateDuplicateSimilarity(
        draft,
        allDrafts
      );

  const internalLinkValidation =
    validateInternalLinks(draft);

  const faqQuality =
    evaluateFAQQuality(draft);

  const schemaValidation =
    validateSEOPageSchema(draft);

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
                onClick={() =>
                  void handleApprove()
                }
                disabled={
                  activeAction !== null ||
                  !humanReviewCompleted
                }
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
                onClick={() =>
                  void handleReject()
                }
                disabled={activeAction !== null}
                className="rounded-full border border-red-500/30 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === "reject"
                  ? "Rejecting..."
                  : "Reject Draft"}
              </button>
            )}

            {canPublish && (
              <button
                type="button"
                onClick={() =>
                  void handlePublish()
                }
                disabled={activeAction !== null}
                className="rounded-full bg-green-500 px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === "publish"
                  ? "Publishing..."
                  : "Publish Page"}
              </button>
            )}

            {draft.status === "approved" && (
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center text-sm font-bold text-green-300">
                Ready to publish
              </div>
            )}

            {draft.status === "rejected" && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm font-bold text-red-300">
                This draft needs revision
              </div>
            )}

            {draft.status === "published" && (
              <>
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-center text-sm font-bold text-blue-300">
                  This page is published
                </div>

                {publicPath && (
                  <Link
                    href={publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-full bg-blue-500 px-5 py-3 text-sm font-black text-white transition hover:brightness-110"
                  >
                    View Public Page
                  </Link>
                )}

                {canUnpublish && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleUnpublish()
                    }
                    disabled={activeAction !== null}
                    className="rounded-full border border-orange-500/40 px-5 py-3 text-sm font-black text-orange-300 transition hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activeAction === "unpublish"
                      ? "Unpublishing..."
                      : "Unpublish Page"}
                  </button>
                )}
              </>
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
            value={
              draft.schemaType || "WebPage"
            }
          />
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Content Quality
            </p>

            <h2 className="mt-3 text-3xl font-black">
              SEO Quality Score
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Automated checks for SEO structure,
              readability, keyword usage, factual-data
              status, and publishing guardrails.
            </p>
          </div>

          <div className="min-w-[190px] rounded-3xl border border-[#D4AF37]/25 bg-black/25 p-5 text-center">
            <p className="text-5xl font-black text-[#D4AF37]">
              {quality.score}
              <span className="text-xl text-white/35">
                /100
              </span>
            </p>

            <p className="mt-2 text-sm font-black uppercase tracking-wider text-white/70">
              {quality.label}
            </p>

            <p className="mt-2 text-xs text-white/40">
              {quality.wordCount} content words
            </p>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-[#D4AF37] transition-all"
            style={{
              width: `${quality.score}%`,
            }}
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {quality.checks.map((check) => (
            <article
              key={check.id}
              className="rounded-3xl border border-white/10 bg-black/25 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-black">
                    <QualityIcon
                      status={check.status}
                    />{" "}
                    {check.label}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {check.detail}
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/60">
                  {check.points}/
                  {check.maximumPoints}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 border-t border-white/10 pt-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Readability Details
            </p>

            <h3 className="mt-3 text-2xl font-black">
              Content Metrics
            </h3>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Words"
              value={quality.readability.wordCount}
              detail="Body content"
            />

            <MetricCard
              title="Reading Time"
              value={`${quality.readability.readingTimeMinutes} min`}
              detail="Estimated at 220 WPM"
            />

            <MetricCard
              title="Sentences"
              value={quality.readability.sentenceCount}
              detail={`${quality.readability.averageWordsPerSentence.toFixed(
                1
              )} words average`}
            />

            <MetricCard
              title="Paragraphs"
              value={quality.readability.paragraphCount}
              detail="Intro, sections, and FAQ"
            />

            <MetricCard
              title="Headings"
              value={quality.readability.headingCount}
              detail="Content sections"
            />

            <MetricCard
              title="FAQ Items"
              value={quality.readability.faqCount}
              detail="Complete questions"
            />

            <MetricCard
              title="Long Sentences"
              value={quality.readability.longSentenceCount}
              detail="More than 25 words"
            />

            <MetricCard
              title="Readability"
              value={quality.readability.readabilityLevel}
              detail="Structural estimate"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/55">
            Readability is estimated from sentence
            length and content structure. It works for
            English and Kurdish without relying on an
            English-only reading formula.
          </div>
        </div>

        {quality.score < 75 && (
          <div className="mt-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-200/80">
            This draft should be improved before
            approval. The score is advisory and does
            not replace human editorial review.
          </div>
        )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Duplicate Protection
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Similarity Check
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Compares this draft with other SEO
              drafts using normalized three-word
              phrase overlap. No external API is used.
            </p>
          </div>

          <div className="min-w-[190px] rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
            <p className="text-5xl font-black text-[#D4AF37]">
              {similarityLoading
                ? "—"
                : duplicateSimilarity.highestSimilarity}
              {!similarityLoading && (
                <span className="text-xl text-white/35">
                  %
                </span>
              )}
            </p>

            <p className="mt-2 text-sm font-black uppercase tracking-wider text-white/70">
              {similarityLoading
                ? "Checking..."
                : `${duplicateSimilarity.level} Similarity`}
            </p>

            <p className="mt-2 text-xs text-white/40">
              Compared with{" "}
              {duplicateSimilarity.comparedCount}{" "}
              other draft(s)
            </p>
          </div>
        </div>

        {similarityLoading ? (
          <div className="mt-6 rounded-2xl bg-black/25 p-6 text-center text-sm text-white/45">
            Checking duplicate similarity...
          </div>
        ) : duplicateSimilarity.matches.length ===
          0 ? (
          <div className="mt-6 rounded-2xl border border-green-500/25 bg-green-500/10 p-5 text-sm leading-7 text-green-300">
            ✅ No meaningful phrase overlap was found
            with other SEO drafts.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {duplicateSimilarity.matches.map(
              (match) => (
                <article
                  key={match.id}
                  className="rounded-3xl border border-white/10 bg-black/25 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <VersionBadge>
                          {match.status}
                        </VersionBadge>

                        <VersionBadge>
                          {match.similarity}% similar
                        </VersionBadge>
                      </div>

                      <h3 className="mt-3 truncate font-black">
                        {match.title}
                      </h3>

                      {match.canonicalPath && (
                        <p className="mt-2 break-all text-xs text-[#D4AF37]/70">
                          {match.canonicalPath}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/${locale}/admin/ai-ceo/seo-pages/${encodeURIComponent(
                        match.id
                      )}/preview`}
                      className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white/70 transition hover:border-[#D4AF37]/50 hover:text-[#D4AF37]"
                    >
                      Review Match
                    </Link>
                  </div>
                </article>
              )
            )}
          </div>
        )}

        {!similarityLoading &&
          duplicateSimilarity.highestSimilarity >=
            60 && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-300">
              High duplicate similarity detected.
              Review and rewrite this draft before
              approval or publishing.
            </div>
          )}

        {!similarityLoading &&
          duplicateSimilarity.highestSimilarity >=
            30 &&
          duplicateSimilarity.highestSimilarity <
            60 && (
            <div className="mt-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-200/80">
              Moderate overlap detected. Human review
              is recommended before approval.
            </div>
          )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Link Quality
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Internal Link Validation
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Checks relative paths, locale prefixes,
              duplicates, self-links, and approved
              route sections before publishing.
            </p>
          </div>

          <div className="min-w-[190px] rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
            <p className="text-5xl font-black text-[#D4AF37]">
              {internalLinkValidation.score}
              <span className="text-xl text-white/35">
                %
              </span>
            </p>

            <p className="mt-2 text-sm font-black uppercase tracking-wider text-white/70">
              Link Health
            </p>

            <p className="mt-2 text-xs text-white/40">
              {internalLinkValidation.validCount} valid,
              {" "}
              {internalLinkValidation.warningCount} warning,
              {" "}
              {internalLinkValidation.invalidCount} invalid
            </p>
          </div>
        </div>

        {internalLinkValidation.checks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-200/80">
            No internal links are available for validation.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {internalLinkValidation.checks.map(
              (check, index) => (
                <article
                  key={`${check.link}-${index}`}
                  className="rounded-3xl border border-white/10 bg-black/25 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-black text-[#D4AF37]">
                        {check.link || "Empty link"}
                      </p>

                      {check.issues.length === 0 ? (
                        <p className="mt-2 text-sm text-green-300">
                          Valid internal link structure.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-white/55">
                          {check.issues.map(
                            (issue) => (
                              <li key={issue}>
                                • {issue}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </div>

                    <LinkStatusBadge
                      status={check.status}
                    />
                  </div>
                </article>
              )
            )}
          </div>
        )}

        {(internalLinkValidation.invalidCount > 0 ||
          internalLinkValidation.selfLinkCount > 0) && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-300">
            Invalid or self-referencing internal links
            were found. Fix them before approval.
          </div>
        )}

        {internalLinkValidation.invalidCount === 0 &&
          internalLinkValidation.warningCount > 0 && (
            <div className="mt-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-200/80">
              Some internal links need human review
              before approval.
            </div>
          )}

        {internalLinkValidation.validCount > 0 &&
          internalLinkValidation.warningCount === 0 &&
          internalLinkValidation.invalidCount === 0 && (
            <div className="mt-6 rounded-2xl border border-green-500/25 bg-green-500/10 p-4 text-sm leading-7 text-green-300">
              ✅ All internal links passed structural validation.
            </div>
          )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Live Route Check
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Broken Link Check
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Sends server-side requests to the
              internal routes and records successful,
              redirected, broken, or timed-out links.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleBrokenLinkCheck()
            }
            disabled={
              brokenLinkChecking ||
              (draft.internalLinks || []).length === 0
            }
            className="rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {brokenLinkChecking
              ? "Checking Links..."
              : "Run Broken Link Check"}
          </button>
        </div>

        {!brokenLinks && !brokenLinkChecking && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 text-sm leading-7 text-white/45">
            This check runs only when requested, so it
            does not generate network traffic every
            time the preview page loads.
          </div>
        )}

        {brokenLinkChecking && (
          <div className="mt-6 rounded-2xl bg-black/25 p-6 text-center text-sm text-white/45">
            Checking internal routes...
          </div>
        )}

        {brokenLinks?.summary && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Healthy"
                value={brokenLinks.summary.healthy}
                detail="HTTP 2xx"
              />

              <MetricCard
                title="Redirects"
                value={brokenLinks.summary.redirects}
                detail="HTTP 3xx"
              />

              <MetricCard
                title="Broken"
                value={brokenLinks.summary.broken}
                detail="HTTP 4xx or 5xx"
              />

              <MetricCard
                title="Errors"
                value={brokenLinks.summary.errors}
                detail="Timeout or request failure"
              />
            </div>

            <div className="mt-6 space-y-3">
              {(brokenLinks.checks || []).map(
                (check, index) => (
                  <article
                    key={`${check.link}-${index}`}
                    className="rounded-3xl border border-white/10 bg-black/25 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all font-black text-[#D4AF37]">
                          {check.normalizedLink ||
                            check.link}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-white/55">
                          {check.message}
                        </p>

                        <p className="mt-2 text-xs text-white/35">
                          HTTP:{" "}
                          {check.httpStatus ?? "—"} ·{" "}
                          {check.responseTimeMs} ms
                        </p>

                        {check.finalUrl && (
                          <p className="mt-2 break-all text-xs text-white/35">
                            Redirect: {check.finalUrl}
                          </p>
                        )}
                      </div>

                      <BrokenLinkBadge
                        status={check.status}
                      />
                    </div>
                  </article>
                )
              )}
            </div>

            {(brokenLinks.summary.broken > 0 ||
              brokenLinks.summary.errors > 0) && (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-300">
                Broken or unreachable internal links
                were detected. Fix them before
                approval or publishing.
              </div>
            )}

            {brokenLinks.summary.broken === 0 &&
              brokenLinks.summary.errors === 0 &&
              brokenLinks.summary.redirects > 0 && (
                <div className="mt-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-200/80">
                  No broken links were found, but one
                  or more routes redirect. Review
                  whether each redirect is intentional.
                </div>
              )}

            {brokenLinks.summary.broken === 0 &&
              brokenLinks.summary.errors === 0 &&
              brokenLinks.summary.redirects === 0 && (
                <div className="mt-6 rounded-2xl border border-green-500/25 bg-green-500/10 p-4 text-sm leading-7 text-green-300">
                  ✅ Every checked internal route
                  returned a successful response.
                </div>
              )}
          </>
        )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              FAQ Review
            </p>

            <h2 className="mt-3 text-3xl font-black">
              FAQ Quality Check
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Reviews completeness, helpfulness,
              duplicates, punctuation, keyword
              stuffing, and overconfident wording.
            </p>
          </div>

          <div className="min-w-[190px] rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
            <p className="text-5xl font-black text-[#D4AF37]">
              {faqQuality.score}
              <span className="text-xl text-white/35">
                /100
              </span>
            </p>

            <p className="mt-2 text-sm font-black uppercase tracking-wider text-white/70">
              {faqQuality.label}
            </p>

            <p className="mt-2 text-xs text-white/40">
              {faqQuality.total} FAQ item(s)
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Passed"
            value={faqQuality.validCount}
            detail="Strong FAQ items"
          />

          <MetricCard
            title="Warnings"
            value={faqQuality.warningCount}
            detail="Needs review"
          />

          <MetricCard
            title="Failed"
            value={faqQuality.failedCount}
            detail="Needs rewriting"
          />

          <MetricCard
            title="Keyword Issues"
            value={faqQuality.keywordStuffingCount}
            detail="Possible stuffing"
          />
        </div>

        {faqQuality.items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300">
            No FAQ items are available. Add at least
            two useful questions before approval.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {faqQuality.items.map((item) => (
              <article
                key={`${item.question}-${item.index}`}
                className="rounded-3xl border border-white/10 bg-black/25 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black">
                      {item.question ||
                        `FAQ item ${
                          item.index + 1
                        }`}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-white/55">
                      {item.answer ||
                        "No answer provided."}
                    </p>

                    {item.issues.length > 0 ? (
                      <ul className="mt-4 space-y-2 text-sm leading-6 text-white/50">
                        {item.issues.map(
                          (issue) => (
                            <li key={issue}>
                              • {issue}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="mt-4 text-sm text-green-300">
                        This FAQ item passed all quality
                        checks.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <FAQStatusBadge
                      status={item.status}
                    />

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/60">
                      {item.score}/100
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {(faqQuality.failedCount > 0 ||
          faqQuality.duplicateQuestionCount > 0 ||
          faqQuality.duplicateAnswerCount > 0) && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-300">
            FAQ quality problems were detected. Fix
            failed or duplicate items before approval.
          </div>
        )}

        {faqQuality.failedCount === 0 &&
          faqQuality.warningCount > 0 && (
            <div className="mt-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-200/80">
              Some FAQ items need human review before
              approval.
            </div>
          )}

        {faqQuality.total > 0 &&
          faqQuality.failedCount === 0 &&
          faqQuality.warningCount === 0 && (
            <div className="mt-6 rounded-2xl border border-green-500/25 bg-green-500/10 p-4 text-sm leading-7 text-green-300">
              ✅ Every FAQ item passed the automated
              quality checks.
            </div>
          )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Structured Data
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Schema Validation
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Validates the generated JSON-LD shape,
              canonical path, language, SportsEvent
              fields, and FAQ entities.
            </p>
          </div>

          <div className="min-w-[190px] rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
            <p className="text-5xl font-black text-[#D4AF37]">
              {schemaValidation.score}
              <span className="text-xl text-white/35">
                /100
              </span>
            </p>

            <p className="mt-2 text-sm font-black uppercase tracking-wider text-white/70">
              {schemaValidation.label}
            </p>

            <p className="mt-2 text-xs text-white/40">
              {schemaValidation.valid
                ? "Schema ready"
                : "Review required"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {schemaValidation.checks.map(
            (check) => (
              <article
                key={check.id}
                className="rounded-3xl border border-white/10 bg-black/25 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-black">
                      {check.label}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {check.detail}
                    </p>
                  </div>

                  <SchemaStatusBadge
                    status={check.status}
                  />
                </div>
              </article>
            )
          )}
        </div>

        <details className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-5">
          <summary className="cursor-pointer font-black text-[#D4AF37]">
            Preview Generated JSON-LD
          </summary>

          <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-black/40 p-4 text-xs leading-6 text-white/60">
            {JSON.stringify(
              schemaValidation.schema,
              null,
              2
            )}
          </pre>
        </details>

        {!schemaValidation.valid && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-300">
            Schema validation found required fields
            that need review before approval or
            publishing.
          </div>
        )}

        {schemaValidation.valid && (
          <div className="mt-6 rounded-2xl border border-green-500/25 bg-green-500/10 p-4 text-sm leading-7 text-green-300">
            ✅ The generated schema passed all required
            validation checks.
          </div>
        )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/25 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Required Approval Gate
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Human Review Checklist
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Every item must be confirmed before the
              server allows this draft to move into
              approved status.
            </p>
          </div>

          <div className="min-w-[190px] rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
            <p className="text-4xl font-black text-[#D4AF37]">
              {
                Object.values(humanReview).filter(
                  Boolean
                ).length
              }
              <span className="text-xl text-white/35">
                /{humanReviewItems.length}
              </span>
            </p>

            <p className="mt-2 text-sm font-black uppercase tracking-wider text-white/70">
              {humanReviewCompleted
                ? "Review Complete"
                : "Review Required"}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {humanReviewItems.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#D4AF37]/30"
            >
              <input
                type="checkbox"
                checked={humanReview[item.key]}
                disabled={
                  activeAction !== null ||
                  draft.status === "published"
                }
                onChange={(event) =>
                  setHumanReview((current) => ({
                    ...current,
                    [item.key]:
                      event.target.checked,
                  }))
                }
                className="mt-1 h-5 w-5 accent-[#D4AF37]"
              />

              <span className="min-w-0">
                <span className="block font-black">
                  {item.title}
                </span>

                <span className="mt-1 block text-sm leading-6 text-white/50">
                  {item.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        {!humanReviewCompleted && canApprove && (
          <div className="mt-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-200/80">
            Approval is locked until every review item
            is confirmed.
          </div>
        )}

        {draft.humanReview?.completed && (
          <div className="mt-6 rounded-2xl border border-green-500/25 bg-green-500/10 p-4 text-sm leading-7 text-green-300">
            ✅ Reviewed
            {draft.humanReview.reviewedBy
              ? ` by ${draft.humanReview.reviewedBy}`
              : ""}
            {draft.humanReview.reviewedAt
              ? ` on ${formatDateTime(
                  draft.humanReview.reviewedAt
                )}`
              : ""}
            .
          </div>
        )}
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
            {(draft.faq || []).map(
              (item, index) => (
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
              )
            )}
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6">
          <h2 className="text-xl font-black">
            Internal Links
          </h2>

          {(draft.internalLinks || []).length ===
          0 ? (
            <p className="mt-4 text-sm text-white/40">
              No internal links added.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(draft.internalLinks || []).map(
                (link) => (
                  <li
                    key={link}
                    className="break-all rounded-2xl bg-black/25 p-3 text-sm text-[#D4AF37]"
                  >
                    {link}
                  </li>
                )
              )}
            </ul>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-6">
          <h2 className="text-xl font-black">
            Related Keywords
          </h2>

          {(draft.relatedKeywords || []).length ===
          0 ? (
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
              draft.guardrails
                ?.peopleFirstContent === true
            }
          />

          <Guardrail
            title="Unique helpful content"
            active={
              draft.guardrails
                ?.uniqueHelpfulContent === true
            }
          />

          <Guardrail
            title="Duplicate checked"
            active={
              draft.guardrails
                ?.duplicateChecked === true
            }
          />

          <Guardrail
            title="Human approval required"
            active={
              draft.guardrails
                ?.humanApprovalRequired === true
            }
          />

          <Guardrail
            title="Auto publish disabled"
            active={
              draft.guardrails
                ?.autoPublishDisabled === true
            }
          />
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Version History
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Rollback
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              A version is saved automatically before every edit. Rolling back first backs up the current page, restores the selected content, and returns the page to draft status for human review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadVersions()}
            disabled={
              versionsLoading ||
              activeAction !== null
            }
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {versionsLoading
              ? "Refreshing..."
              : "Refresh Versions"}
          </button>
        </div>

        {versionsLoading ? (
          <div className="mt-6 rounded-2xl bg-black/25 p-6 text-center text-sm text-white/45">
            Loading version history...
          </div>
        ) : versions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-6 text-center text-sm leading-7 text-white/45">
            No saved versions yet. Edit and save this SEO page once to create the first rollback point.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {versions.map((version) => (
              <article
                key={version.id}
                className="rounded-3xl border border-white/10 bg-black/25 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <VersionBadge>
                        {version.sourceAction}
                      </VersionBadge>

                      <VersionBadge>
                        {version.status}
                      </VersionBadge>
                    </div>

                    <h3 className="mt-3 truncate text-lg font-black">
                      {version.title}
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-white/45">
                      Saved{" "}
                      {formatDateTime(
                        version.createdAt
                      )}
                      {version.createdBy
                        ? ` by ${version.createdBy}`
                        : ""}
                    </p>

                    {version.canonicalPath && (
                      <p className="mt-2 break-all text-xs text-[#D4AF37]/70">
                        {version.canonicalPath}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleRollback(version)
                    }
                    disabled={
                      activeAction !== null
                    }
                    className="shrink-0 rounded-full border border-purple-500/40 px-5 py-3 text-sm font-black text-purple-300 transition hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activeAction === "rollback" &&
                    activeVersionId === version.id
                      ? "Rolling Back..."
                      : "Rollback to Version"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-sm leading-7 text-yellow-200/80">
        {draft.status === "published"
          ? "This SEO page is publicly published and may be indexed by search engines."
          : "This is a private draft preview. It is not publicly published and search engines cannot index it until the publishing workflow is completed."}
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

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "at an unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
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

function VersionBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/55">
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
  const classes: Record<
    SEOPageDraftItem["status"],
    string
  > = {
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

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101827] p-8 text-center text-sm text-white/40">
      {text}
    </div>
  );
}

function QualityIcon({
  status,
}: {
  status: SEOQualityCheckStatus;
}) {
  if (status === "pass") {
    return <span aria-label="Passed">✅</span>;
  }

  if (status === "warning") {
    return <span aria-label="Warning">⚠️</span>;
  }

  return <span aria-label="Failed">❌</span>;
}


function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <p className="text-xs font-black uppercase tracking-wider text-white/40">
        {title}
      </p>

      <p className="mt-3 text-2xl font-black text-[#D4AF37]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-white/40">
        {detail}
      </p>
    </div>
  );
}


function LinkStatusBadge({
  status,
}: {
  status: InternalLinkStatus;
}) {
  const classes: Record<
    InternalLinkStatus,
    string
  > = {
    valid:
      "border-green-500/30 bg-green-500/10 text-green-300",
    warning:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    invalid:
      "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase ${classes[status]}`}
    >
      {status}
    </span>
  );
}


function BrokenLinkBadge({
  status,
}: {
  status: BrokenLinkStatus;
}) {
  const classes: Record<
    BrokenLinkStatus,
    string
  > = {
    healthy:
      "border-green-500/30 bg-green-500/10 text-green-300",
    redirect:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    broken:
      "border-red-500/30 bg-red-500/10 text-red-300",
    error:
      "border-purple-500/30 bg-purple-500/10 text-purple-300",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase ${classes[status]}`}
    >
      {status}
    </span>
  );
}


function FAQStatusBadge({
  status,
}: {
  status: FAQQualityStatus;
}) {
  const classes: Record<
    FAQQualityStatus,
    string
  > = {
    pass:
      "border-green-500/30 bg-green-500/10 text-green-300",
    warning:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    fail:
      "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${classes[status]}`}
    >
      {status}
    </span>
  );
}


function SchemaStatusBadge({
  status,
}: {
  status: SchemaValidationStatus;
}) {
  const classes: Record<
    SchemaValidationStatus,
    string
  > = {
    pass:
      "border-green-500/30 bg-green-500/10 text-green-300",
    warning:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    fail:
      "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase ${classes[status]}`}
    >
      {status}
    </span>
  );
}