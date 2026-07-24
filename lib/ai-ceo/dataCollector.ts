import "server-only";

import {
  unstable_cache,
} from "next/cache";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  getPaymentAmount,
  getPaymentStatus,
} from "@/lib/paymentRecords";

import {
  getUsersByCountry,
} from "@/lib/google/analytics";

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

const AI_CEO_DATA_CACHE_SECONDS =
  10 * 60;

function normalizeCountry(
  value: unknown
): string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return "Unknown";
  }

  const country =
    value.trim();

  const normalized =
    country.toLowerCase();

  if (
    normalized ===
      "(not set)" ||
    normalized ===
      "not set"
  ) {
    return "Unknown";
  }

  return country;
}

function calculatePercentage(
  part: number,
  total: number
): number {
  if (
    total <= 0
  ) {
    return 0;
  }

  return Number(
    (
      (
        part /
        total
      ) *
      100
    ).toFixed(
      2
    )
  );
}

/*
 * Uncached collector.
 *
 * This is the only function that performs
 * the expensive shared reads for AI CEO
 * analysis departments:
 *
 * - Firestore users
 * - Firestore payments
 * - Google Analytics
 * - Google Search Console
 *
 * It is intentionally kept private so
 * departments use the shared cached
 * collectAICEOData() function below.
 */
async function collectAICEODataUncached():
  Promise<AICEODataSnapshot> {
  const [
    usersSnap,
    paymentsSnap,
    googleAnalyticsReport,
    searchCountries,
    searchQueries,
    searchPages,
  ] =
    await Promise.all([
      adminDb
        .collection(
          "users"
        )
        .get(),

      adminDb
        .collection(
          "payments"
        )
        .get(),

      getUsersByCountry()
        .catch(
          (
            error
          ) => {
            console.error(
              "AI CEO GA4 collection failed:",
              error
            );

            return null;
          }
        ),

      getSearchCountries(
        100
      ).catch(
        (
          error
        ) => {
          console.error(
            "AI CEO Search Console countries failed:",
            error
          );

          return null;
        }
      ),

      getSearchQueries(
        100
      ).catch(
        (
          error
        ) => {
          console.error(
            "AI CEO Search Console queries failed:",
            error
          );

          return null;
        }
      ),

      getSearchPages(
        100
      ).catch(
        (
          error
        ) => {
          console.error(
            "AI CEO Search Console pages failed:",
            error
          );

          return null;
        }
      ),
    ]);

  const users =
    usersSnap.docs.map(
      (
        document
      ) => ({
        id:
          document.id,

        ...document.data(),
      })
    ) as any[];

  const payments =
    paymentsSnap.docs.map(
      (
        document
      ) => ({
        id:
          document.id,

        ...document.data(),
      })
    ) as any[];

  const countryMap =
    new Map<
      string,
      InternalCountryStats
    >();

  function ensureCountry(
    countryValue: unknown
  ): InternalCountryStats {
    const country =
      normalizeCountry(
        countryValue
      );

    if (
      !countryMap.has(
        country
      )
    ) {
      countryMap.set(
        country,
        {
          country,
          users: 0,
          vipUsers: 0,
          completedPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          revenue: 0,
        }
      );
    }

    return countryMap.get(
      country
    )!;
  }

  for (
    const user of users
  ) {
    const stats =
      ensureCountry(
        user.country ||
          user.countryName ||
          user.location?.country
      );

    stats.users +=
      1;

    if (
      user.isVip ===
      true
    ) {
      stats.vipUsers +=
        1;
    }
  }

  for (
    const payment of
      payments
  ) {
    let country =
      normalizeCountry(
        payment.country ||
          payment.countryName ||
          payment.billingCountry ||
          payment.nowpayments
            ?.country
      );

    if (
      country ===
        "Unknown" &&
      payment.uid
    ) {
      const relatedUser =
        users.find(
          (
            user
          ) =>
            user.id ===
            payment.uid
        );

      country =
        normalizeCountry(
          relatedUser?.country ||
            relatedUser
              ?.countryName ||
            relatedUser
              ?.location
              ?.country
        );
    }

    const stats =
      ensureCountry(
        country
      );

    const status =
      getPaymentStatus(
        payment
      );

    if (
      status ===
        "completed"
    ) {
      stats.completedPayments +=
        1;

      stats.revenue +=
        getPaymentAmount(
          payment
        );
    } else if (
      status ===
        "pending"
    ) {
      stats.pendingPayments +=
        1;
    } else if (
      status ===
        "failed"
    ) {
      stats.failedPayments +=
        1;
    }
  }

  const vipUsers =
    users.filter(
      (
        user
      ) =>
        user.isVip ===
        true
    ).length;

  const totalUsers =
    users.length;

  const freeUsers =
    Math.max(
      0,
      totalUsers -
        vipUsers
    );

  const countryStats =
    Array.from(
      countryMap.values()
    );

  const completedPayments =
    countryStats.reduce(
      (
        total,
        country
      ) =>
        total +
        country.completedPayments,
      0
    );

  const pendingPayments =
    countryStats.reduce(
      (
        total,
        country
      ) =>
        total +
        country.pendingPayments,
      0
    );

  const failedPayments =
    countryStats.reduce(
      (
        total,
        country
      ) =>
        total +
        country.failedPayments,
      0
    );

  const totalRevenue =
    countryStats.reduce(
      (
        total,
        country
      ) =>
        total +
        country.revenue,
      0
    );

  const processedPayments =
    completedPayments +
    failedPayments;

  const analyticsCountries:
    GoogleAnalyticsCountry[] =
      googleAnalyticsReport
        ?.rows?.map(
          (
            row
          ) => ({
            country:
              row
                .dimensionValues
                ?.[0]
                ?.value ||
              "Unknown",

            activeUsers:
              Number(
                row
                  .metricValues
                  ?.[0]
                  ?.value ||
                  0
              ),
          })
        ) ||
      [];

  const totalActiveUsers =
    analyticsCountries.reduce(
      (
        total,
        country
      ) =>
        total +
        country.activeUsers,
      0
    );

  const searchConsoleConnected =
    searchCountries !== null &&
    searchQueries !== null &&
    searchPages !== null;

  const safeSearchCountries =
    searchCountries || [];

  const safeSearchQueries =
    searchQueries || [];

  const safeSearchPages =
    searchPages || [];

  const searchClicks =
    safeSearchCountries.reduce(
      (
        total,
        country
      ) =>
        total +
        Number(
          country.clicks ||
            0
        ),
      0
    );

  const searchImpressions =
    safeSearchCountries.reduce(
      (
        total,
        country
      ) =>
        total +
        Number(
          country.impressions ||
            0
        ),
      0
    );

  const positionWeight =
    safeSearchCountries.reduce(
      (
        total,
        country
      ) => {
        const impressions =
          Number(
            country.impressions ||
              0
          );

        const position =
          Number(
            country.position ||
              0
          );

        return (
          impressions > 0 &&
          position > 0
        )
          ? total +
              impressions
          : total;
      },
      0
    );

  const weightedPositionTotal =
    safeSearchCountries.reduce(
      (
        total,
        country
      ) => {
        const impressions =
          Number(
            country.impressions ||
              0
          );

        const position =
          Number(
            country.position ||
              0
          );

        return (
          impressions > 0 &&
          position > 0
        )
          ? total +
              position *
                impressions
          : total;
      },
      0
    );

  const averagePosition =
    positionWeight <= 0
      ? 0
      : Number(
          (
            weightedPositionTotal /
            positionWeight
          ).toFixed(
            2
          )
        );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    internal: {
      totalUsers,

      vipUsers,

      freeUsers,

      totalPayments:
        payments.length,

      completedPayments,

      pendingPayments,

      failedPayments,

      totalRevenue:
        Number(
          totalRevenue
            .toFixed(
              2
            )
        ),

      vipConversionRate:
        calculatePercentage(
          vipUsers,
          totalUsers
        ),

      paymentSuccessRate:
        calculatePercentage(
          completedPayments,
          processedPayments
        ),

      countries:
        countryStats.sort(
          (
            first,
            second
          ) => {
            if (
              second.revenue !==
              first.revenue
            ) {
              return (
                second.revenue -
                first.revenue
              );
            }

            return (
              second.users -
              first.users
            );
          }
        ),
    },

    googleAnalytics: {
      connected:
        Boolean(
          googleAnalyticsReport
        ),

      totalActiveUsers,

      countries:
        analyticsCountries.sort(
          (
            first,
            second
          ) =>
            second.activeUsers -
            first.activeUsers
        ),
    },

    searchConsole: {
      connected:
        searchConsoleConnected,

      totals: {
        clicks:
          searchClicks,

        impressions:
          searchImpressions,

        ctr:
          calculatePercentage(
            searchClicks,
            searchImpressions
          ),

        averagePosition,
      },

      countries:
        safeSearchCountries,

      queries:
        safeSearchQueries,

      pages:
        safeSearchPages,
    },
  };
}

/*
 * Shared AI CEO snapshot cache.
 *
 * SEO, Growth, Marketing and other analysis
 * departments reuse this result for 10
 * minutes instead of repeating the same
 * Firestore, GA4 and Search Console reads.
 */
const getCachedAICEOData =
  unstable_cache(
    async () =>
      collectAICEODataUncached(),

    [
      "zerra-ai-ceo-data-snapshot",
      "v3",
    ],

    {
      revalidate:
        AI_CEO_DATA_CACHE_SECONDS,

      tags: [
        "zerra-ai-ceo-data",
      ],
    }
  );

export async function collectAICEOData():
  Promise<AICEODataSnapshot> {
  return getCachedAICEOData();
}
