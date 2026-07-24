import {
  NextResponse,
} from "next/server";

import {
  adminDb,
} from "@/lib/firebaseAdmin";
import {
  getPaymentAmount,
  getPaymentStatus,
} from "@/lib/paymentRecords";
import {
  getServerAdminUser,
} from "@/lib/serverAdminAuth";

export async function GET() {
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
    const snapshot =
      await adminDb
        .collection(
          "payments"
        )
        .orderBy(
          "createdAt",
          "desc"
        )
        .limit(
          50
        )
        .get();

    const payments =
      snapshot.docs.map(
        (
          document
        ) => {
          const data =
            document.data();

          return {
            id:
              document.id,
            ...data,
            status:
              getPaymentStatus(
                data
              ),
            price:
              getPaymentAmount(
                data
              ),
          };
        }
      );

    return NextResponse.json(
      {
        success:
          true,
        payments,
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
            : "Unable to load payments",
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
