import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  getServerAdminUser,
} from "@/lib/serverAdminAuth";

import type {
  CEOPriority,
  CEORecommendationStatus,
} from "@/types/ceo";

export const dynamic =
  "force-dynamic";
export const revalidate = 0;

type CreateRecommendationBody = {
  title?: string;
  description?: string;
  category?: string;
  country?: string;
  priority?: CEOPriority;
  confidence?: number;
  expectedImpact?: string;
  source?: string;
  executionType?: string;
  executionPayload?: Record<
    string,
    unknown
  >;
};

const allowedPriorities:
  CEOPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

function serializeTimestamp(
  value: unknown
) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function normalizeConfidence(
  value: unknown
) {
  const confidence =
    Number(value);

  if (
    !Number.isFinite(
      confidence
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, confidence)
  );
}

function normalizeNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export async function GET() {
  try {
    const admin =
      await getServerAdminUser();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized admin access",
        },
        {
          status: 401,
        }
      );
    }

    const snapshot =
      await adminDb
        .collection(
          "ceoRecommendations"
        )
        .orderBy(
          "createdAt",
          "desc"
        )
        .limit(100)
        .get();

    const recommendations =
      snapshot.docs
        .filter(
          (document) =>
            document.id !==
            "config"
        )
        .map((document) => {
          const data =
            document.data();

          return {
            id: document.id,
            title:
              data.title || "",
            description:
              data.description || "",
            category:
              data.category ||
              "general",
            country:
              data.country || null,
            priority:
              data.priority ||
              "medium",
            confidence:
              Number(
                data.confidence ||
                0
              ),
            expectedImpact:
              data.expectedImpact ||
              "",
            source:
              data.source ||
              "ai-ceo",
            risk:
              data.risk || null,
            status:
              (
                data.status as CEORecommendationStatus
              ) || "pending",
            executionType:
              data.executionType ||
              null,
            executionPayload:
              data.executionPayload ||
              {},

            generationSource:
              data.generationSource ||
              null,
            canaryRequestId:
              data.canaryRequestId ||
              null,
            dataSnapshotAt:
              data.dataSnapshotAt ||
              null,

            historyScore:
              normalizeNumber(
                data.historyScore
              ),
            recommendedAction:
              data.recommendedAction ||
              null,
            totalMatches:
              normalizeNumber(
                data.totalMatches
              ),
            strongestMatch:
              data.strongestMatch ||
              null,
            decisionHistory:
              data.decisionHistory ||
              null,
            similarDecisionContext:
              data.similarDecisionContext ||
              null,

            impactId:
              data.impactId ||
              null,
            impactScore:
              normalizeNumber(
                data.impactScore
              ),

            createdAt:
              serializeTimestamp(
                data.createdAt
              ),
            updatedAt:
              serializeTimestamp(
                data.updatedAt
              ),
            approvedAt:
              serializeTimestamp(
                data.approvedAt
              ),
            rejectedAt:
              serializeTimestamp(
                data.rejectedAt
              ),
            executedAt:
              serializeTimestamp(
                data.executedAt
              ),
            completedAt:
              serializeTimestamp(
                data.completedAt
              ),

            result:
              data.result || null,
            rejectionReason:
              data.rejectionReason ||
              null,
          };
        });

    const stats =
      recommendations.reduce(
        (
          result,
          recommendation
        ) => {
          const status =
            recommendation.status;

          if (
            status in result
          ) {
            result[
              status as keyof typeof result
            ] += 1;
          }

          return result;
        },
        {
          pending: 0,
          approved: 0,
          rejected: 0,
          executing: 0,
          completed: 0,
          failed: 0,
        }
      );

    return NextResponse.json({
      success: true,
      recommendations,
      stats,
      count:
        recommendations.length,
      checkedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "AI CEO recommendations GET failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load AI CEO recommendations.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await getServerAdminUser();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized admin access",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json() as
        CreateRecommendationBody;

    const title =
      body.title?.trim();

    const description =
      body.description?.trim();

    const category =
      body.category?.trim() ||
      "general";

    const priority =
      body.priority ||
      "medium";

    const expectedImpact =
      body.expectedImpact?.trim() ||
      "";

    const source =
      body.source?.trim() ||
      "ai-ceo";

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recommendation title is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recommendation description is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedPriorities.includes(
        priority
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid recommendation priority",
        },
        {
          status: 400,
        }
      );
    }

    const recommendation = {
      title,
      description,
      category,
      country:
        body.country?.trim() ||
        null,
      priority,
      confidence:
        normalizeConfidence(
          body.confidence
        ),
      expectedImpact,
      source,
      status:
        "pending" as const,
      executionType:
        body.executionType?.trim() ||
        null,
      executionPayload:
        body.executionPayload ||
        {},

      createdBy:
        admin.email ||
        admin.uid ||
        "admin",
      createdAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),

      approvedAt: null,
      rejectedAt: null,
      executedAt: null,
      completedAt: null,
      result: null,
      rejectionReason: null,

      historyScore: null,
      recommendedAction:
        "insufficient-history",
      totalMatches: 0,
      strongestMatch: null,
      decisionHistory: null,
      similarDecisionContext:
        null,
      impactId: null,
      impactScore: null,
    };

    const document =
      await adminDb
        .collection(
          "ceoRecommendations"
        )
        .add(
          recommendation
        );

    const now =
      new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        message:
          "Recommendation created successfully",
        recommendation: {
          id:
            document.id,
          ...recommendation,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "AI CEO recommendations POST failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create AI CEO recommendation.",
      },
      {
        status: 500,
      }
    );
  }
}