import type {
  SEOFAQItem,
  SEOPageLanguage,
  SEOPageSection,
  SEOPublicContent,
  SEOVIPContent,
} from "@/types/seo-page";

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const DEFAULT_MODEL = "gpt-5.5-mini";

type FootballApiResponse<T> = {
  response?: T;
  results?: number;
  errors?: unknown;
};

type FixtureFacts = {
  fixtureId: string;
  fixtureDate: string | null;
  timezone: string | null;
  venue: {
    name: string | null;
    city: string | null;
  };
  league: {
    id: number | null;
    name: string | null;
    country: string | null;
    season: number | null;
    round: string | null;
  };
  teams: {
    home: {
      id: number | null;
      name: string | null;
    };
    away: {
      id: number | null;
      name: string | null;
    };
  };
  score: {
    home: number | null;
    away: number | null;
  };
  status: {
    short: string | null;
    long: string | null;
  };
  statistics: unknown[];
  lineups: unknown[];
};

export type GeneratedSEOContent = {
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: SEOPageSection[];
  faq: SEOFAQItem[];
  relatedKeywords: string[];
  publicContent: SEOPublicContent;
  vipContent: SEOVIPContent;
  schemaType: "SportsEvent";
  factualDataAvailable: boolean;
  model: string;
};

function getFootballApiKey(): string {
  const key =
    process.env.API_SPORTS_KEY ||
    process.env.API_FOOTBALL_KEY;

  if (!key) {
    throw new Error(
      "Football API key is missing. Set API_SPORTS_KEY or API_FOOTBALL_KEY."
    );
  }

  return key;
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  return key;
}

async function fetchFootballApi<T>(
  path: string,
  apiKey: string
): Promise<T> {
  const response = await fetch(
    `https://v3.football.api-sports.io/${path}`,
    {
      method: "GET",
      headers: {
        "x-apisports-key": apiKey,
      },
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as FootballApiResponse<T>;

  if (!response.ok) {
    throw new Error(
      `Football API request failed with HTTP ${response.status}.`
    );
  }

  if (
    data.errors &&
    typeof data.errors === "object" &&
    Object.keys(data.errors as object).length > 0
  ) {
    throw new Error(
      `Football API returned an error: ${JSON.stringify(
        data.errors
      )}`
    );
  }

  return data.response as T;
}

function cleanArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function loadFixtureFacts(
  fixtureId: string
): Promise<FixtureFacts> {
  const cleanFixtureId = String(fixtureId || "").trim();

  if (!/^\d+$/.test(cleanFixtureId)) {
    throw new Error("A valid fixture ID is required.");
  }

  const apiKey = getFootballApiKey();

  const [fixtures, statistics, lineups] =
    await Promise.all([
      fetchFootballApi<any[]>(
        `fixtures?id=${encodeURIComponent(
          cleanFixtureId
        )}`,
        apiKey
      ),
      fetchFootballApi<any[]>(
        `fixtures/statistics?fixture=${encodeURIComponent(
          cleanFixtureId
        )}`,
        apiKey
      ).catch(() => []),
      fetchFootballApi<any[]>(
        `fixtures/lineups?fixture=${encodeURIComponent(
          cleanFixtureId
        )}`,
        apiKey
      ).catch(() => []),
    ]);

  const match = Array.isArray(fixtures)
    ? fixtures[0]
    : null;

  if (!match) {
    throw new Error(
      "The selected football fixture was not found."
    );
  }

  return {
    fixtureId: cleanFixtureId,
    fixtureDate:
      typeof match?.fixture?.date === "string"
        ? match.fixture.date
        : null,
    timezone:
      typeof match?.fixture?.timezone === "string"
        ? match.fixture.timezone
        : null,
    venue: {
      name:
        typeof match?.fixture?.venue?.name === "string"
          ? match.fixture.venue.name
          : null,
      city:
        typeof match?.fixture?.venue?.city === "string"
          ? match.fixture.venue.city
          : null,
    },
    league: {
      id:
        typeof match?.league?.id === "number"
          ? match.league.id
          : null,
      name:
        typeof match?.league?.name === "string"
          ? match.league.name
          : null,
      country:
        typeof match?.league?.country === "string"
          ? match.league.country
          : null,
      season:
        typeof match?.league?.season === "number"
          ? match.league.season
          : null,
      round:
        typeof match?.league?.round === "string"
          ? match.league.round
          : null,
    },
    teams: {
      home: {
        id:
          typeof match?.teams?.home?.id === "number"
            ? match.teams.home.id
            : null,
        name:
          typeof match?.teams?.home?.name === "string"
            ? match.teams.home.name
            : null,
      },
      away: {
        id:
          typeof match?.teams?.away?.id === "number"
            ? match.teams.away.id
            : null,
        name:
          typeof match?.teams?.away?.name === "string"
            ? match.teams.away.name
            : null,
      },
    },
    score: {
      home:
        typeof match?.goals?.home === "number"
          ? match.goals.home
          : null,
      away:
        typeof match?.goals?.away === "number"
          ? match.goals.away
          : null,
    },
    status: {
      short:
        typeof match?.fixture?.status?.short === "string"
          ? match.fixture.status.short
          : null,
      long:
        typeof match?.fixture?.status?.long === "string"
          ? match.fixture.status.long
          : null,
    },
    statistics: cleanArray(statistics),
    lineups: cleanArray(lineups),
  };
}

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const output = Array.isArray(data?.output)
    ? data.output
    : [];

  for (const item of output) {
    const content = Array.isArray(item?.content)
      ? item.content
      : [];

    for (const part of content) {
      if (typeof part?.text === "string") {
        return part.text;
      }
    }
  }

  return "";
}

function cleanText(
  value: unknown,
  maximumLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function cleanNumber(
  value: unknown,
  minimum: number,
  maximum: number
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(parsed)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, Math.round(parsed))
  );
}

function validateStringList(
  value: unknown,
  maximumItems: number,
  maximumLength: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => cleanText(item, maximumLength))
        .filter(Boolean)
    )
  ).slice(0, maximumItems);
}

function validateSections(
  value: unknown
): SEOPageSection[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "OpenAI content is missing sections."
    );
  }

  const sections = value
    .map((item) => ({
      heading: cleanText(item?.heading, 180),
      content: cleanText(item?.content, 5000),
    }))
    .filter(
      (item) => item.heading && item.content
    )
    .slice(0, 10);

  if (sections.length < 4) {
    throw new Error(
      "OpenAI content did not include enough valid sections."
    );
  }

  return sections;
}

function validateFAQ(value: unknown): SEOFAQItem[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenAI content is missing FAQ.");
  }

  const faq = value
    .map((item) => ({
      question: cleanText(item?.question, 300),
      answer: cleanText(item?.answer, 2000),
    }))
    .filter(
      (item) => item.question && item.answer
    )
    .slice(0, 8);

  if (faq.length < 2) {
    throw new Error(
      "OpenAI content did not include enough valid FAQ items."
    );
  }

  return faq;
}

function validateRiskLevel(
  value: unknown
): SEOPublicContent["riskLevel"] {
  if (value === "Low") {
    return "Low";
  }

  if (value === "High") {
    return "High";
  }

  return "Medium";
}

function validatePublicContent(
  value: unknown
): SEOPublicContent {
  if (!value || typeof value !== "object") {
    throw new Error(
      "OpenAI content is missing publicContent."
    );
  }

  const source = value as Record<string, unknown>;

  const publicContent: SEOPublicContent = {
    overview: cleanText(source.overview, 5000),
    recentForm: cleanText(source.recentForm, 5000),
    headToHead: cleanText(source.headToHead, 5000),
    homeAwayStats: cleanText(
      source.homeAwayStats,
      5000
    ),
    injuries: cleanText(source.injuries, 5000),
    aiSummary: cleanText(source.aiSummary, 2500),
    riskLevel: validateRiskLevel(
      source.riskLevel
    ),
    keyInsights: validateStringList(
      source.keyInsights,
      5,
      500
    ),
  };

  if (
    !publicContent.overview ||
    !publicContent.aiSummary ||
    publicContent.keyInsights.length < 1
  ) {
    throw new Error(
      "OpenAI public content is incomplete."
    );
  }

  return publicContent;
}

function validateVIPContent(
  value: unknown
): SEOVIPContent {
  if (!value || typeof value !== "object") {
    throw new Error(
      "OpenAI content is missing vipContent."
    );
  }

  const source = value as Record<string, unknown>;

  const vipContent: SEOVIPContent = {
    finalPrediction: cleanText(
      source.finalPrediction,
      500
    ),
    confidence: cleanNumber(
      source.confidence,
      0,
      100
    ),
    exactScore: cleanText(source.exactScore, 100),
    bestMarket: cleanText(source.bestMarket, 300),
    alternativeMarkets: validateStringList(
      source.alternativeMarkets,
      5,
      300
    ),
    valuePick: cleanText(source.valuePick, 500),
    reasoning: cleanText(source.reasoning, 7000),
  };

  if (
    !vipContent.finalPrediction ||
    !vipContent.bestMarket ||
    !vipContent.reasoning
  ) {
    throw new Error(
      "OpenAI VIP content is incomplete."
    );
  }

  return vipContent;
}

function validateGeneratedContent(
  value: unknown,
  model: string
): GeneratedSEOContent {
  if (!value || typeof value !== "object") {
    throw new Error(
      "OpenAI returned an invalid content object."
    );
  }

  const source = value as Record<string, unknown>;

  const title = cleanText(source.title, 180);
  const metaDescription = cleanText(
    source.metaDescription,
    320
  );
  const h1 = cleanText(source.h1, 200);
  const intro = cleanText(source.intro, 3000);

  if (!title || !metaDescription || !h1 || !intro) {
    throw new Error(
      "OpenAI content is missing required SEO fields."
    );
  }

  return {
    title,
    metaDescription,
    h1,
    intro,
    sections: validateSections(source.sections),
    faq: validateFAQ(source.faq),
    relatedKeywords: validateStringList(
      source.relatedKeywords,
      12,
      120
    ),
    publicContent: validatePublicContent(
      source.publicContent
    ),
    vipContent: validateVIPContent(
      source.vipContent
    ),
    schemaType: "SportsEvent",
    factualDataAvailable: true,
    model,
  };
}

export async function generateFixtureSEOContent(input: {
  keyword: string;
  language: SEOPageLanguage;
  country?: string | null;
  fixtureId: string;
}): Promise<{
  content: GeneratedSEOContent;
  facts: FixtureFacts;
}> {
  const facts = await loadFixtureFacts(input.fixtureId);
  const apiKey = getOpenAIKey();
  const model =
    process.env.OPENAI_SEO_MODEL ||
    DEFAULT_MODEL;

  const languageInstruction =
    input.language === "ku"
      ? "Write in clear Sorani Kurdish. Keep team, league, and player names exactly as supplied."
      : "Write in professional, natural English.";

  const prompt = `
You are the ZERRA SEO Content Writer for a football-only prediction platform.

Create one private draft with TWO strictly separated layers:

1. PUBLIC SEO CONTENT
Useful, factual, people-first content that can be indexed publicly.
It must build trust and curiosity but MUST NOT reveal the paid prediction.

2. VIP CONTENT
Premium match intelligence stored privately for authenticated VIP users only.

STRICT FACTUAL RULES:
- Use only facts present in FACTUAL_DATA.
- Never invent injuries, form, head-to-head records, lineups, statistics, odds, or historical results.
- If factual data is unavailable, say it is unavailable or omit it.
- Any prediction is an AI interpretation, not a verified fact.
- Never promise or guarantee a result.
- Never claim certainty.
- Do not manufacture bookmaker odds or market value.
- The entire result remains a private draft requiring human approval.
- ${languageInstruction}

PUBLIC CONTENT MUST NOT REVEAL:
- final prediction or winning team
- exact score
- confidence percentage
- BTTS yes/no
- over/under selection
- handicap selection
- best betting market
- value pick
- alternative picks
- full prediction reasoning

PUBLIC CONTENT MAY INCLUDE:
- match overview
- available recent-form context
- available head-to-head context
- available home/away statistics
- available injury or lineup context
- short non-conclusive AI summary
- transparent Low/Medium/High risk level
- one to five general key insights
- FAQ that does not reveal premium answers

VIP CONTENT MAY INCLUDE:
- final AI prediction
- confidence percentage
- exact-score estimate
- best market
- alternative markets
- value-pick interpretation
- full AI reasoning

When data is insufficient for a confident VIP field:
- use cautious wording
- use "Unavailable" for exactScore or valuePick when appropriate
- keep confidence conservative
- explain the limitation in reasoning

SEO keyword:
${input.keyword}

Country context:
${input.country || "Not specified"}

FACTUAL_DATA:
${JSON.stringify(facts, null, 2)}

Return ONLY valid JSON with this exact shape:
{
  "title": "SEO title that does not reveal the final pick",
  "metaDescription": "public meta description without premium prediction details",
  "h1": "public page heading",
  "intro": "public introductory paragraph",
  "sections": [
    {
      "heading": "public section heading",
      "content": "public content without premium prediction details"
    }
  ],
  "faq": [
    {
      "question": "public question",
      "answer": "public answer without revealing VIP details"
    }
  ],
  "relatedKeywords": ["keyword"],
  "publicContent": {
    "overview": "public overview",
    "recentForm": "public factual form context or an availability notice",
    "headToHead": "public factual H2H context or an availability notice",
    "homeAwayStats": "public factual stats context or an availability notice",
    "injuries": "public injury or lineup context or an availability notice",
    "aiSummary": "short non-conclusive summary that preserves VIP value",
    "riskLevel": "Low | Medium | High",
    "keyInsights": ["general public insight"]
  },
  "vipContent": {
    "finalPrediction": "private AI interpretation",
    "confidence": 0,
    "exactScore": "private estimate or Unavailable",
    "bestMarket": "private market interpretation",
    "alternativeMarkets": ["private alternative"],
    "valuePick": "private value interpretation or Unavailable",
    "reasoning": "private full reasoning with limitations"
  }
}

Requirements:
- Include 4 to 7 PUBLIC sections.
- Include 2 to 5 PUBLIC FAQ items.
- Keep the public meta description concise.
- Include transparent risk language.
- Clearly distinguish factual match details from AI interpretation.
- Never place any vipContent field or answer inside title, metaDescription, h1, intro, sections, faq, or publicContent.
`;

  const response = await fetch(
    OPENAI_RESPONSES_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed with HTTP ${response.status}: ${JSON.stringify(
        data
      ).slice(0, 500)}`
    );
  }

  const text = extractOutputText(data);

  if (!text) {
    throw new Error(
      "OpenAI returned an empty SEO content response."
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "OpenAI returned invalid JSON for the SEO draft."
    );
  }

  return {
    content: validateGeneratedContent(
      parsed,
      model
    ),
    facts,
  };
}