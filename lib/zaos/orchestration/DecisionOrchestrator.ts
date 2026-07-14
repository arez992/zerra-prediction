import "server-only";

import type {
  AIDecision,
  AIDelegation,
  AIExecutionResult,
  AIImprovement,
  AILearning,
  AIObservation,
  AIRecommendation,
  AIReport,
  AIRole,
  AIRoleContext,
  AIVerificationResult,
  AIAnalysis,
  AIPolicyEvaluation,
} from "../core/AIRole";

export const ZAOS_DECISION_ORCHESTRATOR_VERSION = "1.0.0";

export type OrchestratorStage =
  | "idle"
  | "observing"
  | "analyzing"
  | "recommending"
  | "deciding"
  | "policy_review"
  | "delegating"
  | "executing"
  | "verifying"
  | "learning"
  | "improving"
  | "reporting"
  | "completed"
  | "blocked"
  | "failed";

export type OrchestratorEvent = {
  stage: OrchestratorStage;
  createdAt: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type OrchestratorResult = {
  success: boolean;
  version: string;
  roleId: string;
  runId: string;
  stage: OrchestratorStage;

  observations: AIObservation[];
  analysis: AIAnalysis | null;
  recommendations: AIRecommendation[];
  decision: AIDecision | null;
  policy: AIPolicyEvaluation | null;
  delegations: AIDelegation[];
  executionResults: AIExecutionResult[];
  verification: AIVerificationResult | null;
  learning: AILearning | null;
  improvement: AIImprovement | null;
  report: AIReport | null;

  events: OrchestratorEvent[];
  error: string | null;
};

export type DecisionOrchestratorOptions = {
  autoExecuteAllowedDelegations?: boolean;
  stopAfterPolicyReview?: boolean;
  continueWhenNoDelegations?: boolean;
};

function event(
  stage: OrchestratorStage,
  message: string,
  metadata?: Record<string, unknown>
): OrchestratorEvent {
  return {
    stage,
    createdAt: new Date().toISOString(),
    message,
    metadata,
  };
}

function createInitialResult(
  role: AIRole,
  context: AIRoleContext
): OrchestratorResult {
  return {
    success: false,
    version: ZAOS_DECISION_ORCHESTRATOR_VERSION,
    roleId: role.identity.id,
    runId: context.runId,
    stage: "idle",

    observations: [],
    analysis: null,
    recommendations: [],
    decision: null,
    policy: null,
    delegations: [],
    executionResults: [],
    verification: null,
    learning: null,
    improvement: null,
    report: null,

    events: [
      event("idle", "ZAOS decision orchestration initialized."),
    ],
    error: null,
  };
}

export async function runDecisionOrchestrator(
  role: AIRole,
  context: AIRoleContext,
  options: DecisionOrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const result = createInitialResult(role, context);

  try {
    result.stage = "observing";
    result.events.push(
      event("observing", "Collecting verified observations.")
    );

    result.observations = await role.observe(context);

    result.stage = "analyzing";
    result.events.push(
      event("analyzing", "Analyzing observations.", {
        observationCount: result.observations.length,
      })
    );

    result.analysis = await role.analyze(
      result.observations,
      context
    );

    result.stage = "recommending";
    result.events.push(
      event("recommending", "Generating recommendations.")
    );

    result.recommendations = await role.recommend(
      result.analysis,
      context
    );

    result.stage = "deciding";
    result.events.push(
      event("deciding", "Selecting the executive decision.", {
        recommendationCount: result.recommendations.length,
      })
    );

    result.decision = await role.decide(
      result.recommendations,
      result.analysis,
      context
    );

    result.stage = "policy_review";
    result.events.push(
      event("policy_review", "Evaluating decision policy.")
    );

    result.policy = await role.evaluatePolicy(
      result.decision,
      context
    );

    if (!result.policy.allowed) {
      result.stage = "blocked";
      result.error =
        result.policy.reasons.join(" ") ||
        "Decision was blocked by policy.";
      result.events.push(
        event("blocked", "Decision blocked by policy.", {
          reasons: result.policy.reasons,
        })
      );

      return result;
    }

    if (options.stopAfterPolicyReview) {
      result.success = true;
      result.stage = "completed";
      result.events.push(
        event(
          "completed",
          "Decision orchestration stopped after policy review."
        )
      );

      return result;
    }

    result.stage = "delegating";
    result.events.push(
      event("delegating", "Creating delegated tasks.")
    );

    result.delegations = await role.delegate(
      result.decision,
      result.policy,
      context
    );

    const shouldExecute =
      options.autoExecuteAllowedDelegations === true;

    if (shouldExecute) {
      result.stage = "executing";
      result.events.push(
        event("executing", "Executing delegated tasks.", {
          delegationCount: result.delegations.length,
        })
      );

      for (const delegation of result.delegations) {
        const executionResult = await role.execute(
          delegation,
          context
        );

        result.executionResults.push(executionResult);
      }
    } else {
      result.events.push(
        event(
          "delegating",
          "Delegations created and left for external execution.",
          {
            delegationCount: result.delegations.length,
          }
        )
      );
    }

    const canContinueWithoutExecution =
      options.continueWhenNoDelegations === true &&
      result.delegations.length === 0;

    if (!shouldExecute && !canContinueWithoutExecution) {
      result.success = true;
      result.stage = "completed";
      result.events.push(
        event(
          "completed",
          "Decision and delegations created successfully."
        )
      );

      return result;
    }

    result.stage = "verifying";
    result.events.push(
      event("verifying", "Verifying execution outcomes.")
    );

    result.verification = await role.verify(
      result.decision,
      result.executionResults,
      context
    );

    result.stage = "learning";
    result.events.push(
      event("learning", "Creating organizational learning.")
    );

    result.learning = await role.learn(
      result.decision,
      result.verification,
      context
    );

    result.stage = "improving";
    result.events.push(
      event("improving", "Evaluating strategy improvement.")
    );

    result.improvement = await role.improve(
      result.learning,
      context
    );

    result.stage = "reporting";
    result.events.push(
      event("reporting", "Generating executive report.")
    );

    result.report = await role.report(context);

    result.success = true;
    result.stage = "completed";
    result.events.push(
      event("completed", "ZAOS decision orchestration completed.")
    );

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ZAOS decision orchestration failed.";

    result.success = false;
    result.stage = "failed";
    result.error = message;
    result.events.push(event("failed", message));

    return result;
  }
}

export function getLatestOrchestratorEvent(
  result: OrchestratorResult
): OrchestratorEvent | null {
  return result.events.length > 0
    ? result.events[result.events.length - 1]
    : null;
}

export function isOrchestratorFinished(
  result: OrchestratorResult
): boolean {
  return (
    result.stage === "completed" ||
    result.stage === "blocked" ||
    result.stage === "failed"
  );
}