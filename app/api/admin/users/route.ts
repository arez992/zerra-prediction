import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getServerAdminUser } from "@/lib/serverAdminAuth";

function serializeDate(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
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
      ? date.toISOString()
      : null;
  }

  if (
    value instanceof Date
  ) {
    return Number.isFinite(
      value.getTime()
    )
      ? value.toISOString()
      : null;
  }

  if (
    typeof value === "string"
  ) {
    const date =
      new Date(
        value
      );

    return Number.isFinite(
      date.getTime()
    )
      ? date.toISOString()
      : null;
  }

  return null;
}
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
    const snapshot = await adminDb.collection("users").limit(100).get();

    const users = snapshot.docs.map((doc) => {
      const data =
        doc.data();

      const expiresAt =
        serializeDate(
          data.expiresAt ??
            data.vipExpireAt
        );

      return {
        id:
          doc.id,
        ...data,
        expiresAt,
        // Temporary API alias for the existing admin UI.
        // Firestore writes use only the canonical expiresAt field.
        vipExpireAt:
          expiresAt,
      };
    });

    return NextResponse.json({
      success: true,
      users,
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

export async function PATCH(req: NextRequest) {

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
    const { id, data } = await req.json();

    await adminDb.collection("users").doc(id).update(data);

    return NextResponse.json({
      success: true,
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

export async function DELETE(req: NextRequest) {

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
    const { id } = await req.json();

    await adminDb.collection("users").doc(id).delete();

    return NextResponse.json({
      success: true,
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
