import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  calculateImpactScore,
} from "./calculateImpact";

import type {
  RecommendationImpact,
} from "./types";

const COLLECTION =
  "ceoRecommendationImpact";

export type SavedRecommendationImpact =
  RecommendationImpact & {
    id: string;
    impactScore: number;
    createdAt: string;
    updatedAt: string;
  };

function normalizeText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeNumber(
  value: unknown,
  fallback = 0
): number {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function normalizeDate(
  value: string | undefined
): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed =
    Date.parse(value);

  return Number.isFinite(parsed)
    ? new Date(parsed).toISOString()
    : new Date().toISOString();
}

export async function saveRecommendationImpact(
  impact: RecommendationImpact
): Promise<SavedRecommendationImpact> {
  const recommendationId =
    normalizeText(
      impact.recommendationId
    );

  if (!recommendationId) {
    throw new Error(
      "Recommendation ID is required"
    );
  }

  const impactScore =
    calculateImpactScore(
      impact
    );

  const measuredAt =
    normalizeDate(
      impact.measuredAt
    );

  const payload = {
    recommendationId,

    measuredAt,

    expectedImpact:
      impact.expectedImpact || {},

    actualImpact:
      impact.actualImpact || {},

    confidenceBefore:
      Math.min(
        100,
        Math.max(
          0,
          normalizeNumber(
            impact.confidenceBefore
          )
        )
      ),

    confidenceAfter:
      Math.min(
        100,
        Math.max(
          0,
          normalizeNumber(
            impact.confidenceAfter
          )
        )
      ),

    roi:
      normalizeNumber(
        impact.roi
      ),

    executionDurationSeconds:
      Math.max(
        0,
        normalizeNumber(
          impact.executionDurationSeconds
        )
      ),

    success:
      impact.success === true,

    notes:
      Array.isArray(
        impact.notes
      )
        ? impact.notes
            .map(
              (note) =>
                normalizeText(note)
            )
            .filter(Boolean)
            .slice(0, 50)
        : [],

    metadata:
      impact.metadata || {},

    impactScore,

    createdAt:
      FieldValue.serverTimestamp(),

    updatedAt:
      FieldValue.serverTimestamp(),
  };

  const document =
    await adminDb
      .collection(COLLECTION)
      .add(payload);

  const now =
    new Date().toISOString();

  return {
    id: document.id,

    recommendationId,

    measuredAt,

    expectedImpact:
      payload.expectedImpact,

    actualImpact:
      payload.actualImpact,

    confidenceBefore:
      payload.confidenceBefore,

    confidenceAfter:
      payload.confidenceAfter,

    roi:
      payload.roi,

    executionDurationSeconds:
      payload.executionDurationSeconds,

    success:
      payload.success,

    notes:
      payload.notes,

    metadata:
      payload.metadata,

    impactScore,

    createdAt: now,
    updatedAt: now,
  };
}