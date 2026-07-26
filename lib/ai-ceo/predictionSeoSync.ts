import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import { createSEOPageDraft, listSEOPageDrafts } from "@/lib/ai-ceo/pageGenerator";
import { evaluateSEOAutoPublishPolicy } from "@/lib/ai-ceo/seoAutoPublishPolicy";
import { applySEOAutonomousLifecycle } from "@/lib/ai-ceo/seoLifecycle";
import type { SEOPageDraftItem } from "@/lib/ai-ceo/client";

export type PredictionSeoSyncResult = {
  fixtureId: string;
  success: boolean;
  skipped: boolean;
  draftId: string | null;
  decision: "auto-publish" | "review" | "withhold" | "skipped" | "failed";
  status: string | null;
  reason: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function serializeDate(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export async function syncPublishedPredictionToSEO(
  fixtureIdValue: string | number,
  performedBy = "prediction-publish-seo-sync"
): Promise<PredictionSeoSyncResult> {
  const fixtureId = String(fixtureIdValue ?? "").trim();
  if (!/^\d+$/.test(fixtureId)) {
    return { fixtureId, success: false, skipped: false, draftId: null, decision: "failed", status: null, reason: "A valid fixture ID is required for SEO sync." };
  }

  try {
    const predictionSnapshot = await adminDb.collection("predictionHistory").doc(`fixture-${fixtureId}`).get();
    if (!predictionSnapshot.exists) {
      return { fixtureId, success: false, skipped: false, draftId: null, decision: "failed", status: null, reason: "Published prediction was not found for SEO sync." };
    }

    const prediction = predictionSnapshot.data() || {};
    if (text(prediction.status).toLowerCase() !== "published") {
      return { fixtureId, success: false, skipped: true, draftId: null, decision: "skipped", status: text(prediction.status) || null, reason: "SEO sync skipped because prediction is not published." };
    }

    const existingSnapshot = await adminDb.collection("seoPageDrafts").where("fixtureId", "==", fixtureId).limit(10).get();
    const existingEnglish = existingSnapshot.docs.find((doc) => text(doc.data().language || "en").toLowerCase() === "en");
    if (existingEnglish) {
      const existing = existingEnglish.data();
      return { fixtureId, success: true, skipped: true, draftId: existingEnglish.id, decision: "skipped", status: text(existing.status) || null, reason: "SEO page already exists for this published fixture." };
    }

    const home = text(prediction.teams?.home?.name);
    const away = text(prediction.teams?.away?.name);
    if (!home || !away) {
      return { fixtureId, success: false, skipped: false, draftId: null, decision: "failed", status: null, reason: "Prediction is missing team names required for SEO generation." };
    }

    const draft = await createSEOPageDraft({
      keyword: `${home} vs ${away}`,
      language: "en",
      country: text(prediction.competition?.country) || null,
      fixtureId,
      fixtureDate: serializeDate(prediction.fixtureDate),
      sourceRecommendationId: null,
      createdBy: performedBy,
    });

    const latestDrafts = await listSEOPageDrafts(200) as SEOPageDraftItem[];
    const currentDraft = draft as unknown as SEOPageDraftItem;
    const policy = evaluateSEOAutoPublishPolicy(currentDraft, latestDrafts);
    const lifecycle = await applySEOAutonomousLifecycle({ draftId: draft.id, policy, performedBy });

    return {
      fixtureId,
      success: true,
      skipped: false,
      draftId: draft.id,
      decision: lifecycle.decision,
      status: lifecycle.status,
      reason: lifecycle.message,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Prediction SEO sync failed.";

    if (reason.toLowerCase().includes("already exists")) {
      return { fixtureId, success: true, skipped: true, draftId: null, decision: "skipped", status: null, reason };
    }

    console.error("[PREDICTION_SEO_SYNC_ERROR]", { fixtureId, reason });
    return { fixtureId, success: false, skipped: false, draftId: null, decision: "failed", status: null, reason };
  }
}