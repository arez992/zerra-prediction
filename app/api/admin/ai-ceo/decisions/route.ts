import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runCEOBrain,
} from "@/lib/ai/ceo/brain";
import {
  approveCEODecision,
  applyCEODecisionPolicy,
} from "@/lib/ai/ceo/decisionWorkflow";
import {
  collectCEOMetrics,
} from "@/lib/ai/ceo/metrics";
import {
  evaluateCEODecisionPolicy,
} from "@/lib/ai/ceo/policy";
import {
  runAutomaticCEOShadow,
} from "@/lib/ai/ceo/shadow/service/AutomaticShadowService";
import {
  getLatestCEODecision,
  listCEODecisions,
  saveCEODecision,
} from "@/lib/ai/ceo/storage";
import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSafeLimit(
  value: string | null
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(
    100,
    Math.max(1, Math.floor(parsed))
  );
}

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
    normalized.includes(
      "admin access required"
    ) ||
    normalized.includes("forbidden")
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

export async function GET(
  request: NextRequest
) {
  try {
    await requireServerAdmin();

    const mode =
      request.nextUrl.searchParams.get(
        "mode"
      );

    if (mode === "latest") {
      const decision =
        await getLatestCEODecision();

      return NextResponse.json(
        {
          success: true,
          decision,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const decisions =
      await listCEODecisions(
        getSafeLimit(
          request.nextUrl.searchParams.get(
            "limit"
          )
        )
      );

    return NextResponse.json(
      {
        success: true,
        count:
          decisions.length,
        decisions,
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
        : "Unable to load AI CEO decisions.";

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

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      await requireServerAdmin();

    let instruction:
      | string
      | undefined;

    let autoApprove = false;

    try {
      const body =
        (await request.json()) as {
          instruction?: unknown;
          autoApprove?: unknown;
        };

      instruction =
        typeof body.instruction ===
          "string" &&
        body.instruction.trim()
          ? body.instruction.trim()
          : undefined;

      autoApprove =
        body.autoApprove === true;
    } catch {
      instruction = undefined;
      autoApprove = false;
    }

    const metrics =
      await collectCEOMetrics();

    const engineInput = {
      metrics,
      instruction,
    };

    const result =
      await runCEOBrain(
        engineInput
      );

    if (!result.success) {
      throw new Error(
        result.error
      );
    }

    const createdBy =
      admin.email ||
      admin.uid ||
      "unknown-admin";

    const decisionId =
      await saveCEODecision({
        decision:
          result.decision,
        metrics,
        source:
          result.source,
        createdBy,
        rawResponse:
          result.rawResponse,
      });

    const policy =
      await evaluateCEODecisionPolicy(
        result.decision,
        autoApprove
      );

    await applyCEODecisionPolicy(
      decisionId,
      policy
    );

    let approval:
      | Awaited<
          ReturnType<
            typeof approveCEODecision
          >
        >
      | null = null;

    if (
      policy.eligibleForAutoApproval
    ) {
      approval =
        await approveCEODecision(
          decisionId,
          {
            uid:
              "ai-ceo-policy",
            email:
              "ai-ceo@system.local",
          },
          "auto_low_risk"
        );
    }

    /*
     * Automatic ZAOS shadow validation.
     *
     * This call never changes the legacy decision returned to the user.
     * The service catches its own execution and persistence errors, so a
     * shadow failure cannot fail this production decision request.
     *
     * It is awaited to make Firestore persistence reliable in serverless
     * deployments. The feature flag and sampling configuration determine
     * whether a shadow run actually occurs.
     */
    const shadow =
      await runAutomaticCEOShadow(
        engineInput,
        {
          source:
            "ai-ceo-decisions-api",
          requestId:
            decisionId,
          actorId:
            admin.uid,
          actorEmail:
            admin.email ||
            undefined,
          route:
            "/api/admin/ai-ceo/decisions",
          legacyDecisionId:
            decisionId,
          legacySource:
            result.source,
          autoApproveRequested:
            autoApprove,
          policyAutoApprovalEligible:
            policy.eligibleForAutoApproval,
        }
      );

    if (
      shadow.error ||
      shadow.persistenceError
    ) {
      console.warn(
        "[AI_CEO_AUTOMATIC_SHADOW_WARNING]",
        {
          decisionId,
          error:
            shadow.error,
          persistenceError:
            shadow.persistenceError,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          approval
            ? "AI CEO decision generated, policy-approved, and converted into approved tasks."
            : "AI CEO decision generated and saved for human review.",
        decisionId,
        source:
          result.source,
        metrics,
        decision:
          result.decision,
        policy,
        approval,

        /*
         * Only operational status is returned.
         * The legacy response remains the source of truth.
         */
        shadow: {
          attempted:
            shadow.attempted,
          skipped:
            shadow.skipped,
          persisted:
            shadow.persisted,
          historyRecordId:
            shadow.historyRecordId,
          acceptable:
            shadow.shadow?.acceptable ??
            null,
          score:
            shadow.shadow?.comparison
              ?.overallScore ??
            null,
          error:
            shadow.error ||
            shadow.persistenceError,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[AI_CEO_DECISION_API_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate AI CEO decision.";

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