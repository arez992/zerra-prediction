import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

export type InternalLinkStatus =
  | "valid"
  | "warning"
  | "invalid";

export type InternalLinkCheck = {
  link: string;
  normalizedLink: string;
  status: InternalLinkStatus;
  issues: string[];
};

export type InternalLinkValidationResult = {
  score: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  duplicateCount: number;
  selfLinkCount: number;
  checks: InternalLinkCheck[];
};

const ALLOWED_ROUTE_PREFIXES = [
  "/predictions",
  "/football-predictions",
  "/dashboard",
  "/vip",
  "/ai-accuracy",
  "/matches",
  "/leagues",
  "/teams",
];

function normalizePath(value: unknown): string {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const withoutHash = raw.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];

  if (!withoutQuery) return "";

  const collapsed = withoutQuery.replace(/\/+/g, "/");

  if (collapsed === "/") {
    return "/";
  }

  return collapsed.replace(/\/+$/, "");
}

function stripLocalePrefix(path: string): string {
  return path.replace(/^\/(en|ku)(?=\/|$)/, "") || "/";
}

function hasSupportedLocale(path: string): boolean {
  return /^\/(en|ku)(?=\/|$)/.test(path);
}

function isAllowedRoute(path: string): boolean {
  const route = stripLocalePrefix(path);

  if (route === "/") {
    return true;
  }

  return ALLOWED_ROUTE_PREFIXES.some(
    (prefix) =>
      route === prefix ||
      route.startsWith(`${prefix}/`)
  );
}

export function validateInternalLinks(
  draft: SEOPageDraftItem
): InternalLinkValidationResult {
  const links = Array.isArray(draft.internalLinks)
    ? draft.internalLinks
    : [];

  const canonicalPath = normalizePath(
    draft.canonicalPath
  );

  const seen = new Set<string>();
  let duplicateCount = 0;
  let selfLinkCount = 0;

  const checks = links.map((linkValue) => {
    const link = String(linkValue || "").trim();
    const normalizedLink = normalizePath(link);
    const issues: string[] = [];

    if (!link) {
      issues.push("Link is empty.");
    }

    if (
      /^https?:\/\//i.test(link) ||
      /^\/\//.test(link)
    ) {
      issues.push(
        "External URLs are not allowed in internal links."
      );
    }

    if (
      link &&
      !link.startsWith("/") &&
      !/^https?:\/\//i.test(link)
    ) {
      issues.push(
        "Internal links must start with a forward slash."
      );
    }

    if (/\s/.test(link)) {
      issues.push(
        "Link contains whitespace."
      );
    }

    if (
      normalizedLink &&
      seen.has(normalizedLink)
    ) {
      duplicateCount += 1;
      issues.push(
        "Duplicate internal link."
      );
    } else if (normalizedLink) {
      seen.add(normalizedLink);
    }

    if (
      normalizedLink &&
      canonicalPath &&
      normalizedLink === canonicalPath
    ) {
      selfLinkCount += 1;
      issues.push(
        "Page links to its own canonical path."
      );
    }

    if (
      normalizedLink.startsWith("/") &&
      !hasSupportedLocale(normalizedLink)
    ) {
      issues.push(
        "Link is missing an /en or /ku locale prefix."
      );
    }

    if (
      normalizedLink.startsWith("/") &&
      hasSupportedLocale(normalizedLink) &&
      !isAllowedRoute(normalizedLink)
    ) {
      issues.push(
        "Route is outside the approved internal-link sections."
      );
    }

    if (
      link.includes("?") ||
      link.includes("#")
    ) {
      issues.push(
        "Query strings or fragments should be reviewed."
      );
    }

    const invalidIssue = issues.some(
      (issue) =>
        issue.includes("External") ||
        issue.includes("must start") ||
        issue.includes("empty")
    );

    const status: InternalLinkStatus =
      invalidIssue
        ? "invalid"
        : issues.length > 0
          ? "warning"
          : "valid";

    return {
      link,
      normalizedLink,
      status,
      issues,
    };
  });

  const validCount = checks.filter(
    (check) => check.status === "valid"
  ).length;

  const warningCount = checks.filter(
    (check) => check.status === "warning"
  ).length;

  const invalidCount = checks.filter(
    (check) => check.status === "invalid"
  ).length;

  const score =
    links.length === 0
      ? 0
      : Math.max(
          0,
          Math.round(
            ((validCount +
              warningCount * 0.5) /
              links.length) *
              100
          )
        );

  return {
    score,
    validCount,
    warningCount,
    invalidCount,
    duplicateCount,
    selfLinkCount,
    checks,
  };
}