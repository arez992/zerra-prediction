import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

export type SchemaValidationStatus =
  | "pass"
  | "warning"
  | "fail";

export type SchemaValidationCheck = {
  id: string;
  label: string;
  status: SchemaValidationStatus;
  detail: string;
};

export type SEOPageSchema = {
  "@context": "https://schema.org";
  "@type": "SportsEvent" | "Article" | "FAQPage" | "WebPage";
  name: string;
  description: string;
  url: string;
  inLanguage: "en" | "ku";
  mainEntityOfPage: {
    "@type": "WebPage";
    "@id": string;
  };
  about?: {
    "@type": "SportsEvent";
    name: string;
    startDate?: string;
  };
  mainEntity?: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
};

export type SchemaValidationResult = {
  score: number;
  label: "Excellent" | "Good" | "Needs Improvement" | "Poor";
  valid: boolean;
  schema: SEOPageSchema;
  checks: SchemaValidationCheck[];
};

function clean(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getSchemaType(value: unknown): SEOPageSchema["@type"] {
  const allowed: SEOPageSchema["@type"][] = [
    "SportsEvent",
    "Article",
    "FAQPage",
    "WebPage",
  ];

  return allowed.includes(value as SEOPageSchema["@type"])
    ? (value as SEOPageSchema["@type"])
    : "WebPage";
}

function getLabel(
  score: number
): SchemaValidationResult["label"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Needs Improvement";
  return "Poor";
}

function createCheck(input: {
  id: string;
  label: string;
  passed: boolean;
  warning?: boolean;
  detail: string;
}): SchemaValidationCheck {
  return {
    id: input.id,
    label: input.label,
    status: input.passed
      ? "pass"
      : input.warning
        ? "warning"
        : "fail",
    detail: input.detail,
  };
}

export function buildSEOPageSchema(
  draft: SEOPageDraftItem
): SEOPageSchema {
  const canonicalPath = clean(draft.canonicalPath);
  const schemaType = getSchemaType(draft.schemaType);

  const schema: SEOPageSchema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: clean(draft.h1 || draft.title),
    description: clean(
      draft.metaDescription || draft.intro
    ),
    url: canonicalPath,
    inLanguage: draft.language === "ku" ? "ku" : "en",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalPath,
    },
  };

  if (schemaType === "SportsEvent" || draft.fixtureId) {
    schema.about = {
      "@type": "SportsEvent",
      name: clean(
        draft.h1 || draft.title || draft.keyword
      ),
      ...(draft.fixtureDate
        ? { startDate: draft.fixtureDate }
        : {}),
    };
  }

  const faq = (draft.faq || [])
    .filter(
      (item) =>
        clean(item.question) && clean(item.answer)
    )
    .map((item) => ({
      "@type": "Question" as const,
      name: clean(item.question),
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: clean(item.answer),
      },
    }));

  if (faq.length > 0) {
    schema.mainEntity = faq;
  }

  return schema;
}

export function validateSEOPageSchema(
  draft: SEOPageDraftItem
): SchemaValidationResult {
  const schema = buildSEOPageSchema(draft);
  const checks: SchemaValidationCheck[] = [];

  checks.push(
    createCheck({
      id: "context",
      label: "Schema context",
      passed:
        schema["@context"] === "https://schema.org",
      detail:
        schema["@context"] === "https://schema.org"
          ? "Schema.org context is configured correctly."
          : "Schema.org context is missing or invalid.",
    })
  );

  checks.push(
    createCheck({
      id: "type",
      label: "Schema type",
      passed: [
        "SportsEvent",
        "Article",
        "FAQPage",
        "WebPage",
      ].includes(schema["@type"]),
      detail: `Schema type: ${schema["@type"]}.`,
    })
  );

  checks.push(
    createCheck({
      id: "name",
      label: "Schema name",
      passed: schema.name.length >= 10,
      warning: schema.name.length > 0,
      detail: schema.name
        ? `${schema.name.length} characters.`
        : "Schema name is missing.",
    })
  );

  checks.push(
    createCheck({
      id: "description",
      label: "Schema description",
      passed: schema.description.length >= 50,
      warning: schema.description.length > 0,
      detail: schema.description
        ? `${schema.description.length} characters.`
        : "Schema description is missing.",
    })
  );

  checks.push(
    createCheck({
      id: "url",
      label: "Canonical URL",
      passed: schema.url.startsWith(
        `/${schema.inLanguage}/`
      ),
      warning: schema.url.startsWith("/"),
      detail: schema.url
        ? `Canonical path: ${schema.url}`
        : "Canonical path is missing.",
    })
  );

  checks.push(
    createCheck({
      id: "language",
      label: "Language",
      passed:
        schema.inLanguage === "en" ||
        schema.inLanguage === "ku",
      detail: `Language: ${schema.inLanguage}.`,
    })
  );

  checks.push(
    createCheck({
      id: "main-entity-page",
      label: "Main entity page",
      passed:
        schema.mainEntityOfPage["@id"] === schema.url &&
        Boolean(schema.url),
      detail:
        schema.mainEntityOfPage["@id"] === schema.url &&
        Boolean(schema.url)
          ? "mainEntityOfPage matches the canonical path."
          : "mainEntityOfPage does not match the canonical path.",
    })
  );

  const isSportsEvent =
    schema["@type"] === "SportsEvent" ||
    Boolean(draft.fixtureId);

  checks.push(
    createCheck({
      id: "sports-event",
      label: "Sports event data",
      passed:
        !isSportsEvent ||
        Boolean(schema.about?.name && draft.fixtureId),
      warning:
        isSportsEvent && Boolean(schema.about?.name),
      detail: !isSportsEvent
        ? "SportsEvent fields are not required for this schema type."
        : draft.fixtureId
          ? `Fixture ID ${draft.fixtureId} is connected to the schema.`
          : "SportsEvent schema is missing a fixture ID.",
    })
  );

  checks.push(
    createCheck({
      id: "start-date",
      label: "Event start date",
      passed:
        !isSportsEvent ||
        Boolean(schema.about?.startDate),
      warning: isSportsEvent,
      detail: !isSportsEvent
        ? "Event date is not required."
        : schema.about?.startDate
          ? `Start date: ${schema.about.startDate}`
          : "Fixture date is missing from the event schema.",
    })
  );

  const faqCount = schema.mainEntity?.length || 0;

  const faqIsComplete = (schema.mainEntity || []).every(
    (item) =>
      item["@type"] === "Question" &&
      clean(item.name).length >= 4 &&
      item.acceptedAnswer["@type"] === "Answer" &&
      clean(item.acceptedAnswer.text).length >= 20
  );

  checks.push(
    createCheck({
      id: "faq-schema",
      label: "FAQ schema",
      passed: faqCount >= 2 && faqIsComplete,
      warning: faqCount > 0 && faqIsComplete,
      detail:
        faqCount === 0
          ? "No FAQ entities are available."
          : `${faqCount} FAQ entity item(s) are included.`,
    })
  );

  const points = checks.reduce((total, check) => {
    if (check.status === "pass") return total + 10;
    if (check.status === "warning") return total + 5;
    return total;
  }, 0);

  const score = Math.round(
    (points / (checks.length * 10)) * 100
  );

  const hasFailure = checks.some(
    (check) => check.status === "fail"
  );

  return {
    score,
    label: getLabel(score),
    valid: !hasFailure && score >= 75,
    schema,
    checks,
  };
}