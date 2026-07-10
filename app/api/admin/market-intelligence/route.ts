import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type CountryStats = {
  country: string;
  users: number;
  vipUsers: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  revenue: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  opportunityScore: number;
  recommendation: "Expand" | "Test" | "Monitor";
};

function normalizeCountry(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  return value.trim();
}

function calculateOpportunityScore({
  users,
  vipConversionRate,
  paymentSuccessRate,
  revenue,
}: {
  users: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  revenue: number;
}) {
  const userScore = Math.min(users * 2, 30);
  const vipScore = Math.min(vipConversionRate * 0.3, 30);
  const paymentScore = Math.min(paymentSuccessRate * 0.25, 25);
  const revenueScore = Math.min(revenue / 10, 15);

  return Number(
    Math.min(
      userScore + vipScore + paymentScore + revenueScore,
      100
    ).toFixed(1)
  );
}

function getRecommendation(
  score: number
): "Expand" | "Test" | "Monitor" {
  if (score >= 70) return "Expand";
  if (score >= 40) return "Test";
  return "Monitor";
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
        completedPayments: number;
        pendingPayments: number;
        failedPayments: number;
        revenue: number;
      }
    >();

    function ensureCountry(country: string) {
      if (!countryMap.has(country)) {
        countryMap.set(country, {
          users: 0,
          vipUsers: 0,
          completedPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          revenue: 0,
        });
      }

      return countryMap.get(country)!;
    }

    for (const user of users) {
      const country = normalizeCountry(
        user.country || user.countryName || user.location?.country
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
        const relatedUser = users.find((user) => user.id === payment.uid);

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

    const countries: CountryStats[] = Array.from(countryMap.entries())
      .map(([country, stats]) => {
        const vipConversionRate =
          stats.users === 0
            ? 0
            : Number(
                ((stats.vipUsers / stats.users) * 100).toFixed(1)
              );

        const totalProcessedPayments =
          stats.completedPayments + stats.failedPayments;

        const paymentSuccessRate =
          totalProcessedPayments === 0
            ? 0
            : Number(
                (
                  (stats.completedPayments / totalProcessedPayments) *
                  100
                ).toFixed(1)
              );

        const opportunityScore = calculateOpportunityScore({
          users: stats.users,
          vipConversionRate,
          paymentSuccessRate,
          revenue: stats.revenue,
        });

        return {
          country,
          users: stats.users,
          vipUsers: stats.vipUsers,
          completedPayments: stats.completedPayments,
          pendingPayments: stats.pendingPayments,
          failedPayments: stats.failedPayments,
          revenue: Number(stats.revenue.toFixed(2)),
          vipConversionRate,
          paymentSuccessRate,
          opportunityScore,
          recommendation: getRecommendation(opportunityScore),
        };
      })
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    const totals = countries.reduce(
      (acc, item) => {
        acc.users += item.users;
        acc.vipUsers += item.vipUsers;
        acc.revenue += item.revenue;
        acc.completedPayments += item.completedPayments;
        return acc;
      },
      {
        users: 0,
        vipUsers: 0,
        revenue: 0,
        completedPayments: 0,
      }
    );

    return NextResponse.json({
      success: true,
      intelligence: {
        countries,
        totals: {
          ...totals,
          revenue: Number(totals.revenue.toFixed(2)),
        },
        topCountry: countries[0] || null,
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