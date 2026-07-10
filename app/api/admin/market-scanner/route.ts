import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type MarketAction = "Expand" | "Test" | "Monitor" | "Pause";

type MarketResult = {
  country: string;
  users: number;
  vipUsers: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  revenue: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  marketScore: number;
  action: MarketAction;
  reasons: string[];
};

function normalizeCountry(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  return value.trim();
}

function calculateMarketScore({
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
  const failurePenalty = Math.min(failedPayments * 3, 15);

  return Number(
    Math.max(
      0,
      Math.min(
        userScore + vipScore + paymentScore + revenueScore - failurePenalty,
        100
      )
    ).toFixed(1)
  );
}

function getAction(score: number): MarketAction {
  if (score >= 75) return "Expand";
  if (score >= 50) return "Test";
  if (score >= 25) return "Monitor";
  return "Pause";
}

function getReasons({
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
  const reasons: string[] = [];

  if (users >= 20) {
    reasons.push("Strong user demand");
  } else if (users >= 5) {
    reasons.push("Growing user interest");
  } else {
    reasons.push("Low current user volume");
  }

  if (vipConversionRate >= 20) {
    reasons.push("High VIP conversion");
  } else if (vipConversionRate >= 5) {
    reasons.push("Moderate VIP conversion");
  } else {
    reasons.push("Low VIP conversion");
  }

  if (paymentSuccessRate >= 80) {
    reasons.push("Strong payment success");
  } else if (paymentSuccessRate >= 40) {
    reasons.push("Average payment performance");
  } else {
    reasons.push("Weak payment success");
  }

  if (revenue > 0) {
    reasons.push("Revenue already generated");
  } else {
    reasons.push("No completed revenue yet");
  }

  if (failedPayments > 0) {
    reasons.push("Failed payments need attention");
  }

  return reasons;
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

    const markets: MarketResult[] = Array.from(countryMap.entries())
      .map(([country, stats]) => {
        const vipConversionRate =
          stats.users === 0
            ? 0
            : Number(((stats.vipUsers / stats.users) * 100).toFixed(1));

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

        const marketScore = calculateMarketScore({
          users: stats.users,
          vipConversionRate,
          paymentSuccessRate,
          revenue: stats.revenue,
          failedPayments: stats.failedPayments,
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
          marketScore,
          action: getAction(marketScore),
          reasons: getReasons({
            users: stats.users,
            vipConversionRate,
            paymentSuccessRate,
            revenue: stats.revenue,
            failedPayments: stats.failedPayments,
          }),
        };
      })
      .sort((a, b) => b.marketScore - a.marketScore);

    return NextResponse.json({
      success: true,
      scanner: {
        markets,
        topMarket: markets[0] || null,
        scannedCountries: markets.length,
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