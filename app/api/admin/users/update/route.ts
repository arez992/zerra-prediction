import {
  NextResponse,
} from "next/server";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  getPlanDays,
  normalizePurchasablePlan,
} from "@/lib/nowPaymentsBilling";
import {
  timestampLikeToMillis,
} from "@/lib/paymentRecords";
import {
  getServerAdminUser,
} from "@/lib/serverAdminAuth";

const ALLOWED_ROLES =
  new Set([
    "user",
    "admin",
  ]);

export async function POST(
  request: Request
) {
  const admin =
    await getServerAdminUser();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Unauthorized admin access",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  try {
    const body =
      (await request.json()) as {
        uid?: unknown;
        role?: unknown;
        isVip?: unknown;
        plan?: unknown;
        expiresAt?: unknown;
        vipExpireAt?: unknown;
      };

    const uid =
      typeof body.uid ===
        "string"
        ? body.uid.trim()
        : "";

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing user uid",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const requestedRole =
      typeof body.role ===
        "string"
        ? body.role.trim()
        : "user";

    if (
      !ALLOWED_ROLES.has(
        requestedRole
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid user role",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const isVip =
      body.isVip === true;

    const requestedPlan =
      typeof body.plan ===
        "string"
        ? body.plan
        : "Free";

    const plan =
      isVip
        ? normalizePurchasablePlan(
            requestedPlan
          )
        : null;

    if (
      isVip &&
      !plan
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid VIP plan",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    let expiresAt:
      Timestamp |
      null = null;

    if (
      isVip &&
      plan &&
      plan !==
        "Lifetime"
    ) {
      const requestedExpiry =
        timestampLikeToMillis(
          body.expiresAt ??
            body.vipExpireAt
        );

      if (
        requestedExpiry &&
        requestedExpiry >
          Date.now()
      ) {
        expiresAt =
          Timestamp.fromMillis(
            requestedExpiry
          );
      } else {
        const days =
          getPlanDays(
            plan
          );

        if (!days) {
          throw new Error(
            "Invalid plan duration"
          );
        }

        expiresAt =
          Timestamp.fromMillis(
            Date.now() +
              days *
                24 *
                60 *
                60 *
                1000
          );
      }
    }

    await adminDb
      .collection(
        "users"
      )
      .doc(
        uid
      )
      .set(
        {
          role:
            requestedRole,
          isVip,
          plan:
            isVip &&
            plan
              ? plan
              : "Free",
          expiresAt,
          vipExpireAt:
            FieldValue.delete(),
          updatedAt:
            FieldValue.serverTimestamp(),
          adminUpdatedBy:
            admin.email ||
            admin.uid,
        },
        {
          merge:
            true,
        }
      );

    return NextResponse.json(
      {
        success:
          true,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update user",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
