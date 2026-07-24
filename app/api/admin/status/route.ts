import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getServerAdminUser } from "@/lib/serverAdminAuth";
type ServiceStatus = "online" | "limited" | "offline";

async function checkFirebase(): Promise<ServiceStatus> {
  try {
    await adminDb.collection("settings").doc("site").get();
    return "online";
  } catch {
    return "offline";
  }
}

function checkEnv(name: string): ServiceStatus {
  return process.env[name] ? "online" : "offline";
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


  const firebase = await checkFirebase();

  const openaiKey = checkEnv("OPENAI_API_KEY");
  const footballApiKey = checkEnv("API_FOOTBALL_KEY");
  const nowpaymentsKey = checkEnv("NOWPAYMENTS_API_KEY");
  const nowpaymentsIpn = checkEnv("NOWPAYMENTS_IPN_SECRET");

  const environment =
    firebase === "online" &&
    openaiKey === "online" &&
    footballApiKey === "online" &&
    nowpaymentsKey === "online" &&
    nowpaymentsIpn === "online"
      ? "healthy"
      : "needs_attention";

  return NextResponse.json({
    success: true,
    status: {
      firebase,
      openai: openaiKey,
      footballApi: footballApiKey,
      nowpayments: nowpaymentsKey,
      webhookSecret: nowpaymentsIpn,
      environment,
      checkedAt: new Date().toISOString(),
    },
  });
}
