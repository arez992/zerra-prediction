import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  createSEOPageDraft,
  listSEOPageDrafts,
} from "@/lib/ai-ceo/pageGenerator";

import {
  evaluateSEOAutoPublishPolicy,
} from "@/lib/ai-ceo/seoAutoPublishPolicy";

import {
  applySEOAutonomousLifecycle,
} from "@/lib/ai-ceo/seoLifecycle";

import type {
  SEOPageDraftItem,
} from "@/lib/ai-ceo/client";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const DEFAULT_LIMIT =
  2;

const MAX_LIMIT =
  5;

type PredictionCandidate = {
  id:
    string;

  fixtureId:
    string;

  fixtureDate:
    string | null;

  keyword:
    string;

  country:
    string | null;
};

type SEOGenerationItem = {
  fixtureId:
    string;

  keyword:
    string;

  draftId:
    string | null;

  generated:
    boolean;

  decision:
    | "auto-publish"
    | "review"
    | "withhold"
    | "skipped"
    | "failed";

  status:
    string | null;

  reason:
    string;
};

function isAuthorized(
  request:
    NextRequest
): boolean {
  const secret =
    process.env
      .CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  return (
    authorization ===
    `Bearer ${secret}`
  );
}

function normalizeLimit(
  value:
    string | null
): number {
  const parsed =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(
        parsed
      )
    )
  );
}

function normalizeText(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function serializeDate(
  value:
    unknown
): string | null {
  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    value &&
    typeof value ===
      "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate:
          () => Date;
      }
    ).toDate ===
      "function"
  ) {
    return (
      value as {
        toDate:
          () => Date;
      }
    )
      .toDate()
      .toISOString();
  }

  return null;
}

async function getPredictionCandidates(
  limit:
    number
): Promise<
  PredictionCandidate[]
> {
  const snapshot =
    await adminDb
      .collection(
        "predictionHistory"
      )
      .where(
        "status",
        "==",
        "published"
      )
      .limit(
        Math.max(
          20,
          limit * 5
        )
      )
      .get();

  const candidates:
    PredictionCandidate[] =
      [];

  for (
    const document
    of snapshot.docs
  ) {
    const data =
      document.data() ||
      {};

    const fixtureId =
      normalizeText(
        data.fixtureId
      );

    const homeTeam =
      normalizeText(
        data.teams
          ?.home
          ?.name
      );

    const awayTeam =
      normalizeText(
        data.teams
          ?.away
          ?.name
      );

    if (
      !fixtureId ||
      !homeTeam ||
      !awayTeam
    ) {
      continue;
    }

    candidates.push({
      id:
        document.id,

      fixtureId,

      fixtureDate:
        serializeDate(
          data.fixtureDate
        ),

      keyword:
        `${homeTeam} vs ${awayTeam}`,

      country:
        normalizeText(
          data.competition
            ?.country
        ) ||
        null,
    });
  }

  return candidates.slice(
    0,
    limit * 3
  );
}

export async function GET(
  request:
    NextRequest
) {
  try {
    if (
      !isAuthorized(
        request
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Unauthorized cron request.",
        },
        {
          status:
            401,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const limit =
      normalizeLimit(
        request
          .nextUrl
          .searchParams
          .get(
            "limit"
          )
      );

    const language:
      SEOPageDraftItem["language"] =
      request
        .nextUrl
        .searchParams
        .get(
          "language"
        ) ===
      "ku"
        ? "ku"
        : "en";

    const existingDraftsRaw =
      await listSEOPageDrafts(
        200
      );

    const existingDrafts =
      existingDraftsRaw as
        SEOPageDraftItem[];

    const existingFixtureKeys =
      new Set<string>(
        existingDrafts
          .filter(
            (
              draft:
                SEOPageDraftItem
            ) =>
              Boolean(
                draft.fixtureId
              )
          )
          .map(
            (
              draft:
                SEOPageDraftItem
            ) =>
              `${String(
                draft.fixtureId
              )}:${draft.language}`
          )
      );

    const candidates =
      await getPredictionCandidates(
        limit
      );

    const items:
      SEOGenerationItem[] =
      [];

    let generatedCount =
      0;

    let autoPublishedCount =
      0;

    let reviewCount =
      0;

    let withheldCount =
      0;

    let skippedCount =
      0;

    let failedCount =
      0;

    for (
      const candidate
      of candidates
    ) {
      if (
        generatedCount >=
        limit
      ) {
        break;
      }

      const fixtureKey =
        `${candidate.fixtureId}:${language}`;

      if (
        existingFixtureKeys.has(
          fixtureKey
        )
      ) {
        skippedCount +=
          1;

        items.push({
          fixtureId:
            candidate.fixtureId,

          keyword:
            candidate.keyword,

          draftId:
            null,

          generated:
            false,

          decision:
            "skipped",

          status:
            null,

          reason:
            "An SEO draft already exists for this fixture and language.",
        });

        continue;
      }

      try {
        const draft =
          await createSEOPageDraft({
            keyword:
              candidate.keyword,

            language,

            country:
              candidate.country,

            fixtureId:
              candidate.fixtureId,

            fixtureDate:
              candidate.fixtureDate,

            sourceRecommendationId:
              null,

            createdBy:
              "ai-ceo-autonomous-seo-cron",
          });

        generatedCount +=
          1;

        existingFixtureKeys.add(
          fixtureKey
        );

        const latestDraftsRaw =
          await listSEOPageDrafts(
            200
          );

        const latestDrafts =
          latestDraftsRaw as
            SEOPageDraftItem[];

        const currentDraft =
          draft as unknown as
            SEOPageDraftItem;

        const policy =
          evaluateSEOAutoPublishPolicy(
            currentDraft,
            latestDrafts
          );

        const lifecycle =
          await applySEOAutonomousLifecycle({
            draftId:
              draft.id,

            policy,

            performedBy:
              "ai-ceo-autonomous-seo-cron",
          });

        if (
          lifecycle.decision ===
          "auto-publish"
        ) {
          autoPublishedCount +=
            1;
        } else if (
          lifecycle.decision ===
          "review"
        ) {
          reviewCount +=
            1;
        } else {
          withheldCount +=
            1;
        }

        items.push({
          fixtureId:
            candidate.fixtureId,

          keyword:
            candidate.keyword,

          draftId:
            draft.id,

          generated:
            true,

          decision:
            lifecycle.decision,

          status:
            lifecycle.status,

          reason:
            lifecycle.message,
        });
      } catch (
        error
      ) {
        const message =
          error instanceof
            Error
            ? error.message
            : "AI CEO autonomous SEO generation failed.";

        if (
          message
            .toLowerCase()
            .includes(
              "already exists"
            )
        ) {
          skippedCount +=
            1;

          items.push({
            fixtureId:
              candidate.fixtureId,

            keyword:
              candidate.keyword,

            draftId:
              null,

            generated:
              false,

            decision:
              "skipped",

            status:
              null,

            reason:
              message,
          });

          continue;
        }

        failedCount +=
          1;

        console.error(
          "[AI_CEO_AUTONOMOUS_SEO_ITEM_ERROR]",
          {
            fixtureId:
              candidate.fixtureId,

            error:
              message,
          }
        );

        items.push({
          fixtureId:
            candidate.fixtureId,

          keyword:
            candidate.keyword,

          draftId:
            null,

          generated:
            false,

          decision:
            "failed",

          status:
            null,

          reason:
            message,
        });
      }
    }

    return NextResponse.json(
      {
        success:
          true,

        source:
          "ai-ceo-autonomous-seo-cron",

        autonomous:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        safeguards: {
          cronAuthenticated:
            true,

          maximumBatchSize:
            MAX_LIMIT,

          source:
            "published-predictions",

          duplicateValidation:
            true,

          contentQualityValidation:
            true,

          internalLinkValidation:
            true,

          schemaValidation:
            true,

          autonomousLifecycle:
            true,
        },

        summary: {
          requestedLimit:
            limit,

          language,

          candidatesFound:
            candidates.length,

          generatedDrafts:
            generatedCount,

          autoPublishedPages:
            autoPublishedCount,

          reviewPages:
            reviewCount,

          withheldPages:
            withheldCount,

          skippedPages:
            skippedCount,

          failedPages:
            failedCount,

          items,
        },
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[AI_CEO_AUTONOMOUS_SEO_CRON_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "AI CEO autonomous SEO generation failed.";

    return NextResponse.json(
      {
        success:
          false,

        source:
          "ai-ceo-autonomous-seo-cron",

        error:
          message,
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}