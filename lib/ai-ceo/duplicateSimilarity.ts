import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

export type SEODuplicateMatch = {
  id: string;
  title: string;
  status: SEOPageDraftItem["status"];
  canonicalPath: string;
  similarity: number;
};

export type SEODuplicateSimilarityResult = {
  highestSimilarity: number;
  level: "Low" | "Moderate" | "High";
  comparedCount: number;
  matches: SEODuplicateMatch[];
};

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDraftText(
  draft: SEOPageDraftItem
): string {
  const sections = (draft.sections || [])
    .map((section) =>
      `${section.heading || ""} ${section.content || ""}`
    )
    .join(" ");

  const faq = (draft.faq || [])
    .map((item) =>
      `${item.question || ""} ${item.answer || ""}`
    )
    .join(" ");

  return normalizeText(
    [
      draft.title,
      draft.metaDescription,
      draft.h1,
      draft.intro,
      sections,
      faq,
    ].join(" ")
  );
}

function createShingles(
  text: string,
  size = 3
): Set<string> {
  const words = normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 1);

  const shingles = new Set<string>();

  if (words.length === 0) {
    return shingles;
  }

  if (words.length < size) {
    shingles.add(words.join(" "));
    return shingles;
  }

  for (
    let index = 0;
    index <= words.length - size;
    index += 1
  ) {
    shingles.add(
      words.slice(index, index + size).join(" ")
    );
  }

  return shingles;
}

function jaccardSimilarity(
  left: Set<string>,
  right: Set<string>
): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const item of left) {
    if (right.has(item)) {
      intersection += 1;
    }
  }

  const union =
    left.size + right.size - intersection;

  if (union <= 0) {
    return 0;
  }

  return intersection / union;
}

function getLevel(
  score: number
): SEODuplicateSimilarityResult["level"] {
  if (score >= 60) return "High";
  if (score >= 30) return "Moderate";
  return "Low";
}

export function evaluateDuplicateSimilarity(
  currentDraft: SEOPageDraftItem,
  allDrafts: SEOPageDraftItem[]
): SEODuplicateSimilarityResult {
  const currentText =
    buildDraftText(currentDraft);

  const currentShingles =
    createShingles(currentText);

  const matches = allDrafts
    .filter(
      (draft) => draft.id !== currentDraft.id
    )
    .map((draft) => {
      const similarity = Math.round(
        jaccardSimilarity(
          currentShingles,
          createShingles(buildDraftText(draft))
        ) * 100
      );

      return {
        id: draft.id,
        title:
          draft.title ||
          draft.keyword ||
          "Untitled SEO page",
        status: draft.status,
        canonicalPath:
          draft.canonicalPath || "",
        similarity,
      };
    })
    .filter((item) => item.similarity > 0)
    .sort(
      (left, right) =>
        right.similarity - left.similarity
    )
    .slice(0, 5);

  const highestSimilarity =
    matches[0]?.similarity || 0;

  return {
    highestSimilarity,
    level: getLevel(highestSimilarity),
    comparedCount: Math.max(
      0,
      allDrafts.length - 1
    ),
    matches,
  };
}