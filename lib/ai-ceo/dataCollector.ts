import { adminDb } from "@/lib/firebaseAdmin";
import { getUsersByCountry } from "@/lib/google/analytics";
import {
  getSearchCountries,
  getSearchPages,
  getSearchQueries,
} from "@/lib/google/search-console";

type InternalCountryStats = {
  country: string;
  users: number;
  vipUsers: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  revenue: number;
};

type GoogleAnalyticsCountry = {
  country: string;
  activeUsers: number;
};

type SearchCountry = {
  countryCode: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type AICEODataSnapshot = {
  generatedAt: string;

  internal: {
    totalUsers: number;
    vipUsers: number;
    freeUsers: number;
    totalPayments: number;
    completedPayments: number;
    pendingPayments: number;
    failedPayments: number;
    totalRevenue: number;
    vipConversionRate: number;
    paymentSuccessRate: number;
    countries: InternalCountryStats[];
  };

  googleAnalytics: {
    connected: boolean;
    totalActiveUsers: number;
    countries: GoogleAnalyticsCountry[];
  };

  searchConsole: {
    connected: boolean;
    totals: {
      clicks: number;
      impressions: number;
      ctr: number;
      averagePosition: number;
    };
    countries: SearchCountry[];
    queries: Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
    pages: Array<{
      page: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
  };
};

function normalizeCountry(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  const country = value.trim();

  if (
    country.toLowerCase() === "(not set)" ||
    country.toLowerCase() === "not set"
  ) {
    return "Unknown";
  }

  return country;
}

function calculatePercentage(part: number, total: number) {
  if (total <= 0) return 0;

  return Number(((part / total) * 100).toFixed(2));
}

export async function collectAICEOData(): Promise<AICEODataSnapshot> {
  const [
    usersSnap,
    paymentsSnap,
    googleAnalyticsReport,
    searchCountries,
    searchQueries,
    searchPages,
  ] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("payments").get(),

    getUsersByCountry().catch((error) => {
      console.error("AI CEO GA4 collection failed:", error);
      return null;
    }),

    getSearchCountries(100).catch((error) => {
      console.error("AI CEO Search Console countries failed:", error);
      return [];
    }),

    getSearchQueries(100).catch((error) => {
      console.error("AI CEO Search Console queries failed:", error);
      return [];
    }),

    getSearchPages(100).catch((error) => {
      console.error("AI CEO Search Console pages failed:", error);
      return [];
    }),
  ]);

  const users = usersSnap.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as any[];

  const payments = paymentsSnap.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as any[];

  const countryMap = new Map<string, InternalCountryStats>();

  function ensureCountry(countryValue: unknown) {
    const country = normalizeCountry(countryValue);

    if (!countryMap.has(country)) {
      countryMap.set(country, {
        country,
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
    const stats = ensureCountry(
      user.country ||
        user.countryName ||
        user.location?.country
    );

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

    const status =
      payment.status ||
      payment.paymentStatus ||
      payment.nowpayments?.payment_status;

    if (
      status === "completed" ||
      status === "finished" ||
      status === "confirmed"
    ) {
      stats.completedPayments += 1;

      stats.revenue += Number(
        payment.price ||
          payment.priceAmount ||
          payment.amount ||
          0
      );
    } else if (
      status === "pending" ||
      status === "waiting" ||
      status === "confirming"
    ) {
      stats.pendingPayments += 1;
    } else if (
      status === "failed" ||
      status === "expired" ||
      status === "refunded"
    ) {
      stats.failedPayments += 1;
    }
  }

  const vipUsers = users.filter(
    (user) => user.isVip === true
  ).length;

  const totalUsers = users.length;
  const freeUsers = Math.max(0, totalUsers - vipUsers);

  const completedPayments = Array.from(
    countryMap.values()
  ).reduce(
    (total, country) => total + country.completedPayments,
    0
  );

  const pendingPayments = Array.from(
    countryMap.values()
  ).reduce(
    (total, country) => total + country.pendingPayments,
    0
  );

  const failedPayments = Array.from(
    countryMap.values()
  ).reduce(
    (total, country) => total + country.failedPayments,
    0
  );

  const totalRevenue = Array.from(
    countryMap.values()
  ).reduce(
    (total, country) => total + country.revenue,
    0
  );

  const processedPayments =
    completedPayments + failedPayments;

  const analyticsCountries: GoogleAnalyticsCountry[] =
    googleAnalyticsReport?.rows?.map((row) => ({
      country:
        row.dimensionValues?.[0]?.value || "Unknown",
      activeUsers: Number(
        row.metricValues?.[0]?.value || 0
      ),
    })) || [];

  const totalActiveUsers = analyticsCountries.reduce(
    (total, country) => total + country.activeUsers,
    0
  );

  const searchClicks = searchCountries.reduce(
    (total, country) =>
      total + Number(country.clicks || 0),
    0
  );

  const searchImpressions = searchCountries.reduce(
    (total, country) =>
      total + Number(country.impressions || 0),
    0
  );

  const averagePosition =
    searchCountries.length === 0
      ? 0
      : Number(
          (
            searchCountries.reduce(
              (total, country) =>
                total + Number(country.position || 0),
              0
            ) / searchCountries.length
          ).toFixed(2)
        );

  return {
    generatedAt: new Date().toISOString(),

    internal: {
      totalUsers,
      vipUsers,
      freeUsers,
      totalPayments: payments.length,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      vipConversionRate: calculatePercentage(
        vipUsers,
        totalUsers
      ),
      paymentSuccessRate: calculatePercentage(
        completedPayments,
        processedPayments
      ),
      countries: Array.from(countryMap.values()).sort(
        (first, second) => {
          if (second.revenue !== first.revenue) {
            return second.revenue - first.revenue;
          }

          return second.users - first.users;
        }
      ),
    },

    googleAnalytics: {
      connected: Boolean(googleAnalyticsReport),
      totalActiveUsers,
      countries: analyticsCountries.sort(
        (first, second) =>
          second.activeUsers - first.activeUsers
      ),
    },

    searchConsole: {
      connected: true,

      totals: {
        clicks: searchClicks,
        impressions: searchImpressions,
        ctr: calculatePercentage(
          searchClicks,
          searchImpressions
        ),
        averagePosition,
      },

      countries: searchCountries,
      queries: searchQueries,
      pages: searchPages,
    },
  };
}