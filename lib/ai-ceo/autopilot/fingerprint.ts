import "server-only";

import { createHash } from "node:crypto";
import type { AICEODataSnapshot } from "@/lib/ai-ceo/dataCollector";

export function createAutopilotSnapshotFingerprint(
  snapshot: AICEODataSnapshot
): string {
  const stable = {
    internal: snapshot.internal,
    googleAnalytics: snapshot.googleAnalytics,
    searchConsole: {
      connected: snapshot.searchConsole.connected,
      dataThrough: snapshot.searchConsole.dataThrough,
      freshnessStatus: snapshot.searchConsole.freshnessStatus,
      totals: snapshot.searchConsole.totals,
      countries: snapshot.searchConsole.countries,
      queries: snapshot.searchConsole.queries.slice(0, 25),
      pages: snapshot.searchConsole.pages.slice(0, 25),
    },
  };

  return createHash("sha256")
    .update(JSON.stringify(stable))
    .digest("hex");
}