import "server-only";

import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize(source[key]);
        return result;
      }, {});
  }

  return value;
}

export function createPostMatchFingerprint(value: unknown): string {
  const normalized = JSON.stringify(canonicalize(value));
  return createHash("sha256").update(normalized).digest("hex");
}