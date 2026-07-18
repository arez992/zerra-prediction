import {
  NextResponse,
} from "next/server";

import {
  unstable_cache,
} from "next/cache";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

export const runtime =
  "nodejs";

export const revalidate =
  300;

const getCachedAdminStats =
  unstable_cache(
    async () => {
      const [
        vipUsersSnapshot,
        paymentsSnapshot,
        predictionsSnapshot,
        aiCacheSnapshot,
      ] =
        await Promise.all([
          adminDb
            .collection("users")
            .where(
              "isVip",
              "==",
              true
            )
            .count()
            .get(),

          adminDb
            .collection(
              "payments"
            )
            .count()
            .get(),

          adminDb
            .collection(
              "predictionHistory"
            )
            .count()
            .get(),

          adminDb
            .collection(
              "aiAnalysisCache"
            )
            .count()
            .get(),
        ]);

      return {
        vipUsers:
          vipUsersSnapshot
            .data()
            .count,

        payments:
          paymentsSnapshot
            .data()
            .count,

        predictions:
          predictionsSnapshot
            .data()
            .count,

        aiCache:
          aiCacheSnapshot
            .data()
            .count,
      };
    },
    [
      "zerra-admin-stats",
    ],
    {
      revalidate: 300,
    }
  );

export async function GET() {
  try {
    const stats =
      await getCachedAdminStats();

    return NextResponse.json(
      {
        success: true,
        stats,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error(
      "[ADMIN_STATS_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load admin stats.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}