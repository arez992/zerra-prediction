import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export const CEO_COMPETITORS = [
  "Forebet",
  "PredictZ",
  "BetClan",
  "WinDrawWin",
] as const;

export type CEOCompetitorName =
  (typeof CEO_COMPETITORS)[number];

export type CompetitorSnapshotInput = {
  competitor: CEOCompetitorName;
  estimatedTraffic?: number;
  newSeoPages?: number;
  keywords?: string[];
  growingCountries?: string[];
  decliningCountries?: string[];
  newFeatures?: string[];
  notes?: string[];
  source?: string;
  capturedAt?: string;
};

function serializeTimestamp(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

export async function saveCompetitorSnapshot(
  input: CompetitorSnapshotInput
) {
  if (
    !CEO_COMPETITORS.includes(
      input.competitor
    )
  ) {
    throw new Error(
      "Unsupported competitor"
    );
  }

  const snapshot = {
    competitor: input.competitor,
    estimatedTraffic: Number(
      input.estimatedTraffic || 0
    ),
    newSeoPages: Number(
      input.newSeoPages || 0
    ),
    keywords: input.keywords || [],
    growingCountries:
      input.growingCountries || [],
    decliningCountries:
      input.decliningCountries || [],
    newFeatures:
      input.newFeatures || [],
    notes: input.notes || [],
    source:
      input.source || "manual",
    capturedAt:
      input.capturedAt ||
      new Date().toISOString(),
    createdAt:
      FieldValue.serverTimestamp(),
  };

  const document = await adminDb
    .collection("competitorSnapshots")
    .add(snapshot);

  return {
    id: document.id,
    ...snapshot,
    createdAt: new Date().toISOString(),
  };
}

export async function getLatestCompetitorSnapshots() {
  const results = [];

  for (const competitor of CEO_COMPETITORS) {
    const snapshot = await adminDb
      .collection("competitorSnapshots")
      .where(
        "competitor",
        "==",
        competitor
      )
      .orderBy("capturedAt", "desc")
      .limit(2)
      .get();

    const entries = snapshot.docs.map(
      (document) => {
        const data = document.data();

        return {
          id: document.id,
          competitor:
            data.competitor ||
            competitor,
          estimatedTraffic: Number(
            data.estimatedTraffic || 0
          ),
          newSeoPages: Number(
            data.newSeoPages || 0
          ),
          keywords:
            data.keywords || [],
          growingCountries:
            data.growingCountries || [],
          decliningCountries:
            data.decliningCountries || [],
          newFeatures:
            data.newFeatures || [],
          notes: data.notes || [],
          source:
            data.source || "unknown",
          capturedAt:
            data.capturedAt || null,
          createdAt:
            serializeTimestamp(
              data.createdAt
            ),
        };
      }
    );

    const latest = entries[0] || null;
    const previous = entries[1] || null;

    const trafficChange =
      latest && previous
        ? latest.estimatedTraffic -
          previous.estimatedTraffic
        : 0;

    const trafficChangePercent =
      latest &&
      previous &&
      previous.estimatedTraffic > 0
        ? Number(
            (
              (trafficChange /
                previous.estimatedTraffic) *
              100
            ).toFixed(2)
          )
        : 0;

    results.push({
      competitor,
      latest,
      previous,
      changes: {
        traffic: trafficChange,
        trafficPercent:
          trafficChangePercent,
        newSeoPages:
          latest?.newSeoPages || 0,
      },
    });
  }

  return results;
}

export async function generateCompetitorSignals() {
  const competitors =
    await getLatestCompetitorSnapshots();

  const signals: Array<{
    competitor: string;
    type:
      | "growth"
      | "decline"
      | "seo"
      | "country"
      | "feature";
    priority:
      | "low"
      | "medium"
      | "high";
    message: string;
    data: Record<string, unknown>;
  }> = [];

  for (const item of competitors) {
    const latest = item.latest;

    if (!latest) continue;

    if (
      item.changes.trafficPercent >= 20
    ) {
      signals.push({
        competitor: item.competitor,
        type: "growth",
        priority: "high",
        message:
          `${item.competitor} estimated traffic increased by ` +
          `${item.changes.trafficPercent}%.`,
        data: item.changes,
      });
    } else if (
      item.changes.trafficPercent <= -15
    ) {
      signals.push({
        competitor: item.competitor,
        type: "decline",
        priority: "medium",
        message:
          `${item.competitor} estimated traffic declined by ` +
          `${Math.abs(
            item.changes.trafficPercent
          )}%.`,
        data: item.changes,
      });
    }

    if (latest.newSeoPages >= 20) {
      signals.push({
        competitor: item.competitor,
        type: "seo",
        priority: "high",
        message:
          `${item.competitor} published approximately ` +
          `${latest.newSeoPages} new SEO pages.`,
        data: {
          newSeoPages:
            latest.newSeoPages,
        },
      });
    }

    for (const country of latest.growingCountries) {
      signals.push({
        competitor: item.competitor,
        type: "country",
        priority: "medium",
        message:
          `${item.competitor} is growing in ${country}.`,
        data: {
          country,
          direction: "up",
        },
      });
    }

    for (const feature of latest.newFeatures) {
      signals.push({
        competitor: item.competitor,
        type: "feature",
        priority: "medium",
        message:
          `${item.competitor} introduced a new feature: ${feature}.`,
        data: {
          feature,
        },
      });
    }
  }

  return signals.sort(
    (first, second) => {
      const weights = {
        high: 3,
        medium: 2,
        low: 1,
      };

      return (
        weights[second.priority] -
        weights[first.priority]
      );
    }
  );
}

export async function getCompetitorSummary() {
  const snapshots =
    await getLatestCompetitorSnapshots();

  const signals =
    await generateCompetitorSignals();

  return {
    connected: true,
    trackedCompetitors:
      CEO_COMPETITORS.length,
    competitors: snapshots,
    signals,
    checkedAt: new Date().toISOString(),
    notice:
      "Competitor data currently comes from stored snapshots. External competitor data providers will be connected in a later phase.",
  };
}