import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type InsightAction = "Expand" | "Test" | "Monitor" | "Pause";

type CountryInsight = {
  country: string;
  users: number;
  vipUsers: number;
  revenue: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;

  externalSignals: {
    googleTrendsScore: number | null;
    tiktokInterestScore: number | null;
    footballPopularityScore: number | null;
    bettingInterestScore: number | null;
    cpcScore: number | null;
    competitionScore: number | null;
  };

  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  recommendation: string;
  action: InsightAction;
  score: number;
};

function normalizeCountry(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  return value.trim();
}

function getAction(score: number): InsightAction {
  if (score >= 75) return "Expand";
  if (score >= 50) return "Test";
  if (score >= 25) return "Monitor";
  return "Pause";
}

function calculateScore({
  users,
  vipConversionRate,
  paymentSuccessRate,
  revenue,
  failedPayments,
}: {
  users: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  revenue: number;
  failedPayments: number;
}) {
  const userScore = Math.min(users * 2.5, 30);
  const vipScore = Math.min(vipConversionRate * 0.3, 25);
  const paymentScore = Math.min(paymentSuccessRate * 0.25, 25);
  const revenueScore = Math.min(revenue / 10, 20);
  const failedPenalty = Math.min(failedPayments * 3, 15);

  return Number(
    Math.max(
      0,
      Math.min(
        userScore + vipScore + paymentScore + revenueScore - failedPenalty,
        100
      )
    ).toFixed(1)
  );
}

function buildInsights({
  country,
  users,
  vipConversionRate,
  paymentSuccessRate,
  revenue,
  completedPayments,
  pendingPayments,
  failedPayments,
  score,
}: {
  country: string;
  users: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  revenue: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  score: number;
}) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const risks: string[] = [];

  if (users >= 20) {
    strengths.push("Strong existing user demand");
  } else if (users >= 5) {
    strengths.push("Growing user base");
  } else {
    weaknesses.push("Low current user volume");
  }

  if (vipConversionRate >= 20) {
    strengths.push("High VIP conversion rate");
  } else if (vipConversionRate >= 5) {
    opportunities.push("VIP conversion can be improved with targeted offers");
  } else {
    weaknesses.push("Low VIP conversion rate");
  }

  if (paymentSuccessRate >= 80) {
    strengths.push("Strong payment success rate");
  } else if (paymentSuccessRate >= 40) {
    opportunities.push("Payment experience can still be improved");
  } else {
    weaknesses.push("Weak payment success rate");
  }

  if (revenue > 0) {
    strengths.push("Revenue has already been generated");
  } else {
    weaknesses.push("No completed revenue yet");
  }

  if (pendingPayments > 0) {
    opportunities.push(
      `${pendingPayments} pending payment${
        pendingPayments === 1 ? "" : "s"
      } may convert`
    );
  }

  if (failedPayments > 0) {
    risks.push(
      `${failedPayments} failed payment${
        failedPayments === 1 ? "" : "s"
      } need attention`
    );
  }

  if (completedPayments === 0) {
    risks.push("No verified completed purchases yet");
  }

  if (country === "Unknown") {
    risks.push("Country data is missing from user profiles");
    opportunities.push("Collect country during registration or profile setup");
  }

  let recommendation = "Keep monitoring this market.";

  if (score >= 75) {
    recommendation =
      "Expand marketing carefully and increase the advertising budget.";
  } else if (score >= 50) {
    recommendation =
      "Run a controlled campaign and measure signup and VIP conversion.";
  } else if (score >= 25) {
    recommendation =
      "Continue collecting data before increasing marketing spend.";
  } else {
    recommendation =
      "Pause major spending and improve user volume and payment performance first.";
  }

  return {
    strengths,
    weaknesses,
    opportunities,
    risks,
    recommendation,
  };
}

export async function GET() {
  try {
    const usersSnap = await adminDb.collection("users").get();
    const paymentsSnap = await adminDb.collection("payments").get();

    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const payments = paymentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const countryMap = new Map<
      string,
      {
        users: number;
        vipUsers: number;
        revenue: number;
        completedPayments: number;
        pendingPayments: number;
        failedPayments: number;
      }
    >();

    function ensureCountry(country: string) {
      if (!countryMap.has(country)) {
        countryMap.set(country, {
          users: 0,
          vipUsers: 0,
          revenue: 0,
          completedPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
        });
      }

      return countryMap.get(country)!;
    }

    for (const user of users) {
      const country = normalizeCountry(
        user.country ||
          user.countryName ||
          user.location?.country
      );

      const stats = ensureCountry(country);

      stats.users += 1;

      if (user.isVip === true) {
        stats.vipUsers += 1;
      }
    }

    for (const payment of payments) {
      let country = normalizeCountry(
        payment.country ||
          payment.countryName ||
          payment.billingCountry ||
          payment.nowpayments?.country
      );

      if (country === "Unknown" && payment.uid) {
        const relatedUser = users.find(
          (user) => user.id === payment.uid
        );

        country = normalizeCountry(
          relatedUser?.country ||
            relatedUser?.countryName ||
            relatedUser?.location?.country
        );
      }

      const stats = ensureCountry(country);

      if (payment.status === "completed") {
        stats.completedPayments += 1;
        stats.revenue += Number(payment.price || 0);
      } else if (payment.status === "pending") {
        stats.pendingPayments += 1;
      } else if (
        payment.status === "failed" ||
        payment.paymentStatus === "failed" ||
        payment.paymentStatus === "expired"
      ) {
        stats.failedPayments += 1;
      }
    }

    const insights: CountryInsight[] = Array.from(
      countryMap.entries()
    )
      .map(([country, stats]) => {
        const vipConversionRate =
          stats.users === 0
            ? 0
            : Number(
                ((stats.vipUsers / stats.users) * 100).toFixed(1)
              );

        const processedPayments =
          stats.completedPayments + stats.failedPayments;

        const paymentSuccessRate =
          processedPayments === 0
            ? 0
            : Number(
                (
                  (stats.completedPayments / processedPayments) *
                  100
                ).toFixed(1)
              );

        const score = calculateScore({
          users: stats.users,
          vipConversionRate,
          paymentSuccessRate,
          revenue: stats.revenue,
          failedPayments: stats.failedPayments,
        });

        const generated = buildInsights({
          country,
          users: stats.users,
          vipConversionRate,
          paymentSuccessRate,
          revenue: stats.revenue,
          completedPayments: stats.completedPayments,
          pendingPayments: stats.pendingPayments,
          failedPayments: stats.failedPayments,
          score,
        });

        return {
          country,
          users: stats.users,
          vipUsers: stats.vipUsers,
          revenue: Number(stats.revenue.toFixed(2)),
          vipConversionRate,
          paymentSuccessRate,
          completedPayments: stats.completedPayments,
          pendingPayments: stats.pendingPayments,
          failedPayments: stats.failedPayments,

          externalSignals: {
            googleTrendsScore: null,
            tiktokInterestScore: null,
            footballPopularityScore: null,
            bettingInterestScore: null,
            cpcScore: null,
            competitionScore: null,
          },

          strengths: generated.strengths,
          weaknesses: generated.weaknesses,
          opportunities: generated.opportunities,
          risks: generated.risks,
          recommendation: generated.recommendation,
          action: getAction(score),
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      insights: {
        countries: insights,
        topCountry: insights[0] || null,
        scannedCountries: insights.length,
        dataSources: {
          firestoreUsers: true,
          firestorePayments: true,
          googleTrends: false,
          tiktok: false,
          advertisingData: false,
        },
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}