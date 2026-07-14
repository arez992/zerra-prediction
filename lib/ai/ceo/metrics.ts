import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import type { CEOMetrics } from "./types";

type TimestampLike = { toDate: () => Date };
type DocumentRecord = Record<string, unknown>;

function asRecord(value: unknown): DocumentRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DocumentRecord)
    : {};
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function toDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate === "function"
  ) {
    return (value as TimestampLike).toDate();
  }

  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function isWithinDays(value: unknown, days: number): boolean {
  const date = toDate(value);
  if (!date) return false;

  return (
    date.getTime() >=
    Date.now() - days * 24 * 60 * 60 * 1000
  );
}

function calculatePercent(
  numerator: number,
  denominator: number
): number | null {
  if (denominator <= 0) return null;

  return Number(((numerator / denominator) * 100).toFixed(2));
}

function sumNumbers(values: Array<number | null>): number | null {
  const valid = values.filter(
    (value): value is number => value !== null
  );

  if (valid.length === 0) return null;

  return Number(
    valid.reduce((total, value) => total + value, 0).toFixed(2)
  );
}

async function readCollection(
  name: string,
  limit = 1000
): Promise<Array<{ id: string; data: DocumentRecord }>> {
  try {
    const snapshot = await adminDb
      .collection(name)
      .limit(limit)
      .get();

    return snapshot.docs.map((document) => ({
      id: document.id,
      data: document.data(),
    }));
  } catch (error) {
    console.error(
      `[AI_CEO_METRICS_${name.toUpperCase()}_ERROR]`,
      error
    );

    return [];
  }
}

function getPaymentAmount(data: DocumentRecord): number | null {
  return (
    asNumber(data.paidAmount) ??
    asNumber(data.price) ??
    asNumber(data.amount)
  );
}

function getSeoQualityScore(data: DocumentRecord): number | null {
  const quality = asRecord(data.quality);

  return (
    asNumber(data.contentQualityScore) ??
    asNumber(data.qualityScore) ??
    asNumber(quality.score) ??
    asNumber(data.seoScore)
  );
}

function getPredictionStatus(data: DocumentRecord): string {
  return asString(data.status) || "unknown";
}

export async function collectCEOMetrics(): Promise<CEOMetrics> {
  const [
    users,
    payments,
    predictions,
    seoPages,
    activityLogs,
    settingsDocuments,
  ] = await Promise.all([
    readCollection("users"),
    readCollection("payments"),
    readCollection("predictionHistory"),
    readCollection("seoPageDrafts"),
    readCollection("activityLogs"),
    readCollection("settings", 20),
  ]);

  const siteSettings =
    settingsDocuments.find((item) => item.id === "site")?.data || {};

  const completedPayments = payments.filter(
    ({ data }) => data.status === "completed"
  );

  const recentCompletedPayments = completedPayments.filter(({ data }) =>
    isWithinDays(
      data.completedAt ?? data.confirmedAt ?? data.updatedAt,
      30
    )
  );

  const revenue = sumNumbers(
    completedPayments.map(({ data }) => getPaymentAmount(data))
  );

  const recentRevenue = sumNumbers(
    recentCompletedPayments.map(({ data }) => getPaymentAmount(data))
  );

  const previousRevenue = sumNumbers(
    completedPayments
      .filter(({ data }) => {
        const date = toDate(
          data.completedAt ?? data.confirmedAt ?? data.updatedAt
        );

        if (!date) return false;

        const age = Date.now() - date.getTime();

        return (
          age >= 30 * 24 * 60 * 60 * 1000 &&
          age < 60 * 24 * 60 * 60 * 1000
        );
      })
      .map(({ data }) => getPaymentAmount(data))
  );

  const revenueTrend =
    recentRevenue !== null &&
    previousRevenue !== null &&
    previousRevenue > 0
      ? Number(
          (
            ((recentRevenue - previousRevenue) / previousRevenue) *
            100
          ).toFixed(2)
        )
      : null;

  const activeVipUsers = users.filter(({ data }) => {
    if (data.isVip !== true) return false;
    if (data.plan === "Lifetime") return true;

    const expiry = toDate(data.expiresAt);

    return expiry !== null && expiry.getTime() > Date.now();
  });

  const newVipUsers = activeVipUsers.filter(({ data }) =>
    isWithinDays(data.vipActivatedAt, 30)
  );

  const newUsers = users.filter(({ data }) =>
    isWithinDays(data.createdAt, 30)
  );

  const activeUsers = users.filter(({ data }) =>
    isWithinDays(data.lastLoginAt ?? data.updatedAt, 30)
  );

  const checkedPredictions = predictions.filter(
    ({ data }) =>
      data.resultChecked === true ||
      typeof data.correct === "boolean"
  );

  const correctPredictions = checkedPredictions.filter(
    ({ data }) => asBoolean(data.correct) === true
  );

  const publishedPredictions = predictions.filter(
    ({ data }) => getPredictionStatus(data) === "published"
  );

  const pendingPredictions = predictions.filter(({ data }) => {
    const status = getPredictionStatus(data);
    return status === "draft" || status === "review";
  });

  const qualityScores = seoPages
    .map(({ data }) => getSeoQualityScore(data))
    .filter((value): value is number => value !== null);

  const averageSeoQuality =
    qualityScores.length > 0
      ? Number(
          (
            qualityScores.reduce((total, score) => total + score, 0) /
            qualityScores.length
          ).toFixed(2)
        )
      : null;

  const seoPagesNeedingReview = seoPages.filter(({ data }) => {
    const status = asString(data.status);
    const score = getSeoQualityScore(data);

    return (
      status === "draft" ||
      status === "review" ||
      (score !== null && score < 80)
    );
  });

  const recentErrors = activityLogs.filter(
    ({ data }) =>
      isWithinDays(data.createdAt, 7) &&
      (
        asString(data.type) === "error" ||
        asString(data.level) === "error" ||
        (asString(data.message) || "")
          .toLowerCase()
          .includes("error")
      )
  );

  const apiFootballAvailable = process.env.API_FOOTBALL_KEY
    ? process.env.API_FOOTBALL_DISABLED === "true"
      ? false
      : null
    : false;

  const openAiAvailable = Boolean(process.env.OPENAI_API_KEY);

  const paymentProviderAvailable = Boolean(
    process.env.NOWPAYMENTS_API_KEY &&
      process.env.NOWPAYMENTS_IPN_SECRET
  );

  const currency = asString(siteSettings.currency) || "USDT";

  return {
    generatedAt: new Date().toISOString(),

    revenue: {
      total: revenue,
      currency,
      trendPercent: revenueTrend,
    },

    vip: {
      activeMembers: activeVipUsers.length,
      newMembers: newVipUsers.length,
      conversionRate: calculatePercent(
        activeVipUsers.length,
        users.length
      ),
      revenue,
    },

    users: {
      total: users.length,
      active: activeUsers.length,
      newUsers: newUsers.length,
    },

    traffic: {
      sessions: null,
      users: null,
      trendPercent: null,
    },

    seo: {
      publishedPages: seoPages.filter(
        ({ data }) => data.status === "published"
      ).length,
      averageQualityScore: averageSeoQuality,
      pagesNeedingReview: seoPagesNeedingReview.length,
      organicClicks: null,
    },

    predictions: {
      total: predictions.length,
      published: publishedPredictions.length,
      pendingReview: pendingPredictions.length,
      checked: checkedPredictions.length,
      correct: correctPredictions.length,
      accuracyPercent: calculatePercent(
        correctPredictions.length,
        checkedPredictions.length
      ),
    },

    apiHealth: {
      apiFootballAvailable,
      openAiAvailable,
      paymentProviderAvailable,
      recentErrors: recentErrors.length,
    },

    costs: {
      total: null,
      apiFootball: null,
      openAi: null,
      infrastructure: null,
    },

    competitors: {
      monitored: null,
      notableChanges: [],
    },

    custom: {
      paymentsCompleted: completedPayments.length,
      aiCeoOpenAiEnabled:
        process.env.AI_CEO_OPENAI_ENABLED === "true",
    },
  };
}