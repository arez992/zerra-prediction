import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

export type SEOQualityCheckStatus =
  | "pass"
  | "warning"
  | "fail";

export type SEOQualityCheck = {
  id: string;
  label: string;
  status: SEOQualityCheckStatus;
  points: number;
  maximumPoints: number;
  detail: string;
};

export type SEOContentQualityResult = {
  score: number;
  label: "Excellent" | "Good" | "Needs Improvement" | "Poor";
  wordCount: number;
  checks: SEOQualityCheck[];
};

function normalizeText(value?: string | null): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value: string): number {
  const clean = normalizeText(value);

  if (!clean) {
    return 0;
  }

  return clean.split(" ").filter(Boolean).length;
}

function createCheck(input: {
  id: string;
  label: string;
  points: number;
  maximumPoints: number;
  detail: string;
}): SEOQualityCheck {
  const status: SEOQualityCheckStatus =
    input.points >= input.maximumPoints
      ? "pass"
      : input.points > 0
        ? "warning"
        : "fail";

  return {
    ...input,
    status,
  };
}

function getQualityLabel(
  score: number
): SEOContentQualityResult["label"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Needs Improvement";
  return "Poor";
}

export function evaluateSEOContentQuality(
  draft: SEOPageDraftItem
): SEOContentQualityResult {
  const title = normalizeText(draft.title);
  const metaDescription = normalizeText(
    draft.metaDescription
  );
  const h1 = normalizeText(draft.h1);
  const intro = normalizeText(draft.intro);

  const sectionText = (draft.sections || [])
    .map((section) =>
      [
        normalizeText(section.heading),
        normalizeText(section.content),
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");

  const faqText = (draft.faq || [])
    .map((item) =>
      [
        normalizeText(item.question),
        normalizeText(item.answer),
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");

  const bodyText = [
    h1,
    intro,
    sectionText,
    faqText,
  ]
    .filter(Boolean)
    .join(" ");

  const fullText = [
    title,
    metaDescription,
    bodyText,
  ]
    .filter(Boolean)
    .join(" ");

  const wordCount = countWords(bodyText);
  const titleLength = title.length;
  const metaLength = metaDescription.length;
  const sections = draft.sections || [];
  const faq = draft.faq || [];
  const internalLinks = draft.internalLinks || [];

  const keyword = normalizeText(
    draft.keyword
  ).toLowerCase();

  const titleHasKeyword =
    Boolean(keyword) &&
    title.toLowerCase().includes(keyword);

  const h1HasKeyword =
    Boolean(keyword) &&
    h1.toLowerCase().includes(keyword);

  const bodyHasKeyword =
    Boolean(keyword) &&
    bodyText.toLowerCase().includes(keyword);

  const sentenceCount = Math.max(
    1,
    (fullText.match(/[.!?؟]+/g) || []).length
  );

  const averageWordsPerSentence =
    countWords(fullText) / sentenceCount;

  const completeFAQCount = faq.filter(
    (item) =>
      normalizeText(item.question).length >= 8 &&
      normalizeText(item.answer).length >= 30
  ).length;

  const validSectionCount = sections.filter(
    (section) =>
      normalizeText(section.heading).length >= 3 &&
      normalizeText(section.content).length >= 80
  ).length;

  const validInternalLinks = Array.from(
    new Set(
      internalLinks.filter(
        (link) =>
          typeof link === "string" &&
          link.startsWith("/") &&
          link.length > 1
      )
    )
  );

  const checks: SEOQualityCheck[] = [];

  checks.push(
    createCheck({
      id: "title",
      label: "SEO title",
      maximumPoints: 10,
      points:
        titleLength >= 30 && titleLength <= 65
          ? 10
          : titleLength >= 20 &&
              titleLength <= 75
            ? 6
            : titleLength > 0
              ? 3
              : 0,
      detail: titleLength
        ? `${titleLength} characters. Recommended range: 30–65.`
        : "SEO title is missing.",
    })
  );

  checks.push(
    createCheck({
      id: "meta",
      label: "Meta description",
      maximumPoints: 10,
      points:
        metaLength >= 120 && metaLength <= 160
          ? 10
          : metaLength >= 80 &&
              metaLength <= 180
            ? 6
            : metaLength > 0
              ? 3
              : 0,
      detail: metaLength
        ? `${metaLength} characters. Recommended range: 120–160.`
        : "Meta description is missing.",
    })
  );

  checks.push(
    createCheck({
      id: "word-count",
      label: "Content length",
      maximumPoints: 20,
      points:
        wordCount >= 700
          ? 20
          : wordCount >= 500
            ? 15
            : wordCount >= 300
              ? 10
              : wordCount >= 150
                ? 5
                : 0,
      detail: `${wordCount} words. Target: at least 700 words for a complete match page.`,
    })
  );

  checks.push(
    createCheck({
      id: "sections",
      label: "Content sections",
      maximumPoints: 10,
      points:
        validSectionCount >= 5
          ? 10
          : validSectionCount >= 4
            ? 8
            : validSectionCount >= 3
              ? 6
              : validSectionCount >= 1
                ? 3
                : 0,
      detail: `${validSectionCount} complete section(s). Target: 4–7 useful sections.`,
    })
  );

  checks.push(
    createCheck({
      id: "faq",
      label: "FAQ quality",
      maximumPoints: 10,
      points:
        completeFAQCount >= 3
          ? 10
          : completeFAQCount === 2
            ? 7
            : completeFAQCount === 1
              ? 4
              : 0,
      detail: `${completeFAQCount} complete FAQ item(s). Target: at least 3.`,
    })
  );

  const keywordPoints =
    (titleHasKeyword ? 4 : 0) +
    (h1HasKeyword ? 3 : 0) +
    (bodyHasKeyword ? 3 : 0);

  checks.push(
    createCheck({
      id: "keyword",
      label: "Primary keyword usage",
      maximumPoints: 10,
      points: keywordPoints,
      detail: keyword
        ? `Title: ${
            titleHasKeyword ? "yes" : "no"
          }, H1: ${
            h1HasKeyword ? "yes" : "no"
          }, body: ${
            bodyHasKeyword ? "yes" : "no"
          }.`
        : "Primary keyword is missing.",
    })
  );

  checks.push(
    createCheck({
      id: "internal-links",
      label: "Internal links",
      maximumPoints: 10,
      points:
        validInternalLinks.length >= 3
          ? 10
          : validInternalLinks.length === 2
            ? 7
            : validInternalLinks.length === 1
              ? 4
              : 0,
      detail: `${validInternalLinks.length} valid unique internal link(s). Target: at least 3.`,
    })
  );

  checks.push(
    createCheck({
      id: "readability",
      label: "Basic readability",
      maximumPoints: 10,
      points:
        averageWordsPerSentence >= 8 &&
        averageWordsPerSentence <= 22
          ? 10
          : averageWordsPerSentence >= 5 &&
              averageWordsPerSentence <= 28
            ? 6
            : fullText
              ? 3
              : 0,
      detail: `${averageWordsPerSentence.toFixed(
        1
      )} average words per sentence. Recommended range: 8–22.`,
    })
  );

  const factualDataAvailable =
    draft.generation?.mode ===
      "openai_fixture" &&
    draft.generation
      ?.factualDataAvailable === true;

  checks.push(
    createCheck({
      id: "factual-data",
      label: "Factual fixture data",
      maximumPoints: 5,
      points: factualDataAvailable ? 5 : 0,
      detail: factualDataAvailable
        ? "Draft records verified fixture data as available."
        : "Verified fixture-data generation is not recorded for this draft.",
    })
  );

  const guardrailPoints =
    (draft.guardrails
      ?.peopleFirstContent === true
      ? 2
      : 0) +
    (draft.guardrails
      ?.humanApprovalRequired === true
      ? 2
      : 0) +
    (draft.guardrails
      ?.autoPublishDisabled === true
      ? 1
      : 0);

  checks.push(
    createCheck({
      id: "guardrails",
      label: "Publishing guardrails",
      maximumPoints: 5,
      points: guardrailPoints,
      detail:
        guardrailPoints === 5
          ? "People-first, human approval, and disabled auto-publishing are active."
          : "One or more required publishing guardrails are missing.",
    })
  );

  const score = checks.reduce(
    (total, check) => total + check.points,
    0
  );

  return {
    score,
    label: getQualityLabel(score),
    wordCount,
    checks,
  };
}