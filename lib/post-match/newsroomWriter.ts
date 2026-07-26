import "server-only";

import type { VerifiedPostMatchSnapshot } from "@/lib/post-match/collector";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";

export type GeneratedPostMatchReport = {
  headline: string;
  summary: string;
  matchReport: string;
  postMatchAnalysis: string;
};

function getOutputText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

export async function generatePostMatchNewsroomReport(
  snapshot: VerifiedPostMatchSnapshot
): Promise<{ report: GeneratedPostMatchReport; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing.");

  const model = process.env.OPENAI_POST_MATCH_MODEL?.trim() || process.env.OPENAI_SEO_MODEL?.trim() || DEFAULT_MODEL;

  const system = `You are the ZERRA Post-Match Newsroom Writer. Write professional football journalism using ONLY the verified data supplied. Never invent goalscorers, cards, substitutions, shots, possession, lineups, injuries, quotes, tactics, standings, venue details, attendance, or any other fact. If data is unavailable, omit the claim. Clearly keep factual reporting separate from interpretation. This is PUBLIC editorial content. NEVER reveal or infer any ZERRA VIP prediction, confidence score, exact-score prediction, betting market, value pick, risk score, or private prediction reasoning. Do not claim ZERRA predicted the result. Do not write betting advice. Tone: concise, polished, neutral sports newsroom English.`;

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Create the post-match report from this VERIFIED_MATCH_DATA only:\n${JSON.stringify(snapshot)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "zerra_post_match_report",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              matchReport: { type: "string" },
              postMatchAnalysis: { type: "string" },
            },
            required: ["headline", "summary", "matchReport", "postMatchAnalysis"],
          },
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`OpenAI post-match request failed with HTTP ${response.status}: ${JSON.stringify(data).slice(0,500)}`);
  }

  const text = getOutputText(data);
  if (!text) throw new Error("OpenAI returned an empty post-match report.");

  let parsed: GeneratedPostMatchReport;
  try {
    parsed = JSON.parse(text) as GeneratedPostMatchReport;
  } catch {
    throw new Error("OpenAI returned invalid post-match JSON.");
  }

  for (const key of ["headline","summary","matchReport","postMatchAnalysis"] as const) {
    if (typeof parsed[key] !== "string" || !parsed[key].trim()) {
      throw new Error(`OpenAI post-match report is missing ${key}.`);
    }
    parsed[key] = parsed[key].trim();
  }

  return { report: parsed, model };
}