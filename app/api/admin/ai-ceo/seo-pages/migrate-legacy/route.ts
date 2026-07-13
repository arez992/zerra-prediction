import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

type MigrationBody = {
  dryRun?: boolean;
  limit?: number;
};

type LegacyDraft = {
  id: string;
  data: DocumentData;
};

type MigrationPreviewItem = {
  id: string;
  keyword: string;
  status: string;
  canonicalPath: string | null;
  reasons: string[];
  changes: string[];
};

type SEOFAQItem = {
  question: string;
  answer: string;
};

type SEOPageSection = {
  heading: string;
  content: string;
};

type SEOPublicContent = {
  overview: string;
  recentForm: string;
  headToHead: string;
  homeAwayStats: string;
  injuries: string;
  aiSummary: string;
  riskLevel: "Low" | "Medium" | "High";
  keyInsights: string[];
};

const BLOCKED_KEYWORD_PATTERNS = [
  /\bbetting tips?\b/i,
  /\bcorrect score prediction\b/i,
  /\bexact score\b/i,
  /\bvalue bet\b/i,
  /\bbest odds?\b/i,
  /\bkelly\b/i,
  /\bstake\b/i,
];

const PREMIUM_FAQ_PATTERNS = [
  /\bwhat is the ai prediction\b/i,
  /\bwhat is the prediction\b/i,
  /\bconfidence score\b/i,
  /\bexact score\b/i,
  /\bbest market\b/i,
  /\bvalue bet\b/i,
  /پێشبینی ai بۆ/i,
  /ڕێژەی متمانە/i,
  /ئەنجامی تەخمینکراو/i,
];

function normalizeText(
  value: unknown,
  maximumLength = 5000
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function normalizeStringArray(
  value: unknown,
  maximumItems: number,
  maximumLength: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          normalizeText(item, maximumLength)
        )
        .filter(Boolean)
    )
  ).slice(0, maximumItems);
}

function normalizeSections(
  value: unknown
): SEOPageSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source =
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};

      return {
        heading: normalizeText(
          source.heading,
          180
        ),
        content: normalizeText(
          source.content,
          5000
        ),
      };
    })
    .filter(
      (item) =>
        item.heading.length > 0 &&
        item.content.length > 0
    )
    .slice(0, 10);
}

function normalizeFAQ(
  value: unknown
): SEOFAQItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source =
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};

      return {
        question: normalizeText(
          source.question,
          300
        ),
        answer: normalizeText(
          source.answer,
          2000
        ),
      };
    })
    .filter(
      (item) =>
        item.question.length > 0 &&
        item.answer.length > 0
    )
    .slice(0, 8);
}

function hasPublicContent(
  value: unknown
): boolean {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const source =
    value as Record<string, unknown>;

  return (
    normalizeText(source.overview).length > 0 &&
    normalizeText(source.aiSummary).length > 0
  );
}

function containsPremiumLanguage(
  value: string
): boolean {
  return BLOCKED_KEYWORD_PATTERNS.some(
    (pattern) => pattern.test(value)
  );
}

function isPremiumFAQ(
  item: SEOFAQItem
): boolean {
  const combined =
    `${item.question} ${item.answer}`;

  return PREMIUM_FAQ_PATTERNS.some(
    (pattern) => pattern.test(combined)
  );
}

function buildSafeFAQ(
  keyword: string,
  language: "en" | "ku",
  currentFAQ: SEOFAQItem[]
): SEOFAQItem[] {
  const safeExisting = currentFAQ.filter(
    (item) => !isPremiumFAQ(item)
  );

  const fallback =
    language === "ku"
      ? [
          {
            question: `ئەم پەڕەیە چی دەربارەی ${keyword} پیشان دەدات؟`,
            answer:
              "داتای گشتی، شیکارییەکی کورتی AI و هۆکارەکانی ڕیسک پیشان دەدات، بەڵام پێشبینی کۆتایی VIP ئاشکرا ناکات.",
          },
          {
            question:
              "ئایا پێشبینی کۆتایی لەم پەڕەیەدا پیشان دەدرێت؟",
            answer:
              "نەخێر. پێشبینی کۆتایی و وردەکارییە premium ـەکان تەنها بۆ ئەندامانی VIP پارێزراون.",
          },
        ]
      : [
          {
            question: `What does this page show about ${keyword}?`,
            answer:
              "It provides public match facts, general AI-assisted analysis, and risk context without revealing the final VIP prediction.",
          },
          {
            question:
              "Is the final prediction shown on this page?",
            answer:
              "No. The final prediction and premium match intelligence are reserved for VIP members.",
          },
        ];

  const merged = [
    ...safeExisting,
    ...fallback,
  ];

  return Array.from(
    new Map(
      merged.map((item) => [
        item.question.toLowerCase(),
        item,
      ])
    ).values()
  ).slice(0, 5);
}

function buildSafeRelatedKeywords(
  keyword: string,
  currentKeywords: string[]
): string[] {
  const safeExisting =
    currentKeywords.filter(
      (item) => !containsPremiumLanguage(item)
    );

  const fallback = [
    `${keyword} prediction`,
    `${keyword} AI prediction`,
    `${keyword} match analysis`,
    `${keyword} football preview`,
    `${keyword} team news`,
  ];

  return Array.from(
    new Set(
      [...safeExisting, ...fallback]
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

function findSectionContent(
  sections: SEOPageSection[],
  patterns: RegExp[]
): string {
  const match = sections.find((section) =>
    patterns.some((pattern) =>
      pattern.test(section.heading)
    )
  );

  return match?.content || "";
}

function buildPublicContent(
  data: DocumentData
): SEOPublicContent {
  const language: "en" | "ku" =
    data.language === "ku" ? "ku" : "en";

  const keyword =
    normalizeText(data.keyword, 200) ||
    normalizeText(data.h1, 200) ||
    "this match";

  const sections =
    normalizeSections(data.sections);

  const intro =
    normalizeText(data.intro, 3000);

  const overview =
    findSectionContent(sections, [
      /match overview/i,
      /overview/i,
      /کورتەی یاری/i,
      /کورتە/i,
    ]) ||
    intro ||
    (language === "ku"
      ? `کورتەیەکی گشتی بۆ ${keyword}.`
      : `A public overview of ${keyword}.`);

  const recentForm =
    findSectionContent(sections, [
      /recent form/i,
      /\bform\b/i,
      /فۆڕم/i,
    ]) ||
    (language === "ku"
      ? "داتای فۆڕمی نوێ لەم legacy draft ـەدا بەردەست نییە."
      : "Recent-form data is unavailable in this legacy draft.");

  const headToHead =
    findSectionContent(sections, [
      /head[-\s]?to[-\s]?head/i,
      /\bh2h\b/i,
      /ڕووبەڕووبوونەوە/i,
    ]) ||
    (language === "ku"
      ? "داتای head-to-head لەم legacy draft ـەدا بەردەست نییە."
      : "Head-to-head data is unavailable in this legacy draft.");

  const homeAwayStats =
    findSectionContent(sections, [
      /home.*away/i,
      /statistics/i,
      /\bstats\b/i,
      /داتا و ئامار/i,
      /ئاماری ماڵەوە/i,
    ]) ||
    (language === "ku"
      ? "ئاماری home/away لەم legacy draft ـەدا بەردەست نییە."
      : "Home and away statistics are unavailable in this legacy draft.");

  const injuries =
    findSectionContent(sections, [
      /injur/i,
      /availability/i,
      /lineup/i,
      /بریندار/i,
      /بەردەستبوون/i,
    ]) ||
    (language === "ku"
      ? "داتای برینداری یان lineup لەم legacy draft ـەدا بەردەست نییە."
      : "Injury and lineup information is unavailable in this legacy draft.");

  const aiSummary =
    findSectionContent(sections, [
      /ai analysis/i,
      /general ai insight/i,
      /ai match summary/i,
      /شیکاری ai/i,
      /تێڕوانینی گشتی ai/i,
    ]) ||
    (language === "ku"
      ? "ئەم کورتە شیکارییە هیچ پێشبینی کۆتایی، ڕێژەی متمانە یان بازاڕی VIP ئاشکرا ناکات."
      : "This general AI-assisted summary does not reveal the final prediction, confidence score, or VIP market selection.");

  return {
    overview,
    recentForm,
    headToHead,
    homeAwayStats,
    injuries,
    aiSummary,
    riskLevel: "Medium",
    keyInsights:
      language === "ku"
        ? [
            "پێش بڕیاردان داتای نوێی یاری پشکنین بکە.",
            "پێشبینییە وەرزشییەکان هەمیشە نادڵنیاییان هەیە.",
          ]
        : [
            "Review the latest verified match data before making decisions.",
            "Football predictions always involve uncertainty.",
          ],
  };
}

function buildSafeTitle(
  keyword: string,
  language: "en" | "ku"
): string {
  return language === "ku"
    ? `${keyword} | شیکاری یاری بە AI`
    : `${keyword} | AI Match Analysis`;
}

function buildSafeMetaDescription(
  keyword: string,
  language: "en" | "ku"
): string {
  return language === "ku"
    ? `شیکاری گشتی یاری ${keyword}، داتای بەردەست، هۆکارەکانی ڕیسک و تێڕوانینی AI، بەبێ ئاشکراکردنی پێشبینی VIP.`
    : `Explore public match analysis for ${keyword}, including available facts, risk factors, and AI-assisted insights without revealing the VIP prediction.`;
}

function buildSafeIntro(
  keyword: string,
  language: "en" | "ku"
): string {
  return language === "ku"
    ? `ئەم پەڕەیە شیکاری گشتی بۆ ${keyword} پیشان دەدات. پێشبینی کۆتایی و وردەکارییە premium ـەکان تەنها بۆ VIP پارێزراون.`
    : `This page provides a public analysis of ${keyword}. The final prediction and premium match intelligence remain reserved for VIP members.`;
}

function getMigrationReasons(
  data: DocumentData
): string[] {
  const reasons: string[] = [];

  if (!hasPublicContent(data.publicContent)) {
    reasons.push("missing_public_content");
  }

  const faq = normalizeFAQ(data.faq);

  if (faq.some(isPremiumFAQ)) {
    reasons.push("premium_oriented_faq");
  }

  const relatedKeywords =
    normalizeStringArray(
      data.relatedKeywords,
      50,
      200
    );

  if (
    relatedKeywords.some(
      containsPremiumLanguage
    )
  ) {
    reasons.push(
      "premium_oriented_related_keywords"
    );
  }

  const title = normalizeText(
    data.title,
    180
  );

  const metaDescription =
    normalizeText(
      data.metaDescription,
      320
    );

  const intro = normalizeText(
    data.intro,
    3000
  );

  if (
    containsPremiumLanguage(title) ||
    containsPremiumLanguage(
      metaDescription
    ) ||
    containsPremiumLanguage(intro)
  ) {
    reasons.push(
      "premium_language_in_public_metadata"
    );
  }

  return reasons;
}

function getSafeLimit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(parsed))
  );
}

function getErrorStatus(message: string): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("unauthorized") ||
    normalized.includes(
      "authentication required"
    ) ||
    normalized.includes(
      "not authenticated"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes("forbidden") ||
    normalized.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("required")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    let body: MigrationBody = {};

    try {
      const raw =
        await request.text();

      body = raw
        ? (JSON.parse(raw) as MigrationBody)
        : {};
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const dryRun =
      body.dryRun !== false;

    const limit =
      getSafeLimit(body.limit);

    const snapshot = await adminDb
      .collection("seoPageDrafts")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    const candidates: LegacyDraft[] =
      snapshot.docs
        .map((document) => ({
          id: document.id,
          data: document.data(),
        }))
        .filter(({ data }) => {
          const status =
            normalizeText(data.status) ||
            "draft";

          if (status === "published") {
            return false;
          }

          return (
            getMigrationReasons(data).length >
            0
          );
        });

    const preview: MigrationPreviewItem[] =
      candidates.map(({ id, data }) => {
        const reasons =
          getMigrationReasons(data);

        const changes = [
          "create_safe_public_content",
          "clean_public_faq",
          "clean_related_keywords",
          "reset_human_review",
          "return_to_draft_status",
        ];

        if (
          reasons.includes(
            "premium_language_in_public_metadata"
          )
        ) {
          changes.push(
            "replace_public_title_meta_intro"
          );
        }

        return {
          id,
          keyword:
            normalizeText(
              data.keyword,
              200
            ) || "Untitled SEO Draft",
          status:
            normalizeText(data.status) ||
            "draft",
          canonicalPath:
            normalizeText(
              data.canonicalPath,
              500
            ) || null,
          reasons,
          changes,
        };
      });

    if (dryRun) {
      return NextResponse.json(
        {
          success: true,
          dryRun: true,
          message:
            "Legacy SEO migration dry run completed. No documents were changed.",
          scanned: snapshot.size,
          eligible: candidates.length,
          skippedPublished:
            snapshot.docs.filter(
              (document) =>
                normalizeText(
                  document.data().status
                ) === "published"
            ).length,
          preview,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: true,
          dryRun: false,
          message:
            "No eligible legacy SEO drafts were found.",
          scanned: snapshot.size,
          migrated: 0,
          preview: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const batch = adminDb.batch();

    const performedBy =
      admin.email ||
      admin.uid ||
      "unknown-admin";

    for (const candidate of candidates) {
      const { id, data } = candidate;

      const language: "en" | "ku" =
        data.language === "ku"
          ? "ku"
          : "en";

      const keyword =
        normalizeText(
          data.keyword,
          200
        ) ||
        normalizeText(data.h1, 200) ||
        "Football Match";

      const currentFAQ =
        normalizeFAQ(data.faq);

      const currentKeywords =
        normalizeStringArray(
          data.relatedKeywords,
          50,
          200
        );

      const currentTitle =
        normalizeText(
          data.title,
          180
        );

      const currentMetaDescription =
        normalizeText(
          data.metaDescription,
          320
        );

      const currentIntro =
        normalizeText(
          data.intro,
          3000
        );

      const mustReplaceMetadata =
        containsPremiumLanguage(
          currentTitle
        ) ||
        containsPremiumLanguage(
          currentMetaDescription
        ) ||
        containsPremiumLanguage(
          currentIntro
        );

      const draftRef = adminDb
        .collection("seoPageDrafts")
        .doc(id);

      const versionRef = adminDb
        .collection("seoPageVersions")
        .doc();

      const auditRef = adminDb
        .collection("seoAuditLogs")
        .doc();

      batch.set(versionRef, {
        draftId: id,
        sourceAction:
          "legacy_migration_backup",
        createdBy: performedBy,
        createdAt:
          FieldValue.serverTimestamp(),
        snapshot: data,
      });

      batch.update(draftRef, {
        publicContent:
          buildPublicContent(data),

        faq: buildSafeFAQ(
          keyword,
          language,
          currentFAQ
        ),

        relatedKeywords:
          buildSafeRelatedKeywords(
            keyword,
            currentKeywords
          ),

        ...(mustReplaceMetadata
          ? {
              title: buildSafeTitle(
                keyword,
                language
              ),
              metaDescription:
                buildSafeMetaDescription(
                  keyword,
                  language
                ),
              intro: buildSafeIntro(
                keyword,
                language
              ),
            }
          : {}),

        status: "draft",
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,

        humanReview: {
          factsVerified: false,
          noMisleadingClaims: false,
          titleMetaReviewed: false,
          faqReviewed: false,
          linksChecked: false,
          schemaChecked: false,
          riskWordingReviewed: false,
          finalEditorialApproval: false,
          completed: false,
          reviewedBy: null,
          reviewedAt: null,
        },

        legacyMigration: {
          migrated: true,
          migratedBy: performedBy,
          migratedAt:
            FieldValue.serverTimestamp(),
          versionId: versionRef.id,
          reasons:
            getMigrationReasons(data),
        },

        updatedAt:
          FieldValue.serverTimestamp(),

        guardrails: {
          ...(data.guardrails || {}),
          peopleFirstContent: true,
          uniqueHelpfulContent: true,
          duplicateChecked: true,
          humanApprovalRequired: true,
          autoPublishDisabled: true,
        },
      });

      batch.set(auditRef, {
        action:
          "legacy_seo_migration",
        draftId: id,
        versionId: versionRef.id,
        previousStatus:
          normalizeText(data.status) ||
          "draft",
        newStatus: "draft",
        performedBy,
        reasons:
          getMigrationReasons(data),
        humanReviewInvalidated: true,
        createdAt:
          FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        dryRun: false,
        message:
          "Legacy SEO drafts migrated successfully. Published pages were not changed.",
        scanned: snapshot.size,
        migrated: candidates.length,
        skippedPublished:
          snapshot.docs.filter(
            (document) =>
              normalizeText(
                document.data().status
              ) === "published"
          ).length,
        migratedDrafts: preview,
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
      "[LEGACY_SEO_MIGRATION_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to migrate legacy SEO drafts.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: getErrorStatus(message),
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}