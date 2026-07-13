import type {
  APIFootballRequestResult,
  APIFootballResponse,
} from "./types";

const API_BASE_URL =
  "https://v3.football.api-sports.io";

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;

function getApiKey(): string {
  const key =
    process.env.API_FOOTBALL_KEY?.trim();

  if (!key) {
    throw new Error(
      "API_FOOTBALL_KEY is missing."
    );
  }

  return key;
}

function parseIntegerHeader(
  value: string | null
): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function hasApiErrors(
  errors: APIFootballResponse<unknown>["errors"]
): boolean {
  if (!errors) {
    return false;
  }

  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  return Object.keys(errors).length > 0;
}

function formatApiErrors(
  errors: APIFootballResponse<unknown>["errors"]
): string {
  if (!errors) {
    return "Unknown API-Football error.";
  }

  if (Array.isArray(errors)) {
    return errors.join("; ");
  }

  return Object.entries(errors)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

function delay(milliseconds: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );
}

export async function apiFootballGet<T>(
  path: string,
  options?: {
    timeoutMs?: number;
    retries?: number;
  }
): Promise<APIFootballRequestResult<T>> {
  const apiKey = getApiKey();

  const timeoutMs =
    options?.timeoutMs ??
    DEFAULT_TIMEOUT_MS;

  const retries =
    options?.retries ??
    DEFAULT_RETRIES;

  let lastError: Error | null = null;

  for (
    let attempt = 0;
    attempt <= retries;
    attempt += 1
  ) {
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/${path}`,
        {
          method: "GET",
          headers: {
            "x-apisports-key": apiKey,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const raw = await response.text();

      let data: APIFootballResponse<T>;

      try {
        data = raw
          ? (JSON.parse(
              raw
            ) as APIFootballResponse<T>)
          : {
              get: path,
              parameters: {},
              errors: [
                "Empty API-Football response.",
              ],
              results: 0,
              paging: {
                current: 1,
                total: 1,
              },
              response: [],
            };
      } catch {
        throw new Error(
          `Invalid API-Football JSON response. HTTP ${response.status}`
        );
      }

      const result: APIFootballRequestResult<T> =
        {
          data,
          status: response.status,
          ok: response.ok,
          rateLimit: {
            limit: parseIntegerHeader(
              response.headers.get(
                "x-ratelimit-requests-limit"
              )
            ),
            remaining:
              parseIntegerHeader(
                response.headers.get(
                  "x-ratelimit-requests-remaining"
                )
              ),
            reset: parseIntegerHeader(
              response.headers.get(
                "x-ratelimit-requests-reset"
              )
            ),
          },
        };

      if (
        !response.ok ||
        hasApiErrors(data.errors)
      ) {
        const message =
          hasApiErrors(data.errors)
            ? formatApiErrors(data.errors)
            : `API-Football request failed with HTTP ${response.status}.`;

        if (
          response.status >= 500 &&
          attempt < retries
        ) {
          lastError = new Error(message);
          await delay(
            350 * (attempt + 1)
          );
          continue;
        }

        throw new Error(message);
      }

      return result;
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(
              "Unknown API-Football request error."
            );

      lastError = normalizedError;

      const retryable =
        normalizedError.name ===
          "AbortError" ||
        normalizedError.message.includes(
          "fetch"
        );

      if (
        retryable &&
        attempt < retries
      ) {
        await delay(
          350 * (attempt + 1)
        );
        continue;
      }

      throw normalizedError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw (
    lastError ||
    new Error(
      "API-Football request failed."
    )
  );
}