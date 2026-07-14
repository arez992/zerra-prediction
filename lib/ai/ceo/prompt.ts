import type {
  CEOEngineInput,
} from "./types";

export const CEO_SYSTEM_PROMPT = `
You are the AI CEO decision layer for ZERRA, a football intelligence platform.

Your role is to analyze verified operating metrics and return structured executive decisions.

Rules:
1. Never invent data.
2. Never claim a metric exists when it is null.
3. Add missing metrics to insufficientData.
4. Base every action on supplied evidence.
5. Protect user trust, prediction quality, VIP quality, SEO quality, revenue, and system safety.
6. No AI-generated prediction may be auto-published.
7. Publishing, pricing, subscription, marketing-spend, deletion, refund, and financial actions always require human approval.
8. Operational investigations may be recommended without approval, but destructive actions are forbidden.
9. Return valid JSON only.
10. Confidence must be between 0 and 100.
11. Use the exact schema requested.
`;

export function buildCEOUserPrompt(
  input: CEOEngineInput
): string {
  return JSON.stringify(
    {
      task:
        "Analyze these verified ZERRA metrics and produce one executive decision object.",
      engineVersion: "1.0.0",
      additionalInstruction:
        input.instruction || null,
      metrics: input.metrics,
      requiredSchema: {
        version: "string",
        generatedAt: "ISO timestamp",
        summary: "string",
        confidence: "number 0-100",
        overallHealth:
          "Excellent | Good | Warning | Critical",
        insufficientData: ["string"],
        todayPriorities: [
          {
            id: "string",
            title: "string",
            reason: "string",
            impact:
              "Low | Medium | High",
            urgency:
              "Low | Medium | High",
            requiresApproval: "boolean",
            actionKey:
              "publishPredictions | publishArticles | promoteVip | pauseMarketing | improveSeo | retrainAi | investigateApi | null",
          },
        ],
        actions: {
          publishPredictions: {
            enabled: "boolean",
            requiresApproval: true,
            reason: "string",
          },
          publishArticles: {
            enabled: "boolean",
            requiresApproval: true,
            reason: "string",
          },
          promoteVip: {
            enabled: "boolean",
            requiresApproval: true,
            reason: "string",
          },
          pauseMarketing: {
            enabled: "boolean",
            requiresApproval: true,
            reason: "string",
          },
          improveSeo: {
            enabled: "boolean",
            requiresApproval: true,
            reason: "string",
          },
          retrainAi: {
            enabled: "boolean",
            requiresApproval: true,
            reason: "string",
          },
          investigateApi: {
            enabled: "boolean",
            requiresApproval: false,
            reason: "string",
          },
        },
        risks: [
          {
            title: "string",
            level:
              "Low | Medium | High | Critical",
            reason: "string",
            mitigation: "string",
          },
        ],
        opportunities: [
          {
            title: "string",
            reason: "string",
            expectedImpact:
              "Low | Medium | High",
            nextStep: "string",
          },
        ],
        evidence: ["string"],
      },
    },
    null,
    2
  );
}