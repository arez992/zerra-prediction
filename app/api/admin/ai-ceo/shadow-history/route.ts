import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateShadowHistoryStats,
} from "@/lib/ai/ceo/shadow/storage/ShadowHistory";
import {
  createFirestoreShadowHistoryStore,
  isFirestoreShadowPersistenceEnabled,
} from "@/lib/ai/ceo/shadow/storage/FirestoreShadowHistoryStore";
import type {
  ShadowComparisonStatus,
} from "@/lib/ai/ceo/shadow/ShadowComparison";
import type {
  ShadowHistoryQuery,
} from "@/lib/ai/ceo/shadow/storage/ShadowTypes";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_STATUSES: ShadowComparisonStatus[] = [
  "match",
  "partial_match",
  "mismatch",
  "unavailable",
];

function getErrorStatus(
  message: string
): number {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("unauthorized") ||
    normalized.includes(
      "authentication required"
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

  return 500;
}

function parseBoolean(
  value: string | null
): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  const normalized =
    value.trim().toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0"
  ) {
    return false;
  }

  return undefined;
}

function parseNumber(
  value: string | null,
  minimum: number,
  maximum: number
): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.min(
    maximum,
    Math.max(minimum, parsed)
  );
}

function parseStatus(
  value: string | null
): ShadowComparisonStatus | undefined {
  if (
    value &&
    ALLOWED_STATUSES.includes(
      value as ShadowComparisonStatus
    )
  ) {
    return value as ShadowComparisonStatus;
  }

  return undefined;
}

function parseDate(
  value: string | null
): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  return date.toISOString();
}

function buildQuery(
  request: NextRequest
): ShadowHistoryQuery {
  const params =
    request.nextUrl.searchParams;

  return {
    limit:
      parseNumber(
        params.get("limit"),
        1,
        500
      ) ?? 100,

    minimumScore:
      parseNumber(
        params.get("minimumScore"),
        0,
        100
      ),

    maximumScore:
      parseNumber(
        params.get("maximumScore"),
        0,
        100
      ),

    status:
      parseStatus(
        params.get("status")
      ),

    acceptable:
      parseBoolean(
        params.get("acceptable")
      ),

    success:
      parseBoolean(
        params.get("success")
      ),

    from:
      parseDate(
        params.get("from")
      ),

    to:
      parseDate(
        params.get("to")
      ),
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    const persistenceEnabled =
      isFirestoreShadowPersistenceEnabled();

    if (!persistenceEnabled) {
      return NextResponse.json(
        {
          success: true,
          persistenceEnabled: false,
          requestedBy:
            admin.email ||
            admin.uid,
          records: [],
          stats:
            calculateShadowHistoryStats(
              []
            ),
          count: 0,
          checkedAt:
            new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const query =
      buildQuery(request);

    const store =
      createFirestoreShadowHistoryStore();

    const records =
      await store.list(query);

    const stats =
      calculateShadowHistoryStats(
        records
      );

    return NextResponse.json(
      {
        success: true,
        persistenceEnabled: true,
        requestedBy:
          admin.email ||
          admin.uid,
        query,
        records,
        stats,
        count:
          records.length,
        checkedAt:
          new Date().toISOString(),
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
        : "Unable to load AI CEO shadow history.";

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