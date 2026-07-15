import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  learningService,
  type LearningAgent,
  type LearningOutcome,
} from "@/lib/zaos/learning";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_AGENTS: LearningAgent[] = [
  "ceo",
  "prediction",
  "seo",
  "marketing",
  "finance",
  "cto",
  "risk",
];

const ALLOWED_OUTCOMES: LearningOutcome[] = [
  "success",
  "failure",
  "neutral",
];

function getSafeLimit(
  value: string | null
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(
    50,
    Math.max(
      1,
      Math.floor(parsed)
    )
  );
}

function getSafeOffset(
  value: string | null
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(parsed)
  );
}

function getAgent(
  value: string | null
): LearningAgent | null {
  if (!value) {
    return null;
  }

  return ALLOWED_AGENTS.includes(
    value as LearningAgent
  )
    ? (value as LearningAgent)
    : null;
}

function getOutcome(
  value: string | null
): LearningOutcome | null {
  if (!value) {
    return null;
  }

  return ALLOWED_OUTCOMES.includes(
    value as LearningOutcome
  )
    ? (value as LearningOutcome)
    : null;
}

function getStrategy(
  value: string | null
): string | null {
  const strategy =
    value?.trim().toLowerCase();

  return strategy || null;
}

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "unauthorized"
    ) ||
    normalized.includes(
      "authentication"
    )
  ) {
    return 401;
  }

  if (
    normalized.includes(
      "forbidden"
    ) ||
    normalized.includes(
      "admin access required"
    )
  ) {
    return 403;
  }

  return 500;
}

export async function GET(
  request: NextRequest
) {
  try {
    await requireServerAdmin();

    const searchParams =
      request.nextUrl.searchParams;

    const limit =
      getSafeLimit(
        searchParams.get("limit")
      );

    const offset =
      getSafeOffset(
        searchParams.get("offset")
      );

    const agent =
      getAgent(
        searchParams.get("agent")
      );

    const outcome =
      getOutcome(
        searchParams.get("outcome")
      );

    const strategy =
      getStrategy(
        searchParams.get("strategy")
      );

    /*
     * The service enforces a maximum of 100 records.
     * Filtering and pagination happen in memory to avoid
     * requiring multiple Firestore composite indexes.
     */
    const recentRecords =
      await learningService.recent({
        limit: 100,
      });

    const filteredRecords =
      recentRecords.filter(
        (record) => {
          if (
            agent &&
            record.agent !== agent
          ) {
            return false;
          }

          if (
            outcome &&
            record.outcome !== outcome
          ) {
            return false;
          }

          if (
            strategy &&
            !record.recommendationType
              .toLowerCase()
              .includes(strategy)
          ) {
            return false;
          }

          return true;
        }
      );

    const history =
      filteredRecords.slice(
        offset,
        offset + limit
      );

    const nextOffset =
      offset + history.length;

    const hasMore =
      nextOffset <
      filteredRecords.length;

    return NextResponse.json(
      {
        success: true,
        history,
        filters: {
          agent,
          outcome,
          strategy,
        },
        pagination: {
          offset,
          limit,
          returned:
            history.length,
          total:
            filteredRecords.length,
          scanned:
            recentRecords.length,
          hasMore,
          nextOffset:
            hasMore
              ? nextOffset
              : null,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load ZAOS learning history.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          getErrorStatus(message),
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}