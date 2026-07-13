import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  Timestamp,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";
import {
  createSEOPageDraft,
  listSEOPageDrafts,
} from "@/lib/ai-ceo/pageGenerator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_DAILY_DRAFT_LIMIT = 10;
const MAX_DAILY_DRAFT_LIMIT = 100;

type DailyQuota = {
  limit: number;
  used: number;
  remaining: number;
  window: {
    timezone: "UTC";
    date: string;
    startsAt: string;
    endsAt: string;
  };
};

function getDailyDraftLimit(): number {
  const configuredLimit = Number.parseInt(
    process.env.SEO_DAILY_DRAFT_LIMIT || "",
    10
  );

  if (
    !Number.isFinite(configuredLimit) ||
    configuredLimit < 1
  ) {
    return DEFAULT_DAILY_DRAFT_LIMIT;
  }

  return Math.min(
    configuredLimit,
    MAX_DAILY_DRAFT_LIMIT
  );
}

function getUTCDailyWindow(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const day = referenceDate.getUTCDate();

  const startsAt = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0)
  );

  const endsAt = new Date(
    Date.UTC(year, month, day + 1, 0, 0, 0, 0)
  );

  return {
    date: startsAt.toISOString().slice(0, 10),
    startsAt,
    endsAt,
  };
}

async function getDailyQuota(): Promise<DailyQuota> {
  const limit = getDailyDraftLimit();
  const window = getUTCDailyWindow();

  const countSnapshot = await adminDb
    .collection("seoPageDrafts")
    .where(
      "createdAt",
      ">=",
      Timestamp.fromDate(window.startsAt)
    )
    .where(
      "createdAt",
      "<",
      Timestamp.fromDate(window.endsAt)
    )
    .count()
    .get();

  const used = countSnapshot.data().count;
  const remaining = Math.max(limit - used, 0);

  return {
    limit,
    used,
    remaining,
    window: {
      timezone: "UTC",
      date: window.date,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
    },
  };
}

function quotaHeaders(quota: DailyQuota) {
  return {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(quota.limit),
    "X-RateLimit-Remaining": String(
      quota.remaining
    ),
    "X-RateLimit-Reset":
      quota.window.endsAt,
  };
}

function getErrorStatus(message: string): number {
  const normalizedMessage =
    message.toLowerCase();

  if (
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes(
      "authentication required"
    ) ||
    normalizedMessage.includes(
      "not authenticated"
    )
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes("forbidden") ||
    normalizedMessage.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  if (normalizedMessage.includes("already exists")) {
    return 409;
  }

  if (
    normalizedMessage.includes("required") ||
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("not found")
  ) {
    return 400;
  }

  return 500;
}

export async function GET() {
  try {
    await requireServerAdmin();

    const [drafts, quota] =
      await Promise.all([
        listSEOPageDrafts(100),
        getDailyQuota(),
      ]);

    return NextResponse.json(
      {
        success: true,
        drafts,
        count: drafts.length,
        dailyQuota: quota,
      },
      {
        status: 200,
        headers: quotaHeaders(quota),
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load SEO page drafts.";

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

export async function POST(
  request: NextRequest
) {
  try {
    const admin = await requireServerAdmin();

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<
        string,
        unknown
      >;
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

    const keyword = String(
      body.keyword || ""
    ).trim();

    const language =
      body.language === "ku" ? "ku" : "en";

    const country = body.country
      ? String(body.country).trim()
      : null;

    const fixtureId = body.fixtureId
      ? String(body.fixtureId).trim()
      : null;

    const fixtureDate = body.fixtureDate
      ? String(body.fixtureDate).trim()
      : null;

    const sourceRecommendationId =
      body.sourceRecommendationId
        ? String(
            body.sourceRecommendationId
          ).trim()
        : null;

    if (!keyword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SEO keyword is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (
      fixtureId &&
      !/^\d+$/.test(fixtureId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid fixture ID is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const quotaBeforeCreation =
      await getDailyQuota();

    if (quotaBeforeCreation.remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The daily SEO draft creation limit has been reached.",
          code: "SEO_DAILY_DRAFT_LIMIT_REACHED",
          dailyQuota: quotaBeforeCreation,
        },
        {
          status: 429,
          headers: {
            ...quotaHeaders(
              quotaBeforeCreation
            ),
            "Retry-After": String(
              Math.max(
                Math.ceil(
                  (
                    new Date(
                      quotaBeforeCreation.window.endsAt
                    ).getTime() -
                    Date.now()
                  ) / 1000
                ),
                1
              )
            ),
          },
        }
      );
    }

    const draft = await createSEOPageDraft({
      keyword,
      language,
      country,
      fixtureId,
      fixtureDate,
      sourceRecommendationId,
      createdBy:
        admin.email ||
        admin.uid ||
        "admin",
    });

    const quotaAfterCreation: DailyQuota = {
      ...quotaBeforeCreation,
      used: quotaBeforeCreation.used + 1,
      remaining: Math.max(
        quotaBeforeCreation.remaining - 1,
        0
      ),
    };

    return NextResponse.json(
      {
        success: true,
        message: fixtureId
          ? "AI football SEO draft created from factual fixture data."
          : "Template SEO page draft created successfully.",
        draft,
        dailyQuota: quotaAfterCreation,
      },
      {
        status: 201,
        headers: quotaHeaders(
          quotaAfterCreation
        ),
      }
    );
  } catch (error) {
    console.error(
      "[SEO_PAGE_DRAFT_CREATE_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create SEO page draft.";

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