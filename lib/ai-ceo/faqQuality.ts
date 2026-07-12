import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

export type FAQQualityStatus =
  | "pass"
  | "warning"
  | "fail";

export type FAQQualityItem = {
  index: number;
  question: string;
  answer: string;
  score: number;
  status: FAQQualityStatus;
  issues: string[];
};

export type FAQQualityResult = {
  score: number;
  label: "Excellent" | "Good" | "Needs Improvement" | "Poor";
  total: number;
  validCount: number;
  warningCount: number;
  failedCount: number;
  duplicateQuestionCount: number;
  duplicateAnswerCount: number;
  keywordStuffingCount: number;
  items: FAQQualityItem[];
};

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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

function getLabel(
  score: number
): FAQQualityResult["label"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Needs Improvement";
  return "Poor";
}

function calculateKeywordOccurrences(
  text: string,
  keyword: string
): number {
  if (!text || !keyword) {
    return 0;
  }

  const escaped = keyword.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const matches = text.match(
    new RegExp(`\\b${escaped}\\b`, "gi")
  );

  return matches?.length || 0;
}

export function evaluateFAQQuality(
  draft: SEOPageDraftItem
): FAQQualityResult {
  const faq = Array.isArray(draft.faq)
    ? draft.faq
    : [];

  const keyword = normalizeText(
    draft.keyword
  );

  const seenQuestions = new Set<string>();
  const seenAnswers = new Set<string>();

  let duplicateQuestionCount = 0;
  let duplicateAnswerCount = 0;
  let keywordStuffingCount = 0;

  const items = faq.map((item, index) => {
    const question = String(
      item.question || ""
    ).trim();

    const answer = String(
      item.answer || ""
    ).trim();

    const normalizedQuestion =
      normalizeText(question);

    const normalizedAnswer =
      normalizeText(answer);

    const issues: string[] = [];
    let score = 100;

    const questionWords =
      countWords(question);

    const answerWords =
      countWords(answer);

    if (!question) {
      issues.push("Question is missing.");
      score -= 50;
    } else if (questionWords < 4) {
      issues.push(
        "Question is too short."
      );
      score -= 20;
    } else if (questionWords > 25) {
      issues.push(
        "Question is too long."
      );
      score -= 10;
    }

    if (!answer) {
      issues.push("Answer is missing.");
      score -= 50;
    } else if (answerWords < 20) {
      issues.push(
        "Answer is too short to be helpful."
      );
      score -= 25;
    } else if (answerWords > 180) {
      issues.push(
        "Answer may be too long for an FAQ item."
      );
      score -= 10;
    }

    if (
      normalizedQuestion &&
      seenQuestions.has(
        normalizedQuestion
      )
    ) {
      duplicateQuestionCount += 1;
      issues.push(
        "Duplicate FAQ question."
      );
      score -= 35;
    } else if (normalizedQuestion) {
      seenQuestions.add(
        normalizedQuestion
      );
    }

    if (
      normalizedAnswer &&
      seenAnswers.has(
        normalizedAnswer
      )
    ) {
      duplicateAnswerCount += 1;
      issues.push(
        "Duplicate FAQ answer."
      );
      score -= 30;
    } else if (normalizedAnswer) {
      seenAnswers.add(
        normalizedAnswer
      );
    }

    if (
      question &&
      !/[?؟]$/.test(question)
    ) {
      issues.push(
        "Question should end with a question mark."
      );
      score -= 5;
    }

    if (keyword) {
      const questionKeywordCount =
        calculateKeywordOccurrences(
          normalizedQuestion,
          keyword
        );

      const answerKeywordCount =
        calculateKeywordOccurrences(
          normalizedAnswer,
          keyword
        );

      const totalKeywordCount =
        questionKeywordCount +
        answerKeywordCount;

      const totalWords =
        questionWords + answerWords;

      const keywordDensity =
        totalWords > 0
          ? totalKeywordCount /
            totalWords
          : 0;

      if (
        totalKeywordCount >= 3 ||
        keywordDensity > 0.08
      ) {
        keywordStuffingCount += 1;
        issues.push(
          "Possible keyword stuffing."
        );
        score -= 20;
      }
    }

    if (
      /\b(always|guaranteed|certain|sure win|100%)\b/i.test(
        `${question} ${answer}`
      )
    ) {
      issues.push(
        "Overconfident or guaranteed wording detected."
      );
      score -= 20;
    }

    if (
      answerWords >= 20 &&
      !/[.!?؟]$/.test(answer)
    ) {
      issues.push(
        "Answer should end with proper punctuation."
      );
      score -= 5;
    }

    score = Math.max(
      0,
      Math.min(100, score)
    );

    const status: FAQQualityStatus =
      score >= 80
        ? "pass"
        : score >= 50
          ? "warning"
          : "fail";

    return {
      index,
      question,
      answer,
      score,
      status,
      issues,
    };
  });

  const total = items.length;

  const overallScore =
    total === 0
      ? 0
      : Math.round(
          items.reduce(
            (sum, item) =>
              sum + item.score,
            0
          ) / total
        );

  return {
    score: overallScore,
    label: getLabel(overallScore),
    total,
    validCount: items.filter(
      (item) =>
        item.status === "pass"
    ).length,
    warningCount: items.filter(
      (item) =>
        item.status === "warning"
    ).length,
    failedCount: items.filter(
      (item) =>
        item.status === "fail"
    ).length,
    duplicateQuestionCount,
    duplicateAnswerCount,
    keywordStuffingCount,
    items,
  };
}