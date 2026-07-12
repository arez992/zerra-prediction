import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TimestampLike = {
  toDate: () => Date;
};

function serializeTimestamp(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate ===
      "function"
  ) {
    return (value as TimestampLike)
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function timestampToMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate ===
      "function"
  ) {
    return (value as TimestampLike)
      .toDate()
      .getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireServerAdmin();

    const { id } = await context.params;
    const draftId = decodeURIComponent(id || "").trim();

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft ID is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const draftDocument = await adminDb
      .collection("seoPageDrafts")
      .doc(draftId)
      .get();

    if (!draftDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO draft was not found.",
        },
        { status: 404 }
      );
    }

    const snapshot = await adminDb
      .collection("seoPageVersions")
      .where("draftId", "==", draftId)
      .get();

    const versions = snapshot.docs
      .map((document) => {
        const data = document.data() ?? {};
        const versionSnapshot =
          data.snapshot &&
          typeof data.snapshot === "object"
            ? (data.snapshot as Record<string, unknown>)
            : {};

        return {
          id: document.id,
          sourceAction:
            typeof data.sourceAction === "string"
              ? data.sourceAction
              : "unknown",
          createdBy:
            typeof data.createdBy === "string"
              ? data.createdBy
              : null,
          createdAt: serializeTimestamp(
            data.createdAt
          ),
          createdAtMillis: timestampToMillis(
            data.createdAt
          ),
          status:
            typeof versionSnapshot.status === "string"
              ? versionSnapshot.status
              : "draft",
          title:
            typeof versionSnapshot.title === "string"
              ? versionSnapshot.title
              : "Untitled SEO page",
          canonicalPath:
            typeof versionSnapshot.canonicalPath ===
            "string"
              ? versionSnapshot.canonicalPath
              : null,
        };
      })
      .sort(
        (first, second) =>
          second.createdAtMillis -
          first.createdAtMillis
      )
      .slice(0, 50)
      .map(
        ({
          createdAtMillis: _createdAtMillis,
          ...version
        }) => version
      );

    return NextResponse.json(
      {
        success: true,
        versions,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[SEO_VERSIONS_GET_ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load SEO page versions.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message === "Unauthorized admin access"
            ? 401
            : 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}