import {
  NextResponse,
} from "next/server";

import {
  Timestamp,
} from "firebase-admin/firestore";

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
  runAnalyticsReport,
} from "@/lib/google/analytics";

import { getServerAdminUser } from "@/lib/serverAdminAuth";
export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  300;

type BestCurrentMarket = {
  country:
    string;

  score:
    number;

  action:
    "Expand" |
    "Test" |
    "Monitor" |
    "Pause";
};

type UserRecord = {
  id:
    string;

  isVip?:
    boolean;

  country?:
    string;

  countryName?:
    string;

  location?: {
    country?:
      string;
  };
};

type PaymentRecord = {
  id:
    string;

  uid?:
    string;

  status?:
    string;

  paymentStatus?:
    string;

  price?:
    number | string;

  country?:
    string;

  countryName?:
    string;

  billingCountry?:
    string;

  nowpayments?: {
    country?:
      string;
  };

  completedAt?:
    unknown;

  createdAt?:
    unknown;
};

function normalizeCountry(
  value:
    unknown
): string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return "Unknown";
  }

  return value.trim();
}

function getAction(
  score:
    number
): BestCurrentMarket["action"] {
  if (
    score >=
    75
  ) {
    return "Expand";
  }

  if (
    score >=
    50
  ) {
    return "Test";
  }

  if (
    score >=
    25
  ) {
    return "Monitor";
  }

  return "Pause";
}

function calculateMarketScore({
  users,
  vipConversionRate,
  paymentSuccessRate,
  revenue,
  failedPayments,
}: {
  users:
    number;

  vipConversionRate:
    number;

  paymentSuccessRate:
    number;

  revenue:
    number;

  failedPayments:
    number;
}): number {
  const userScore =
    Math.min(
      users * 2.5,
      30
    );

  const vipScore =
    Math.min(
      vipConversionRate *
        0.3,
      25
    );

  const paymentScore =
    Math.min(
      paymentSuccessRate *
        0.25,
      25
    );

  const revenueScore =
    Math.min(
      revenue / 10,
      20
    );

  const failedPenalty =
    Math.min(
      failedPayments * 3,
      15
    );

  return Number(
    Math.max(
      0,
      Math.min(
        userScore +
          vipScore +
          paymentScore +
          revenueScore -
          failedPenalty,
        100
      )
    ).toFixed(
      1
    )
  );
}

function toDate(
  value:
    unknown
): Date | null {
  if (
    !value
  ) {
    return null;
  }

  if (
    typeof value ===
      "object" &&
    value !==
      null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate ===
      "function"
  ) {
    const date =
      (
        value as {
          toDate:
            () => Date;
        }
      ).toDate();

    return Number.isFinite(
      date.getTime()
    )
      ? date
      : null;
  }

  if (
    typeof value ===
      "string"
  ) {
    const date =
      new Date(
        value
      );

    return Number.isFinite(
      date.getTime()
    )
      ? date
      : null;
  }

  if (
    value instanceof
      Date
  ) {
    return Number.isFinite(
      value.getTime()
    )
      ? value
      : null;
  }

  return null;
}

function getTodayUTCWindow() {
  const now =
    new Date();

  const start =
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );

  const end =
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() +
          1,
        0,
        0,
        0,
        0
      )
    );

  return {
    start,
    end,
  };
}

function isInsideWindow(
  value:
    unknown,

  start:
    Date,

  end:
    Date
): boolean {
  const date =
    toDate(
      value
    );

  if (
    !date
  ) {
    return false;
  }

  return (
    date.getTime() >=
      start.getTime() &&
    date.getTime() <
      end.getTime()
  );
}

async function getTodayViews(): Promise<
  number | null
> {
  try {
    const report =
      await runAnalyticsReport({
        metrics: [
          "screenPageViews",
        ],

        startDate:
          "today",

        endDate:
          "today",
      });

    const value =
      report
        .rows?.[0]
        ?.metricValues?.[0]
        ?.value;

    if (
      value ===
        undefined ||
      value ===
        null
    ) {
      return 0;
    }

    const parsed =
      Number(
        value
      );

    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0;
  } catch (
    error
  ) {
    console.warn(
      "[ADMIN_STATS_GA4_WARNING]",
      error
    );

    return null;
  }
}

function calculateBestCurrentMarket(
  users:
    UserRecord[],

  payments:
    PaymentRecord[]
): BestCurrentMarket | null {
  const countryMap =
    new Map<
      string,
      {
        users:
          number;

        vipUsers:
          number;

        revenue:
          number;

        completedPayments:
          number;

        failedPayments:
          number;
      }
    >();

  const ensureCountry =
    (
      country:
        string
    ) => {
      if (
        !countryMap.has(
          country
        )
      ) {
        countryMap.set(
          country,
          {
            users:
              0,

            vipUsers:
              0,

            revenue:
              0,

            completedPayments:
              0,

            failedPayments:
              0,
          }
        );
      }

      return countryMap.get(
        country
      )!;
    };

  for (
    const user
    of users
  ) {
    const country =
      normalizeCountry(
        user.country ||
          user.countryName ||
          user.location
            ?.country
      );

    const stats =
      ensureCountry(
        country
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
    const payment
    of payments
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
          relatedUser
            ?.country ||
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

    const paymentStatus =
      getPaymentStatus(
        payment as unknown as Record<
          string,
          unknown
        >
      );

    if (
      paymentStatus ===
        "completed"
    ) {
      stats.completedPayments +=
        1;

      stats.revenue +=
        getPaymentAmount(
          payment as unknown as Record<
            string,
            unknown
          >
        );
    } else if (
      paymentStatus ===
        "failed"
    ) {
      stats.failedPayments +=
        1;
    }
  }

  const markets =
    Array.from(
      countryMap.entries()
    )
      .map(
        (
          [
            country,
            stats,
          ]
        ) => {
          const vipConversionRate =
            stats.users ===
            0
              ? 0
              : Number(
                  (
                    (
                      stats.vipUsers /
                      stats.users
                    ) *
                    100
                  ).toFixed(
                    1
                  )
                );

          const processedPayments =
            stats.completedPayments +
            stats.failedPayments;

          const paymentSuccessRate =
            processedPayments ===
            0
              ? 0
              : Number(
                  (
                    (
                      stats.completedPayments /
                      processedPayments
                    ) *
                    100
                  ).toFixed(
                    1
                  )
                );

          const score =
            calculateMarketScore({
              users:
                stats.users,

              vipConversionRate,

              paymentSuccessRate,

              revenue:
                stats.revenue,

              failedPayments:
                stats.failedPayments,
            });

          return {
            country,
            score,

            action:
              getAction(
                score
              ),
          };
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );

  return (
    markets[0] ||
    null
  );
}

const getCachedAdminStats =
  unstable_cache(
    async () => {
      const {
        start,
        end,
      } =
        getTodayUTCWindow();

      const [
        usersSnapshot,
        paymentsSnapshot,
        dailyPredictionsSnapshot,
        dailySEOSnapshot,
        todayViews,
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

          adminDb
            .collection(
              "predictionHistory"
            )
            .where(
              "publishedAt",
              ">=",
              Timestamp.fromDate(
                start
              )
            )
            .where(
              "publishedAt",
              "<",
              Timestamp.fromDate(
                end
              )
            )
            .count()
            .get(),

          adminDb
            .collection(
              "seoPageDrafts"
            )
            .where(
              "publishedAt",
              ">=",
              Timestamp.fromDate(
                start
              )
            )
            .where(
              "publishedAt",
              "<",
              Timestamp.fromDate(
                end
              )
            )
            .count()
            .get(),

          getTodayViews(),
        ]);

      const users =
        usersSnapshot
          .docs
          .map(
            (
              document
            ) => ({
              id:
                document.id,

              ...document.data(),
            })
          ) as UserRecord[];

      const payments =
        paymentsSnapshot
          .docs
          .map(
            (
              document
            ) => ({
              id:
                document.id,

              ...document.data(),
            })
          ) as PaymentRecord[];

      const vipUsers =
        users.filter(
          (
            user
          ) =>
            user.isVip ===
            true
        ).length;

      const completedPayments =
        payments.filter(
          (
            payment
          ) =>
            getPaymentStatus(
              payment as unknown as Record<
                string,
                unknown
              >
            ) ===
              "completed"
        );

      const todayRevenue =
        completedPayments
          .filter(
            (
              payment
            ) =>
              isInsideWindow(
                payment.completedAt ||
                  payment.createdAt,
                start,
                end
              )
          )
          .reduce(
            (
              total,
              payment
            ) =>
              total +
              getPaymentAmount(
                payment as unknown as Record<
                  string,
                  unknown
                >
              ),
            0
          );

      const bestCurrentMarket =
        calculateBestCurrentMarket(
          users,
          payments
        );

      return {
        totalUsers:
          users.length,

        vipUsers,

        dailyPublishedPredictions:
          dailyPredictionsSnapshot
            .data()
            .count,

        dailySEOPublished:
          dailySEOSnapshot
            .data()
            .count,

        todayRevenue:
          Number(
            todayRevenue.toFixed(
              2
            )
          ),

        todayViews,

        bestCurrentMarket,

        generatedAt:
          new Date()
            .toISOString(),

        timezone:
          "UTC",
      };
    },

    [
      "zerra-admin-dashboard-stats-v3",
    ],

    {
      revalidate:
        300,
    }
  );

export async function GET() {

  const admin = await getServerAdminUser();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized admin access",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }


  try {
    const stats =
      await getCachedAdminStats();

    return NextResponse.json(
      {
        success:
          true,

        stats,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[ADMIN_STATS_ERROR]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Unable to load admin stats.";

    return NextResponse.json(
      {
        success:
          false,

        error:
          message,
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }
}
