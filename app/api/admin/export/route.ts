import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getServerAdminUser } from "@/lib/serverAdminAuth";
function csvEscape(value: any) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function toCsv(rows: any[], columns: string[]) {
  const header = columns.map(csvEscape).join(",");

  const body = rows
    .map((row) => columns.map((column) => csvEscape(row[column])).join(","))
    .join("\n");

  return `${header}\n${body}`;
}

export async function GET(request: NextRequest) {

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
    const type = request.nextUrl.searchParams.get("type") || "users";

    const allowedTypes = ["users", "payments", "activityLogs"];

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid export type" },
        { status: 400 }
      );
    }

    const snap = await adminDb.collection(type).limit(1000).get();

    const rows = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const columns =
      type === "users"
        ? ["id", "email", "role", "isVip", "plan", "vipExpireAt"]
        : type === "payments"
        ? ["id", "orderId", "email", "plan", "price", "days", "status", "paymentId"]
        : ["id", "type", "actor", "message", "targetId", "createdAt"];

    const csv = toCsv(rows, columns);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
