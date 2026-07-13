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
  SEOPublicContent,
  SEOVIPContent,
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
    ? `${keyword} | شیکاری یاری بە AI`
    : `${keyword} | AI Match Analysis`;
}

function buildMetaDescription(
  keyword: string,
  language: SEOPageLanguage
) {
  return language === "ku"
    ? `شیکاری گشتی یاری ${keyword}، داتای بەردەست، هۆکارەکانی ڕیسک و تێڕوانینی AI، بەبێ ئاشکراکردنی پێشبینی VIP.`
    : `Explore public match analysis for ${keyword}, including available facts, risk factors, and AI-assisted insights without revealing the VIP prediction.`;
}

function buildIntro(
  keyword: string,
  language: SEOPageLanguage
) {
  return language === "ku"
    ? `ئەم پەڕەیە شیکاری گشتی بۆ ${keyword} پیشان دەدات. پێشبینی کۆتایی و وردەکارییە premium ـەکان تەنها بۆ VIP پارێزراون.`
    : `This page provides a public analysis of ${keyword}. The final prediction and premium match intelligence remain reserved for VIP members.`;
}

function buildSections(
  keyword: string,
  language: SEOPageLanguage
): SEOPageSection[] {
  return language === "ku"
    ? [
        {
          heading: "کورتەی یاری",
          content: `کورتەیەکی گشتی دەربارەی ${keyword} بەبێ ئاشکراکردنی پێشبینی کۆتایی.`,
        },
        {
          heading: "داتای بەردەست",
          content:
            "تەنها داتای پشتڕاستکراو لەم بەشەدا پیشان دەدرێت.",
        },
        {
          heading: "تێڕوانینی گشتی AI",
          content:
            "کورتە شیکارییەکی ناڕوونکەرەوە کە پێشبینی VIP ئاشکرا ناکات.",
        },
        {
          heading: "هۆکارەکانی ڕیسک",
          content:
            "ڕوونکردنەوەی ئەو هۆکارانەی دەتوانن ڕەوتی یاری بگۆڕن، بەبێ گەرەنتیکردنی ئەنجام.",
        },
      ]
    : [
        {
          heading: "Match Overview",
          content: `A public overview of ${keyword} without revealing the final prediction.`,
        },
        {
          heading: "Available Match Data",
          content:
            "Only verified and available match data should be presented here.",
        },
        {
          heading: "General AI Insight",
          content:
            "A non-conclusive AI-assisted summary that preserves the value of the VIP prediction.",
        },
        {
          heading: "Risk Factors",
          content:
            "A transparent explanation of factors that could affect the match without guaranteeing an outcome.",
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
          question: `ئەم پەڕەیە چی دەربارەی ${keyword} پیشان دەدات؟`,
          answer:
            "داتای گشتی، کورتە شیکاری و هۆکارەکانی ڕیسک پیشان دەدات، بەڵام پێشبینی کۆتایی VIP ئاشکرا ناکات.",
        },
        {
          question:
            "ئایا پێشبینی کۆتایی لەم پەڕەیەدا هەیە؟",
          answer:
            "نەخێر. پێشبینی کۆتایی و وردەکارییە premium ـەکان تەنها بۆ ئەندامانی VIP پارێزراون.",
        },
      ]
    : [
        {
          question: `What does this page show about ${keyword}?`,
          answer:
            "It provides public facts, general analysis, and risk context without revealing the final VIP prediction.",
        },
        {
          question:
            "Is the final prediction shown on this page?",
          answer:
            "No. The final prediction and premium match intelligence are reserved for VIP members.",
        },
      ];
}

function buildPublicContent(
  keyword: string,
  language: SEOPageLanguage
): SEOPublicContent {
  return language === "ku"
    ? {
        overview: `کورتەیەکی گشتی بۆ ${keyword}.`,
        recentForm:
          "داتای فۆڕمی نوێ لە template mode ـدا بەردەست نییە.",
        headToHead:
          "داتای head-to-head لە template mode ـدا بەردەست نییە.",
        homeAwayStats:
          "ئاماری home/away لە template mode ـدا بەردەست نییە.",
        injuries:
          "داتای برینداری یان lineup لە template mode ـدا بەردەست نییە.",
        aiSummary:
          "ئەم کورتە شیکارییە هیچ پێشبینی کۆتایی یان بازاڕی VIP ئاشکرا ناکات.",
        riskLevel: "Medium",
        keyInsights: [
          "پێش بڕیاردان داتای نوێی یاری پشکنین بکە.",
          "پێشبینییە وەرزشییەکان هەمیشە نادڵنیاییان هەیە.",
        ],
      }
    : {
        overview: `A general public overview of ${keyword}.`,
        recentForm:
          "Recent-form data is unavailable in template mode.",
        headToHead:
          "Head-to-head data is unavailable in template mode.",
        homeAwayStats:
          "Home and away statistics are unavailable in template mode.",
        injuries:
          "Injury and lineup information is unavailable in template mode.",
        aiSummary:
          "This general summary does not reveal the final prediction or any VIP market selection.",
        riskLevel: "Medium",
        keyInsights: [
          "Review the latest verified match data before making decisions.",
          "Football predictions always involve uncertainty.",
        ],
      };
}

function buildVIPContent(
  language: SEOPageLanguage
): SEOVIPContent {
  return language === "ku"
    ? {
        finalPrediction:
          "لە template mode ـدا بەردەست نییە.",
        confidence: 0,
        exactScore: "Unavailable",
        bestMarket:
          "لە template mode ـدا بەردەست نییە.",
        alternativeMarkets: [],
        valuePick: "Unavailable",
        reasoning:
          "بۆ دروستکردنی شیکاری VIP، fixture ID و داتای پشتڕاستکراوی یاری پێویستە.",
      }
    : {
        finalPrediction:
          "Unavailable in template mode.",
        confidence: 0,
        exactScore: "Unavailable",
        bestMarket:
          "Unavailable in template mode.",
        alternativeMarkets: [],
        valuePick: "Unavailable",
        reasoning:
          "A fixture ID and verified match data are required to generate VIP analysis.",
      };
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
    `${keyword} football preview`,
    `${keyword} team news`,
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

  let publicContent =
    buildPublicContent(keyword, language);

  let vipContent =
    buildVIPContent(language);

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

    publicContent =
      generated.content.publicContent;

    vipContent =
      generated.content.vipContent;

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

    publicContent,
    vipContent,

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