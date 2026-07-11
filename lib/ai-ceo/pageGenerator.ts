import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import type {
  CreateSEOPageDraftInput,
  SEOFAQItem,
  SEOPageDraft,
  SEOPageLanguage,
  SEOPageSection,
} from "@/types/seo-page";

function normalizeKeyword(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ");
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
  country?: string | null
) {
  const hash = createHash("sha256")
    .update(
      [
        keyword.toLowerCase(),
        language,
        country?.toLowerCase() || "",
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
  if (language === "ku") {
    return `${keyword} | پێشبینی و شیکاری AI`;
  }

  return `${keyword} | AI Prediction and Match Analysis`;
}

function buildMetaDescription(
  keyword: string,
  language: SEOPageLanguage
) {
  if (language === "ku") {
    return `پێشبینی و شیکاری AI بۆ ${keyword} لەگەڵ confidence، risk، form، stats و هەڵسەنگاندنی یاری.`;
  }

  return `Get an AI-powered prediction for ${keyword}, including confidence, risk, recent form, match insights, and key statistics.`;
}

function buildIntro(
  keyword: string,
  language: SEOPageLanguage
) {
  if (language === "ku") {
    return `ئەم پەڕەیە شیکاری AI بۆ ${keyword} پیشان دەدات. داتاکان دەبێت لە form، stats، team strength و match context وەرگیرابن و نابێت هیچ دڵنیاییەکی درۆیین بدات.`;
  }

  return `This page provides an AI-assisted analysis for ${keyword}. It should combine form, statistics, team strength, and match context without presenting uncertain outcomes as guaranteed facts.`;
}

function buildSections(
  keyword: string,
  language: SEOPageLanguage
): SEOPageSection[] {
  if (language === "ku") {
    return [
      {
        heading: "کورتەی یاری",
        content: `کورتەیەکی ڕوون و بەسوود دەربارەی ${keyword}، گرنگترین داتا و بارودۆخی تیمەکان.`,
      },
      {
        heading: "شیکاری AI",
        content:
          "شیکاری rule-based و AI لەسەر form، هێز، گۆڵ، risk و match context.",
      },
      {
        heading: "پێشبینی و confidence",
        content:
          "پێشبینی سەرەکی، confidence score، risk level و هۆکارە سەرەکییەکان.",
      },
      {
        heading: "داتا و ئامار",
        content:
          "ئاماری گرنگی یاری، recent form، attack، defence و head-to-head ئەگەر بەردەست بێت.",
      },
      {
        heading: "ڕیسکی پێشبینی",
        content:
          "ڕوونکردنەوەی ئەو هۆکارانەی دەتوانن ئەنجامەکە بگۆڕن.",
      },
    ];
  }

  return [
    {
      heading: "Match Overview",
      content: `A clear overview of ${keyword}, including the most relevant match context and team data.`,
    },
    {
      heading: "AI Analysis",
      content:
        "A structured analysis using recent form, team strength, goals, risk, and match context.",
    },
    {
      heading: "Prediction and Confidence",
      content:
        "The main prediction, confidence score, risk level, and the strongest supporting reasons.",
    },
    {
      heading: "Key Statistics",
      content:
        "Important match statistics, form, attack, defence, and head-to-head data when available.",
    },
    {
      heading: "Prediction Risks",
      content:
        "A transparent explanation of factors that could change the expected result.",
    },
  ];
}

function buildFAQ(
  keyword: string,
  language: SEOPageLanguage
): SEOFAQItem[] {
  if (language === "ku") {
    return [
      {
        question: `پێشبینی AI بۆ ${keyword} چییە؟`,
        answer:
          "پێشبینییەکە لەسەر بنەمای داتای یاری، form، stats و risk هەژمار دەکرێت و هیچ ئەنجامێک گەرەنتی ناکات.",
      },
      {
        question: "confidence score واتای چییە؟",
        answer:
          "confidence score ئاستی متمانەی model ـە بە پێشبینییەکە، نەک گەرەنتیی بردنەوە.",
      },
      {
        question: "ئایا ئەم پێشبینییە دەتوانێت هەڵە بێت؟",
        answer:
          "بەڵێ. هەموو پێشبینییە وەرزشییەکان risk ـیان هەیە و دەتوانن بەهۆی injury، lineup، red card یان دۆخی ناگەڕاو بگۆڕێن.",
      },
    ];
  }

  return [
    {
      question: `What is the AI prediction for ${keyword}?`,
      answer:
        "The prediction is calculated from match data, recent form, statistics, and risk factors. It should not be treated as a guaranteed result.",
    },
    {
      question: "What does the confidence score mean?",
      answer:
        "The confidence score indicates how strongly the model supports the prediction based on available data. It is not a guarantee.",
    },
    {
      question: "Can the prediction be wrong?",
      answer:
        "Yes. Football predictions always carry risk and can be affected by injuries, lineups, red cards, and unexpected match events.",
    },
  ];
}

function buildInternalLinks(
  keyword: string,
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
  const slug = createSlug(keyword);

  if (!slug) {
    throw new Error("Unable to create a valid SEO slug");
  }

  const documentId = createDraftId(
    keyword,
    language,
    input.country
  );

  const draftRef = adminDb
    .collection("seoPageDrafts")
    .doc(documentId);

  const existing = await draftRef.get();

  if (existing.exists) {
    throw new Error(
      "A draft for this keyword, language, and country already exists"
    );
  }

  const canonicalPath =
    language === "ku"
      ? `/ku/predictions/${slug}`
      : `/en/predictions/${slug}`;

  const draft = {
    keyword,
    country: input.country || null,
    language,

    slug,
    canonicalPath,

    title: buildTitle(keyword, language),
    metaDescription: buildMetaDescription(
      keyword,
      language
    ),

    h1: keyword,
    intro: buildIntro(keyword, language),

    sections: buildSections(keyword, language),
    faq: buildFAQ(keyword, language),

    internalLinks: buildInternalLinks(
      keyword,
      language
    ),

    relatedKeywords:
      buildRelatedKeywords(keyword),

    schemaType: "SportsEvent" as const,

    status: "draft" as const,

    sourceRecommendationId:
      input.sourceRecommendationId || null,

    createdBy: input.createdBy,

    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),

    approvedAt: null,
    publishedAt: null,

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