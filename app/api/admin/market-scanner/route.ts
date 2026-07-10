import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getUsersByCountry } from "@/lib/google/analytics";
import {
  getSearchCountries,
  getSearchQueries,
} from "@/lib/google/search-console";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketAction = "Expand" | "Test" | "Monitor" | "Pause";

type CountryStats = {
  users: number;
  vipUsers: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  revenue: number;

  googleActiveUsers: number;
  searchClicks: number;
  searchImpressions: number;
  searchCtr: number;
  searchPosition: number;
};

type MarketResult = {
  country: string;

  users: number;
  vipUsers: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  revenue: number;

  googleActiveUsers: number;
  searchClicks: number;
  searchImpressions: number;
  searchCtr: number;
  searchPosition: number;

  vipConversionRate: number;
  paymentSuccessRate: number;

  trafficScore: number;
  searchScore: number;
  businessScore: number;
  marketScore: number;

  sponsorSuccessEstimate: number;
  action: MarketAction;
  reasons: string[];
};

const countryCodeMap: Record<string, string> = {
  irq: "Iraq",
  deu: "Germany",
  usa: "United States",
  gbr: "United Kingdom",
  fra: "France",
  esp: "Spain",
  ita: "Italy",
  tur: "Turkey",
  sau: "Saudi Arabia",
  are: "United Arab Emirates",
  nga: "Nigeria",
  ken: "Kenya",
  gha: "Ghana",
  uga: "Uganda",
  tza: "Tanzania",
  zaf: "South Africa",
  ind: "India",
  idn: "Indonesia",
  phl: "Philippines",
  bra: "Brazil",
  can: "Canada",
  aus: "Australia",
  nld: "Netherlands",
  bel: "Belgium",
  prt: "Portugal",
  pol: "Poland",
  swe: "Sweden",
  nor: "Norway",
  dnk: "Denmark",
  fin: "Finland",
  che: "Switzerland",
  aut: "Austria",
  irl: "Ireland",
};

function normalizeCountry(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  const cleanValue = value.trim();
  const lowerValue = cleanValue.toLowerCase();

  if (countryCodeMap[lowerValue]) {
    return countryCodeMap[lowerValue];
  }

  if (lowerValue === "united states of america") {
    return "United States";
  }

  if (lowerValue === "uk" || lowerValue === "great britain") {
    return "United Kingdom";
  }

  if (lowerValue === "(not set)" || lowerValue === "not set") {
    return "Unknown";
  }

  return cleanValue;
}

function createEmptyStats(): CountryStats {
  return {
    users: 0,
    vipUsers: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    revenue: 0,

    googleActiveUsers: 0,
    searchClicks: 0,
    searchImpressions: 0,
    searchCtr: 0,
    searchPosition: 0,
  };
}

function calculateTrafficScore(activeUsers: number) {
  return Number(Math.min(activeUsers * 4, 20).toFixed(1));
}

function calculateSearchScore({
  clicks,
  impressions,
  ctr,
  position,
}: {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}) {
  const clicksScore = Math.min(clicks * 2, 8);
  const impressionsScore = Math.min(impressions / 25, 6);
  const ctrScore = Math.min(ctr * 0.4, 4);

  const positionScore =
    position > 0
      ? Math.max(0, 2 - Math.min(position, 100) / 50)
      : 0;

  return Number(
    Math.min(
      clicksScore + impressionsScore + ctrScore + positionScore,
      20
    ).toFixed(1)
  );
}

function calculateBusinessScore({
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
  const usersScore = Math.min(users * 2, 15);
  const vipScore = Math.min(vipConversionRate * 0.15, 15);
  const paymentScore = Math.min(paymentSuccessRate * 0.15, 15);
  const revenueScore = Math.min(revenue / 10, 15);
  const failurePenalty = Math.min(failedPayments * 3, 10);

  return Number(
    Math.max(
      0,
      Math.min(
        usersScore +
          vipScore +
          paymentScore +
          revenueScore -
          failurePenalty,
        60
      )
    ).toFixed(1)
  );
}

function calculateMarketScore({
  trafficScore,
  searchScore,
  businessScore,
}: {
  trafficScore: number;
  searchScore: number;
  businessScore: number;
}) {
  return Number(
    Math.min(trafficScore + searchScore + businessScore, 100).toFixed(1)
  );
}

function calculateSponsorSuccessEstimate({
  marketScore,
  searchImpressions,
  googleActiveUsers,
}: {
  marketScore: number;
  searchImpressions: number;
  googleActiveUsers: number;
}) {
  const dataBonus =
    searchImpressions > 0 || googleActiveUsers > 0 ? 5 : 0;

  return Number(Math.min(marketScore + dataBonus, 95).toFixed(1));
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
  googleActiveUsers,
  searchClicks,
  searchImpressions,
  searchCtr,
}: {
  users: number;
  vipConversionRate: number;
  paymentSuccessRate: number;
  revenue: number;
  failedPayments: number;
  googleActiveUsers: number;
  searchClicks: number;
  searchImpressions: number;
  searchCtr: number;
}) {
  const reasons: string[] = [];

  if (googleActiveUsers >= 20) {
    reasons.push("Strong Google Analytics traffic");
  } else if (googleActiveUsers > 0) {
    reasons.push("Google Analytics traffic detected");
  } else {
    reasons.push("No Google Analytics traffic detected yet");
  }

  if (searchImpressions >= 100) {
    reasons.push("Strong Google Search visibility");
  } else if (searchImpressions > 0) {
    reasons.push("Google Search visibility is growing");
  } else {
    reasons.push("No Google Search impressions collected yet");
  }

  if (searchClicks > 0) {
    reasons.push(`${searchClicks} organic Google click(s) received`);
  }

  if (searchCtr >= 5) {
    reasons.push("Strong organic search CTR");
  } else if (searchImpressions > 0 && searchCtr < 2) {
    reasons.push("Search CTR needs improvement");
  }

  if (users >= 20) {
    reasons.push("Strong registered user demand");
  } else if (users >= 5) {
    reasons.push("Growing registered user interest");
  } else {
    reasons.push("Low current registered user volume");
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
    reasons.push("Payment performance needs more data");
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
    const [
      usersSnap,
      paymentsSnap,
      googleAnalyticsReport,
      searchCountries,
      searchQueries,
    ] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("payments").get(),

      getUsersByCountry().catch(() => null),
      getSearchCountries(100).catch(() => []),
      getSearchQueries(25).catch(() => []),
    ]);

    const users = usersSnap.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as any[];

    const payments = paymentsSnap.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as any[];

    const countryMap = new Map<string, CountryStats>();

    function ensureCountry(countryValue: unknown) {
      const country = normalizeCountry(countryValue);

      if (!countryMap.has(country)) {
        countryMap.set(country, createEmptyStats());
      }

      return {
        country,
        stats: countryMap.get(country)!,
      };
    }

    // Firestore users
    for (const user of users) {
      const { stats } = ensureCountry(
        user.country ||
          user.countryName ||
          user.location?.country
      );

      stats.users += 1;

      if (user.isVip === true) {
        stats.vipUsers += 1;
      }
    }

    // Firestore payments
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

      const { stats } = ensureCountry(country);

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

    // Google Analytics users by country
    const googleRows = googleAnalyticsReport?.rows || [];

    for (const row of googleRows) {
      const country =
        row.dimensionValues?.[0]?.value || "Unknown";

      const activeUsers = Number(
        row.metricValues?.[0]?.value || 0
      );

      const { stats } = ensureCountry(country);
      stats.googleActiveUsers += activeUsers;
    }

    // Google Search Console by country
    for (const item of searchCountries) {
      const { stats } = ensureCountry(item.countryCode);

      stats.searchClicks += Number(item.clicks || 0);
      stats.searchImpressions += Number(item.impressions || 0);
      stats.searchCtr = Number(item.ctr || 0);
      stats.searchPosition = Number(item.position || 0);
    }

    const markets: MarketResult[] = Array.from(countryMap.entries())
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

        const trafficScore = calculateTrafficScore(
          stats.googleActiveUsers
        );

        const searchScore = calculateSearchScore({
          clicks: stats.searchClicks,
          impressions: stats.searchImpressions,
          ctr: stats.searchCtr,
          position: stats.searchPosition,
        });

        const businessScore = calculateBusinessScore({
          users: stats.users,
          vipConversionRate,
          paymentSuccessRate,
          revenue: stats.revenue,
          failedPayments: stats.failedPayments,
        });

        const marketScore = calculateMarketScore({
          trafficScore,
          searchScore,
          businessScore,
        });

        const sponsorSuccessEstimate =
          calculateSponsorSuccessEstimate({
            marketScore,
            searchImpressions: stats.searchImpressions,
            googleActiveUsers: stats.googleActiveUsers,
          });

        return {
          country,

          users: stats.users,
          vipUsers: stats.vipUsers,
          completedPayments: stats.completedPayments,
          pendingPayments: stats.pendingPayments,
          failedPayments: stats.failedPayments,
          revenue: Number(stats.revenue.toFixed(2)),

          googleActiveUsers: stats.googleActiveUsers,
          searchClicks: stats.searchClicks,
          searchImpressions: stats.searchImpressions,
          searchCtr: stats.searchCtr,
          searchPosition: stats.searchPosition,

          vipConversionRate,
          paymentSuccessRate,

          trafficScore,
          searchScore,
          businessScore,
          marketScore,

          sponsorSuccessEstimate,
          action: getAction(marketScore),

          reasons: getReasons({
            users: stats.users,
            vipConversionRate,
            paymentSuccessRate,
            revenue: stats.revenue,
            failedPayments: stats.failedPayments,
            googleActiveUsers: stats.googleActiveUsers,
            searchClicks: stats.searchClicks,
            searchImpressions: stats.searchImpressions,
            searchCtr: stats.searchCtr,
          }),
        };
      })
      .sort((first, second) => {
        return second.marketScore - first.marketScore;
      });

    const topQueries = searchQueries.map((item) => ({
      query: item.query,
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.ctr,
      position: item.position,
    }));

    return NextResponse.json({
      success: true,

      scanner: {
        markets,
        topMarket: markets[0] || null,
        topQueries,

        scannedCountries: markets.length,

        dataSources: {
          firestoreUsers: true,
          firestorePayments: true,
          googleAnalytics: Boolean(googleAnalyticsReport),
          searchConsole: true,
          googleAds: false,
        },

        notice:
          "Google Search Console represents searches where ZERRA appeared in Google. Global prediction and betting search volume will be added through Google Ads Keyword Planner.",

        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Market scanner failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to generate the market scanner report.",
      },
      { status: 500 }
    );
  }
}