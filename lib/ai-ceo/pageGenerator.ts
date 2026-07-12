import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import {
  generateFixtureSEOContent,
} from "@/lib/ai-ceo/seoContentWriter";

import type {
  CreateSEOPageDraftInput,
  SEOFAQItem,
  SEOPageDraft,
  SEOPageLanguage,
  SEOPageSection,
} from "@/types/seo-page";

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function createDraftId(
  keyword: string,
  language: SEOPageLanguage,
  country?: string | null,
  fixtureId?: string | null
) {
  const hash = createHash("sha256")
    .update(
      [
        keyword.toLowerCase(),
        language,
        country?.toLowerCase() || "",
        fixtureId || "",
      ].join("|")
    )
    .digest("hex")
    .slice(0, 24);

  return `seo-page-${hash}`;
}

function buildTitle(
  keyword: string,
  language: SEOPageLanguage
) {
  return language === "ku"
    ? `${keyword} | پێشبینی و شیکاری AI`
    : `${keyword} | AI Prediction and Match Analysis`;
}

function buildMetaDescription(
  keyword: string,
  language: SEOPageLanguage
) {
  return language === "ku"
    ? `پێشبینی و شیکاری AI بۆ ${keyword} لەگەڵ confidence، risk، form، stats و هەڵسەنگاندنی یاری.`
    : `Get an AI-powered prediction for ${keyword}, including confidence, risk, recent form, match insights, and key statistics.`;
}

function buildIntro(
  keyword: string,
  language: SEOPageLanguage
) {
  return language === "ku"
    ? `ئەم پەڕەیە شیکاری AI بۆ ${keyword} پیشان دەدات و هیچ ئەنجامێک گەرەنتی ناکات.`
    : `This page provides an AI-assisted analysis for ${keyword} without presenting uncertain outcomes as guaranteed facts.`;
}

function buildSections(
  keyword: string,
  language: SEOPageLanguage
): SEOPageSection[] {
  return language === "ku"
    ? [
        {
          heading: "کورتەی یاری",
          content: `کورتەیەکی ڕوون دەربارەی ${keyword}.`,
        },
        {
          heading: "شیکاری AI",
          content:
            "شیکاری rule-based و AI بەبێ گەرەنتیکردنی ئەنجام.",
        },
        {
          heading: "داتا و ئامار",
          content:
            "تەنها داتای پشتڕاستکراو لێرە پیشان دەدرێت.",
        },
        {
          heading: "ڕیسکی پێشبینی",
          content:
            "ڕوونکردنەوەی ئەو هۆکارانەی دەتوانن ئەنجامەکە بگۆڕن.",
        },
      ]
    : [
        {
          heading: "Match Overview",
          content: `A clear overview of ${keyword}.`,
        },
        {
          heading: "AI Analysis",
          content:
            "A cautious AI-assisted interpretation without guaranteed outcomes.",
        },
        {
          heading: "Available Match Data",
          content:
            "Only verified data should be presented here.",
        },
        {
          heading: "Prediction Risks",
          content:
            "A transparent explanation of factors that may affect the expected result.",
        },
      ];
}

function buildFAQ(
  keyword: string,
  language: SEOPageLanguage
): SEOFAQItem[] {
  return language === "ku"
    ? [
        {
          question: `پێشبینی AI بۆ ${keyword} چییە؟`,
          answer:
            "پێشبینییەکە شیکارییە و هیچ ئەنجامێک گەرەنتی ناکات.",
        },
        {
          question: "ئایا پێشبینییەکە دەتوانێت هەڵە بێت؟",
          answer:
            "بەڵێ. هەموو پێشبینییە وەرزشییەکان risk ـیان هەیە.",
        },
      ]
    : [
        {
          question: `What is the AI prediction for ${keyword}?`,
          answer:
            "It is an analytical estimate and should not be treated as a guaranteed result.",
        },
        {
          question: "Can the prediction be wrong?",
          answer:
            "Yes. Football predictions always carry uncertainty and risk.",
        },
      ];
}

function buildInternalLinks(
  language: SEOPageLanguage
) {
  const base = language === "ku" ? "/ku" : "/en";

  return [
    `${base}/predictions`,
    `${base}/dashboard`,
    `${base}/vip`,
    `${base}/ai-accuracy`,
    `${base}/football-predictions`,
  ];
}

function buildRelatedKeywords(keyword: string) {
  return [
    `${keyword} prediction`,
    `${keyword} AI prediction`,
    `${keyword} match analysis`,
    `${keyword} betting tips`,
    `${keyword} correct score prediction`,
  ];
}

export async function createSEOPageDraft(
  input: CreateSEOPageDraftInput
): Promise<SEOPageDraft> {
  const keyword = normalizeKeyword(input.keyword);

  if (!keyword) {
    throw new Error("SEO keyword is required");
  }

  if (keyword.length < 4) {
    throw new Error("SEO keyword is too short");
  }

  const language = input.language || "en";
  const fixtureId = input.fixtureId
    ? String(input.fixtureId).trim()
    : null;

  const slug = createSlug(keyword);

  if (!slug) {
    throw new Error(
      "Unable to create a valid SEO slug"
    );
  }

  const documentId = createDraftId(
    keyword,
    language,
    input.country,
    fixtureId
  );

  const draftRef = adminDb
    .collection("seoPageDrafts")
    .doc(documentId);

  const existing = await draftRef.get();

  if (existing.exists) {
    throw new Error(
      "A draft for this keyword, language, country, and fixture already exists"
    );
  }

  const canonicalPath =
    language === "ku"
      ? `/ku/predictions/${slug}`
      : `/en/predictions/${slug}`;

  let title = buildTitle(keyword, language);
  let metaDescription = buildMetaDescription(
    keyword,
    language
  );
  let h1 = keyword;
  let intro = buildIntro(keyword, language);
  let sections = buildSections(keyword, language);
  let faq = buildFAQ(keyword, language);
  let relatedKeywords =
    buildRelatedKeywords(keyword);

  let generation: SEOPageDraft["generation"] = {
    mode: "template",
    model: null,
    fixtureId,
    fixtureDate: input.fixtureDate || null,
    generatedAt: new Date().toISOString(),
    factualDataAvailable: false,
  };

  let resolvedFixtureDate =
    input.fixtureDate || null;

  if (fixtureId) {
    const generated =
      await generateFixtureSEOContent({
        keyword,
        language,
        country: input.country,
        fixtureId,
      });

    title = generated.content.title;
    metaDescription =
      generated.content.metaDescription;
    h1 = generated.content.h1;
    intro = generated.content.intro;
    sections = generated.content.sections;
    faq = generated.content.faq;
    relatedKeywords =
      generated.content.relatedKeywords.length > 0
        ? generated.content.relatedKeywords
        : relatedKeywords;

    resolvedFixtureDate =
      generated.facts.fixtureDate ||
      resolvedFixtureDate;

    generation = {
      mode: "openai_fixture",
      model: generated.content.model,
      fixtureId,
      fixtureDate: resolvedFixtureDate,
      generatedAt: new Date().toISOString(),
      factualDataAvailable:
        generated.content.factualDataAvailable,
    };
  }

  const draft = {
    keyword,
    country: input.country || null,
    language,

    fixtureId,
    fixtureDate: resolvedFixtureDate,

    slug,
    canonicalPath,

    title,
    metaDescription,

    h1,
    intro,

    sections,
    faq,

    internalLinks: buildInternalLinks(language),
    relatedKeywords,

    schemaType: "SportsEvent" as const,
    status: "draft" as const,

    sourceRecommendationId:
      input.sourceRecommendationId || null,

    createdBy: input.createdBy,

    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),

    approvedAt: null,
    publishedAt: null,

    generation,

    guardrails: {
      peopleFirstContent: true,
      uniqueHelpfulContent: true,
      duplicateChecked: true,
      humanApprovalRequired: true,
      autoPublishDisabled: true,
    },
  };

  await draftRef.set(draft);

  return {
    id: documentId,
    ...draft,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function listSEOPageDrafts(
  limit = 100
) {
  const safeLimit = Math.min(
    200,
    Math.max(1, Number(limit || 100))
  );

  const snapshot = await adminDb
    .collection("seoPageDrafts")
    .orderBy("createdAt", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      ...data,
      createdAt:
        data.createdAt?.toDate?.().toISOString?.() ||
        data.createdAt ||
        null,
      updatedAt:
        data.updatedAt?.toDate?.().toISOString?.() ||
        data.updatedAt ||
        null,
      approvedAt:
        data.approvedAt?.toDate?.().toISOString?.() ||
        data.approvedAt ||
        null,
      publishedAt:
        data.publishedAt?.toDate?.().toISOString?.() ||
        data.publishedAt ||
        null,
    };
  });
}