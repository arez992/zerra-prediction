import { NextRequest, NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type LinkHealthStatus =
  | "healthy"
  | "redirect"
  | "broken"
  | "error";

type CheckedLink = {
  link: string;
  normalizedLink: string;
  status: LinkHealthStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  responseTimeMs: number;
  message: string;
};

const MAX_LINKS = 20;
const REQUEST_TIMEOUT_MS = 8000;

function normalizeInternalPath(value: unknown): string {
  const raw = String(value || "").trim();

  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "";
  }

  const withoutHash = raw.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  const collapsed = withoutQuery.replace(/\/+/g, "/");

  if (!/^\/(en|ku)(?=\/|$)/.test(collapsed)) {
    return "";
  }

  return collapsed === "/"
    ? "/"
    : collapsed.replace(/\/+$/, "");
}

async function requestLink(
  url: URL,
  method: "HEAD" | "GET"
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    return await fetch(url, {
      method,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "ZERRA-Internal-Link-Checker/1.0",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkLink(
  origin: string,
  link: string
): Promise<CheckedLink> {
  const normalizedLink = normalizeInternalPath(link);
  const startedAt = Date.now();

  if (!normalizedLink) {
    return {
      link,
      normalizedLink: "",
      status: "error",
      httpStatus: null,
      finalUrl: null,
      responseTimeMs: Date.now() - startedAt,
      message:
        "Only localized internal paths beginning with /en or /ku can be checked.",
    };
  }

  const target = new URL(normalizedLink, origin);

  if (target.origin !== origin) {
    return {
      link,
      normalizedLink,
      status: "error",
      httpStatus: null,
      finalUrl: null,
      responseTimeMs: Date.now() - startedAt,
      message: "Cross-origin link checking is not allowed.",
    };
  }

  try {
    let response = await requestLink(target, "HEAD");

    if (
      response.status === 405 ||
      response.status === 501
    ) {
      response = await requestLink(target, "GET");
    }

    const httpStatus = response.status;
    const responseTimeMs = Date.now() - startedAt;

    if (httpStatus >= 200 && httpStatus < 300) {
      return {
        link,
        normalizedLink,
        status: "healthy",
        httpStatus,
        finalUrl: response.headers.get("location"),
        responseTimeMs,
        message: "The internal route responded successfully.",
      };
    }

    if (httpStatus >= 300 && httpStatus < 400) {
      return {
        link,
        normalizedLink,
        status: "redirect",
        httpStatus,
        finalUrl: response.headers.get("location"),
        responseTimeMs,
        message:
          "The internal route redirects and should be reviewed.",
      };
    }

    return {
      link,
      normalizedLink,
      status: "broken",
      httpStatus,
      finalUrl: null,
      responseTimeMs,
      message: `The internal route returned HTTP ${httpStatus}.`,
    };
  } catch (error) {
    const isAbort =
      error instanceof Error &&
      error.name === "AbortError";

    return {
      link,
      normalizedLink,
      status: "error",
      httpStatus: null,
      finalUrl: null,
      responseTimeMs: Date.now() - startedAt,
      message: isAbort
        ? `The request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`
        : error instanceof Error
          ? error.message
          : "Unable to check the internal route.",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireServerAdmin();

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<
        string,
        unknown
      >;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const rawLinks = Array.isArray(body.links)
      ? body.links
      : [];

    const links = Array.from(
      new Set(
        rawLinks
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    ).slice(0, MAX_LINKS);

    if (links.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one internal link is required.",
        },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;

    const checks = await Promise.all(
      links.map((link) => checkLink(origin, link))
    );

    const healthyCount = checks.filter(
      (item) => item.status === "healthy"
    ).length;

    const redirectCount = checks.filter(
      (item) => item.status === "redirect"
    ).length;

    const brokenCount = checks.filter(
      (item) => item.status === "broken"
    ).length;

    const errorCount = checks.filter(
      (item) => item.status === "error"
    ).length;

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      summary: {
        total: checks.length,
        healthy: healthyCount,
        redirects: redirectCount,
        broken: brokenCount,
        errors: errorCount,
      },
      checks,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to check internal links.";

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
      }
    );
  }
}