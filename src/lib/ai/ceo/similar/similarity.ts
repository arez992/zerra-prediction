import "server-only";

import type {
  SimilarDecisionCandidate,
  SimilarDecisionInput,
  SimilarDecisionMatch,
  SimilarityBreakdown,
} from "./types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

const WEIGHTS = {
  title: 0.3,
  description: 0.2,
  type: 0.15,
  executionType: 0.2,
  tags: 0.1,
  metadata: 0.05,
} as const;

function clampScore(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(value))
  );
}

function normalizeText(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\u0600-\u06ff\s-]/g,
      " "
    )
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(
  value: unknown
): string[] {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((token) =>
          token.trim()
        )
        .filter(
          (token) =>
            token.length > 1 &&
            !STOP_WORDS.has(token)
        )
    )
  );
}

function calculateSetSimilarity(
  leftTokens: string[],
  rightTokens: string[]
): number {
  if (
    leftTokens.length === 0 ||
    rightTokens.length === 0
  ) {
    return 0;
  }

  const left =
    new Set(leftTokens);

  const right =
    new Set(rightTokens);

  let intersection = 0;

  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  const union =
    new Set([
      ...left,
      ...right,
    ]).size;

  if (union === 0) {
    return 0;
  }

  return clampScore(
    (intersection / union) *
      100
  );
}

function calculateTextSimilarity(
  left: unknown,
  right: unknown
): number {
  const normalizedLeft =
    normalizeText(left);

  const normalizedRight =
    normalizeText(right);

  if (
    !normalizedLeft ||
    !normalizedRight
  ) {
    return 0;
  }

  if (
    normalizedLeft ===
    normalizedRight
  ) {
    return 100;
  }

  const tokenScore =
    calculateSetSimilarity(
      tokenize(normalizedLeft),
      tokenize(normalizedRight)
    );

  const containsScore =
    normalizedLeft.includes(
      normalizedRight
    ) ||
    normalizedRight.includes(
      normalizedLeft
    )
      ? 85
      : 0;

  return Math.max(
    tokenScore,
    containsScore
  );
}

function calculateExactScore(
  left: unknown,
  right: unknown
): number {
  const normalizedLeft =
    normalizeText(left);

  const normalizedRight =
    normalizeText(right);

  if (
    !normalizedLeft ||
    !normalizedRight
  ) {
    return 0;
  }

  return normalizedLeft ===
    normalizedRight
    ? 100
    : 0;
}

function normalizeTags(
  tags: unknown
): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .flatMap((tag) =>
          tokenize(tag)
        )
        .filter(Boolean)
    )
  );
}

function flattenMetadata(
  value: unknown,
  prefix = "",
  depth = 0
): string[] {
  if (
    depth > 2 ||
    value === null ||
    value === undefined
  ) {
    return [];
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [
      `${prefix} ${String(value)}`.trim(),
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap(
      (item) =>
        flattenMetadata(
          item,
          prefix,
          depth + 1
        )
    );
  }

  if (typeof value === "object") {
    return Object.entries(
      value as Record<
        string,
        unknown
      >
    ).flatMap(
      ([key, item]) =>
        flattenMetadata(
          item,
          `${prefix} ${key}`.trim(),
          depth + 1
        )
    );
  }

  return [];
}

function calculateMetadataScore(
  inputMetadata:
    | Record<string, unknown>
    | undefined,
  candidateMetadata:
    Record<string, unknown>
): number {
  const inputTerms =
    flattenMetadata(
      inputMetadata || {}
    );

  const candidateTerms =
    flattenMetadata(
      candidateMetadata || {}
    );

  return calculateSetSimilarity(
    inputTerms.flatMap(tokenize),
    candidateTerms.flatMap(
      tokenize
    )
  );
}

function getMatchedTerms(
  input: SimilarDecisionInput,
  candidate:
    SimilarDecisionCandidate
): string[] {
  const inputTerms =
    new Set([
      ...tokenize(input.title),
      ...tokenize(
        input.description
      ),
      ...normalizeTags(
        input.tags
      ),
    ]);

  const candidateTerms =
    new Set([
      ...tokenize(
        candidate.title
      ),
      ...tokenize(
        candidate.description
      ),
      ...normalizeTags(
        candidate.tags
      ),
    ]);

  return Array.from(
    inputTerms
  )
    .filter((term) =>
      candidateTerms.has(term)
    )
    .slice(0, 20);
}

function buildReasons(
  breakdown:
    SimilarityBreakdown,
  matchedTerms: string[]
): string[] {
  const reasons: string[] = [];

  if (
    breakdown.executionTypeScore ===
    100
  ) {
    reasons.push(
      "Same execution type."
    );
  }

  if (
    breakdown.typeScore === 100
  ) {
    reasons.push(
      "Same recommendation type."
    );
  }

  if (
    breakdown.titleScore >= 60
  ) {
    reasons.push(
      "Titles contain strongly related terms."
    );
  }

  if (
    breakdown.descriptionScore >=
    50
  ) {
    reasons.push(
      "Descriptions describe similar actions."
    );
  }

  if (
    breakdown.tagScore >= 50
  ) {
    reasons.push(
      "Recommendations share relevant tags."
    );
  }

  if (
    matchedTerms.length > 0
  ) {
    reasons.push(
      `Matched terms: ${matchedTerms
        .slice(0, 8)
        .join(", ")}.`
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "Similarity is based on the combined weighted score."
    );
  }

  return reasons;
}

export function calculateDecisionSimilarity(
  input: SimilarDecisionInput,
  candidate:
    SimilarDecisionCandidate
): SimilarDecisionMatch {
  const breakdown:
    SimilarityBreakdown = {
    titleScore:
      calculateTextSimilarity(
        input.title,
        candidate.title
      ),

    descriptionScore:
      calculateTextSimilarity(
        input.description,
        candidate.description
      ),

    typeScore:
      calculateExactScore(
        input.recommendationType,
        candidate.recommendationType
      ),

    executionTypeScore:
      calculateExactScore(
        input.executionType,
        candidate.executionType
      ),

    tagScore:
      calculateSetSimilarity(
        normalizeTags(input.tags),
        normalizeTags(
          candidate.tags
        )
      ),

    metadataScore:
      calculateMetadataScore(
        input.metadata,
        candidate.metadata
      ),
  };

  const similarityScore =
    clampScore(
      breakdown.titleScore *
        WEIGHTS.title +
        breakdown.descriptionScore *
          WEIGHTS.description +
        breakdown.typeScore *
          WEIGHTS.type +
        breakdown.executionTypeScore *
          WEIGHTS.executionType +
        breakdown.tagScore *
          WEIGHTS.tags +
        breakdown.metadataScore *
          WEIGHTS.metadata
    );

  const matchedTerms =
    getMatchedTerms(
      input,
      candidate
    );

  return {
    candidate,
    similarityScore,
    breakdown,
    matchedTerms,
    reasons:
      buildReasons(
        breakdown,
        matchedTerms
      ),
  };
}

export function rankSimilarDecisions(
  input: SimilarDecisionInput,
  candidates:
    SimilarDecisionCandidate[],
  minimumScore = 35
): SimilarDecisionMatch[] {
  const safeMinimum =
    clampScore(minimumScore);

  return candidates
    .filter(
      (candidate) =>
        !input.recommendationId ||
        candidate.recommendationId !==
          input.recommendationId
    )
    .map((candidate) =>
      calculateDecisionSimilarity(
        input,
        candidate
      )
    )
    .filter(
      (match) =>
        match.similarityScore >=
        safeMinimum
    )
    .sort(
      (left, right) => {
        if (
          right.similarityScore !==
          left.similarityScore
        ) {
          return (
            right.similarityScore -
            left.similarityScore
          );
        }

        return (
          Number(
            right.candidate
              .impactScore || 0
          ) -
          Number(
            left.candidate
              .impactScore || 0
          )
        );
      }
    );
}