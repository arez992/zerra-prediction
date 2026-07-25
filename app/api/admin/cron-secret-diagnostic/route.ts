import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getServerAdminUser } from "@/lib/serverAdminAuth";

export const dynamic = "force-dynamic";`r`n// ZERRA_ENV_REFRESH_20260725

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

  const secret = process.env.CRON_SECRET ?? "";
  const fingerprint = secret
    ? createHash("sha256").update(secret, "utf8").digest("hex")
    : null;

  return NextResponse.json(
    {
      success: true,
      diagnostic: {
        present: secret.length > 0,
        length: secret.length,
        sha256: fingerprint,
        checkedAt: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
