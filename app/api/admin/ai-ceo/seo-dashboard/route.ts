import {
  NextRequest,
  NextResponse,
} from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type TimestampLike = {
  toDate: () => Date;
};

type DraftRecord = Record<string, unknown>;

type DashboardStatus =
  | "ready"
  | "needs_review"
  | "rewrite_required"
  | "approved"
  | "published"
  | "rejected"
  | "failed";

type DashboardRow = {
  id: string;
  match: string;
  keyword: string;
  language: "en" | "ku";
  canonicalPath: string;
  draftStatus: string;
  dashboardStatus: DashboardStatus;

  seoScore: number;
  publishScore: number;
  duplicatePercent: number;
  readabilityScore: number;
  keywordCoverageScore: number;
  schemaScore: number;
  internalLinksScore: number;

  quality: {
    readability: "good" | "warning" | "poor";
    keywordCoverage: "good" | "warning" | "poor";
    schema: "passed" | "warning" | "failed";
    internalLinks: "passed" | "warning" | "failed";
    duplicate: "passed" | "warning" | "failed";
    humanReview: "completed" | "required";
  };

  recommendation: string;
  updatedAt: string | null;
  createdAt: string | null;
};

function serializeTimestamp(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate ===
      "function"
  ) {
    return (value as TimestampLike)
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function normalizeText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function collectDraftText(
  draft: DraftRecord
): string {
  const sections = Array.isArray(draft.sections)
    ? draft.sections
        .map((section) => {
          if (
            !section ||
            typeof section !== "object"
          ) {
            return "";
          }

          const item = section as DraftRecord;

          return [
            normalizeText(item.heading),
            normalizeText(item.content),
          ].join(" ");
        })
        .join(" ")
    : "";

  const faq = Array.isArray(draft.faq)
    ? draft.faq
        .map((entry) => {
          if (
            !entry ||
            typeof entry !== "object"
          ) {
            return "";
          }

          const item = entry as DraftRecord;

          return [
            normalizeText(item.question),
            normalizeText(item.answer),
          ].join(" ");
        })
        .join(" ")
    : "";

  return [
    normalizeText(draft.title),
    normalizeText(draft.metaDescription),
    normalizeText(draft.h1),
    normalizeText(draft.intro),
    sections,
    faq,
  ]
    .filter(Boolean)
    .join(" ");
}

function tokenize(value: string): Set<string> {
  const words = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);

  return new Set(words);
}

function calculateSimilarity(
  left: string,
  right: string
): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);

  if (
    leftTokens.size === 0 ||
    rightTokens.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union =
    leftTokens.size +
    rightTokens.size -
    intersection;

  if (union <= 0) {
    return 0;
  }

  return Math.round(
    (intersection / union) * 100
  );
}

function calculateReadabilityScore(
  text: string
): number {
  const sentences = text
    .split(/[.!?؟]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const words = text
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 0;
  }

  const averageSentenceLength =
    words.length /
    Math.max(sentences.length, 1);

  let score = 100;

  if (words.length < 300) {
    score -= 25;
  } else if (words.length < 600) {
    score -= 10;
  }

  if (averageSentenceLength > 30) {
    score -= 30;
  } else if (averageSentenceLength > 22) {
    score -= 15;
  }

  if (averageSentenceLength < 5) {
    score -= 10;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function calculateKeywordCoverage(
  draft: DraftRecord
): number {
  const keyword = normalizeText(
    draft.keyword
  ).toLowerCase();

  if (!keyword) {
    return 0;
  }

  const fields = [
    normalizeText(draft.title),
    normalizeText(draft.metaDescription),
    normalizeText(draft.h1),
    normalizeText(draft.intro),
    normalizeText(draft.slug),
  ].map((value) => value.toLowerCase());

  const keywordTerms = keyword
    .split(/\s+/)
    .filter(Boolean);

  if (keywordTerms.length === 0) {
    return 0;
  }

  let matchedFields = 0;

  for (const field of fields) {
    const allTermsPresent =
      keywordTerms.every((term) =>
        field.includes(term)
      );

    if (allTermsPresent) {
      matchedFields += 1;
    }
  }

  return Math.round(
    (matchedFields / fields.length) * 100
  );
}

function calculateSchemaScore(
  draft: DraftRecord
): number {
  const schemaType = normalizeText(
    draft.schemaType
  );

  const allowedTypes = new Set([
    "Article",
    "FAQPage",
    "SportsEvent",
    "WebPage",
  ]);

  let score = 0;

  if (allowedTypes.has(schemaType)) {
    score += 40;
  }

  if (normalizeText(draft.title)) {
    score += 15;
  }

  if (normalizeText(draft.metaDescription)) {
    score += 15;
  }

  if (normalizeText(draft.canonicalPath)) {
    score += 15;
  }

  if (
    schemaType !== "SportsEvent" ||
    normalizeText(draft.fixtureId)
  ) {
    score += 15;
  }

  return Math.min(score, 100);
}

function calculateInternalLinksScore(
  draft: DraftRecord
): number {
  const links = normalizeStringArray(
    draft.internalLinks
  );

  if (links.length === 0) {
    return 0;
  }

  const validLinks = links.filter(
    (link) =>
      link.startsWith("/") ||
      /^https?:\/\//i.test(link)
  );

  const uniqueLinks = new Set(validLinks);

  const validityScore = Math.round(
    (validLinks.length / links.length) * 70
  );

  const quantityScore = Math.min(
    uniqueLinks.size * 10,
    30
  );

  return Math.min(
    validityScore + quantityScore,
    100
  );
}

function scoreLabel(
  score: number
): "good" | "warning" | "poor" {
  if (score >= 80) {
    return "good";
  }

  if (score >= 60) {
    return "warning";
  }

  return "poor";
}

function validationLabel(
  score: number
): "passed" | "warning" | "failed" {
  if (score >= 80) {
    return "passed";
  }

  if (score >= 60) {
    return "warning";
  }

  return "failed";
}

function duplicateLabel(
  percent: number
): "passed" | "warning" | "failed" {
  if (percent < 20) {
    return "passed";
  }

  if (percent < 40) {
    return "warning";
  }

  return "failed";
}

function calculateSEOScore(input: {
  readabilityScore: number;
  keywordCoverageScore: number;
  schemaScore: number;
  internalLinksScore: number;
  duplicatePercent: number;
}): number {
  const duplicateScore = Math.max(
    0,
    100 - input.duplicatePercent
  );

  return Math.round(
    input.readabilityScore * 0.2 +
      input.keywordCoverageScore * 0.25 +
      input.schemaScore * 0.2 +
      input.internalLinksScore * 0.15 +
      duplicateScore * 0.2
  );
}

function calculatePublishScore(input: {
  seoScore: number;
  humanReviewCompleted: boolean;
  draftStatus: string;
}): number {
  let score = input.seoScore;

  if (input.humanReviewCompleted) {
    score += 10;
  } else {
    score -= 15;
  }

  if (input.draftStatus === "approved") {
    score += 5;
  }

  if (input.draftStatus === "rejected") {
    score -= 40;
  }

  if (input.draftStatus === "failed") {
    score -= 50;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function getDashboardStatus(input: {
  draftStatus: string;
  seoScore: number;
  publishScore: number;
  duplicatePercent: number;
  humanReviewCompleted: boolean;
}): DashboardStatus {
  if (input.draftStatus === "published") {
    return "published";
  }

  if (input.draftStatus === "rejected") {
    return "rejected";
  }

  if (input.draftStatus === "failed") {
    return "failed";
  }

  if (input.duplicatePercent >= 40) {
    return "rewrite_required";
  }

  if (input.draftStatus === "approved") {
    return "approved";
  }

  if (
    input.seoScore >= 80 &&
    input.publishScore >= 80 &&
    input.humanReviewCompleted
  ) {
    return "ready";
  }

  return "needs_review";
}

function getRecommendation(input: {
  dashboardStatus: DashboardStatus;
  duplicatePercent: number;
  readabilityScore: number;
  keywordCoverageScore: number;
  schemaScore: number;
  internalLinksScore: number;
  humanReviewCompleted: boolean;
}): string {
  if (input.dashboardStatus === "published") {
    return "Published page. Continue performance monitoring.";
  }

  if (input.dashboardStatus === "rejected") {
    return "Rejected draft. Review the rejection reason before editing.";
  }

  if (input.dashboardStatus === "failed") {
    return "Generation failed. Inspect the draft error and retry safely.";
  }

  if (input.duplicatePercent >= 40) {
    return "Rewrite required because duplicate similarity is too high.";
  }

  if (input.readabilityScore < 60) {
    return "Improve readability before approval.";
  }

  if (input.keywordCoverageScore < 60) {
    return "Improve keyword coverage in the title, H1, metadata, and introduction.";
  }

  if (input.schemaScore < 80) {
    return "Review structured data before approval.";
  }

  if (input.internalLinksScore < 60) {
    return "Add or repair relevant internal links.";
  }

  if (!input.humanReviewCompleted) {
    return "Complete the required human review checklist.";
  }

  return "Quality gates passed. Ready for editorial approval.";
}

function parseSort(
  request: NextRequest
): {
  sortBy:
    | "seoScore"
    | "publishScore"
    | "duplicatePercent"
    | "updatedAt";
  direction: "asc" | "desc";
} {
  const requestedSort =
    request.nextUrl.searchParams.get(
      "sortBy"
    );

  const requestedDirection =
    request.nextUrl.searchParams.get(
      "direction"
    );

  const allowedSorts = new Set([
    "seoScore",
    "publishScore",
    "duplicatePercent",
    "updatedAt",
  ]);

  return {
    sortBy: allowedSorts.has(
      requestedSort || ""
    )
      ? (requestedSort as
          | "seoScore"
          | "publishScore"
          | "duplicatePercent"
          | "updatedAt")
      : "updatedAt",
    direction:
      requestedDirection === "asc"
        ? "asc"
        : "desc",
  };
}

function sortRows(
  rows: DashboardRow[],
  sortBy:
    | "seoScore"
    | "publishScore"
    | "duplicatePercent"
    | "updatedAt",
  direction: "asc" | "desc"
): DashboardRow[] {
  const multiplier =
    direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    if (sortBy === "updatedAt") {
      const leftValue = left.updatedAt
        ? Date.parse(left.updatedAt)
        : 0;

      const rightValue = right.updatedAt
        ? Date.parse(right.updatedAt)
        : 0;

      return (
        (leftValue - rightValue) *
        multiplier
      );
    }

    return (
      (left[sortBy] - right[sortBy]) *
      multiplier
    );
  });
}

export async function GET(
  request: NextRequest
) {
  try {
    await requireServerAdmin();

    const snapshot = await adminDb
      .collection("seoPageDrafts")
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get();

    const drafts = snapshot.docs.map(
      (document) => ({
        id: document.id,
        data: document.data() as DraftRecord,
      })
    );

    const texts = new Map<string, string>();

    for (const draft of drafts) {
      texts.set(
        draft.id,
        collectDraftText(draft.data)
      );
    }

    const rows: DashboardRow[] =
      drafts.map((draft) => {
        let duplicatePercent = 0;

        for (const comparison of drafts) {
          if (
            comparison.id === draft.id
          ) {
            continue;
          }

          const similarity =
            calculateSimilarity(
              texts.get(draft.id) || "",
              texts.get(comparison.id) || ""
            );

          duplicatePercent = Math.max(
            duplicatePercent,
            similarity
          );
        }

        const readabilityScore =
          calculateReadabilityScore(
            texts.get(draft.id) || ""
          );

        const keywordCoverageScore =
          calculateKeywordCoverage(
            draft.data
          );

        const schemaScore =
          calculateSchemaScore(draft.data);

        const internalLinksScore =
          calculateInternalLinksScore(
            draft.data
          );

        const seoScore = calculateSEOScore({
          readabilityScore,
          keywordCoverageScore,
          schemaScore,
          internalLinksScore,
          duplicatePercent,
        });

        const humanReview =
          draft.data.humanReview &&
          typeof draft.data.humanReview ===
            "object"
            ? (draft.data
                .humanReview as DraftRecord)
            : {};

        const humanReviewCompleted =
          humanReview.completed === true;

        const draftStatus =
          normalizeText(draft.data.status) ||
          "draft";

        const publishScore =
          calculatePublishScore({
            seoScore,
            humanReviewCompleted,
            draftStatus,
          });

        const dashboardStatus =
          getDashboardStatus({
            draftStatus,
            seoScore,
            publishScore,
            duplicatePercent,
            humanReviewCompleted,
          });

        return {
          id: draft.id,
          match:
            normalizeText(
              draft.data.h1
            ) ||
            normalizeText(
              draft.data.keyword
            ) ||
            "Untitled SEO Draft",

          keyword: normalizeText(
            draft.data.keyword
          ),

          language:
            draft.data.language === "ku"
              ? "ku"
              : "en",

          canonicalPath:
            normalizeText(
              draft.data.canonicalPath
            ),

          draftStatus,
          dashboardStatus,

          seoScore,
          publishScore,
          duplicatePercent,
          readabilityScore,
          keywordCoverageScore,
          schemaScore,
          internalLinksScore,

          quality: {
            readability: scoreLabel(
              readabilityScore
            ),

            keywordCoverage: scoreLabel(
              keywordCoverageScore
            ),

            schema: validationLabel(
              schemaScore
            ),

            internalLinks: validationLabel(
              internalLinksScore
            ),

            duplicate: duplicateLabel(
              duplicatePercent
            ),

            humanReview:
              humanReviewCompleted
                ? "completed"
                : "required",
          },

          recommendation:
            getRecommendation({
              dashboardStatus,
              duplicatePercent,
              readabilityScore,
              keywordCoverageScore,
              schemaScore,
              internalLinksScore,
              humanReviewCompleted,
            }),

          updatedAt: serializeTimestamp(
            draft.data.updatedAt
          ),

          createdAt: serializeTimestamp(
            draft.data.createdAt
          ),
        };
      });

    const statusFilter =
      request.nextUrl.searchParams.get(
        "status"
      );

    const filteredRows = statusFilter
      ? rows.filter(
          (row) =>
            row.dashboardStatus ===
            statusFilter
        )
      : rows;

    const { sortBy, direction } =
      parseSort(request);

    const sortedRows = sortRows(
      filteredRows,
      sortBy,
      direction
    );

    const summary = {
      total: rows.length,
      ready: rows.filter(
        (row) =>
          row.dashboardStatus === "ready"
      ).length,
      approved: rows.filter(
        (row) =>
          row.dashboardStatus ===
          "approved"
      ).length,
      published: rows.filter(
        (row) =>
          row.dashboardStatus ===
          "published"
      ).length,
      needsReview: rows.filter(
        (row) =>
          row.dashboardStatus ===
          "needs_review"
      ).length,
      rewriteRequired: rows.filter(
        (row) =>
          row.dashboardStatus ===
          "rewrite_required"
      ).length,
      rejected: rows.filter(
        (row) =>
          row.dashboardStatus ===
          "rejected"
      ).length,
      averageSEOScore:
        rows.length > 0
          ? Math.round(
              rows.reduce(
                (total, row) =>
                  total + row.seoScore,
                0
              ) / rows.length
            )
          : 0,
      averagePublishScore:
        rows.length > 0
          ? Math.round(
              rows.reduce(
                (total, row) =>
                  total +
                  row.publishScore,
                0
              ) / rows.length
            )
          : 0,
    };

    return NextResponse.json(
      {
        success: true,
        rows: sortedRows,
        count: sortedRows.length,
        summary,
        filters: {
          status: statusFilter,
          sortBy,
          direction,
        },
        checkedAt:
          new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[SEO_QUALITY_DASHBOARD_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load SEO quality dashboard.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message ===
          "Unauthorized admin access"
            ? 401
            : 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}