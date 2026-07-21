import crypto from "crypto";
import { cookies } from "next/headers";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";
import type {
  VipPlan,
} from "@/lib/vip";

export type PurchasableVipPlan =
  Exclude<VipPlan, "Free">;

type SiteSettings = {
  monthlyPrice: number;
  quarterlyPrice: number;
  lifetimePrice: number;
  paymentsEnabled: boolean;
  vipEnabled: boolean;
};

const DEFAULT_SETTINGS: SiteSettings = {
  monthlyPrice: 14.99,
  quarterlyPrice: 39.99,
  lifetimePrice: 129,
  paymentsEnabled: true,
  vipEnabled: true,
};

export function normalizePurchasablePlan(
  value: unknown
): PurchasableVipPlan | null {
  if (
    value === "Monthly" ||
    value === "Quarterly" ||
    value === "Lifetime"
  ) {
    return value;
  }

  return null;
}

export function getPlanDays(
  plan: PurchasableVipPlan
): number | null {
  if (plan === "Monthly") {
    return 30;
  }

  if (plan === "Quarterly") {
    return 90;
  }

  return null;
}

function safePrice(
  value: unknown,
  fallback: number
): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : fallback;
}

export async function getVipBillingSettings(): Promise<SiteSettings> {
  const snapshot =
    await adminDb
      .collection("settings")
      .doc("site")
      .get();

  const data =
    snapshot.data() || {};

  return {
    monthlyPrice:
      safePrice(
        data.monthlyPrice,
        DEFAULT_SETTINGS.monthlyPrice
      ),
    quarterlyPrice:
      safePrice(
        data.quarterlyPrice,
        DEFAULT_SETTINGS.quarterlyPrice
      ),
    lifetimePrice:
      safePrice(
        data.lifetimePrice,
        DEFAULT_SETTINGS.lifetimePrice
      ),
    paymentsEnabled:
      data.paymentsEnabled !== false,
    vipEnabled:
      data.vipEnabled !== false,
  };
}

export function getPlanPrice(
  settings: SiteSettings,
  plan: PurchasableVipPlan
): number {
  if (plan === "Monthly") {
    return settings.monthlyPrice;
  }

  if (plan === "Quarterly") {
    return settings.quarterlyPrice;
  }

  return settings.lifetimePrice;
}

export async function requireBillingUser() {
  const cookieStore =
    await cookies();

  const sessionCookie =
    cookieStore.get(
      "firebaseSession"
    )?.value;

  if (!sessionCookie) {
    throw new Error(
      "Authentication required"
    );
  }

  const decoded =
    await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

  return {
    uid: decoded.uid,
    email: decoded.email || null,
  };
}

export function createOrderId(): string {
  return `zerra-${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}`;
}

export function normalizeLocale(
  value: unknown
): "en" | "ku" {
  return value === "ku"
    ? "ku"
    : "en";
}

export async function createNowPaymentsInvoice(input: {
  orderId: string;
  plan: PurchasableVipPlan;
  price: number;
  email: string | null;
  locale: "en" | "ku";
}) {
  const apiKey =
    process.env.NOWPAYMENTS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NOWPAYMENTS_API_KEY is missing"
    );
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://zerraprediction.com"
  ).replace(/\/+$/, "");

  const response = await fetch(
    "https://api.nowpayments.io/v1/invoice",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        price_amount: input.price,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_id: input.orderId,
        order_description:
          `ZERRA VIP ${input.plan}`,
        ipn_callback_url:
          `${siteUrl}/api/nowpayments/webhook`,
        success_url:
          `${siteUrl}/${input.locale}/dashboard?payment=success`,
        cancel_url:
          `${siteUrl}/${input.locale}/vip?payment=cancel`,
        customer_email:
          input.email || undefined,
      }),
      cache: "no-store",
    }
  );

  const raw =
    await response.text();

  let data: Record<string, unknown>;

  try {
    data = raw
      ? (JSON.parse(raw) as Record<
          string,
          unknown
        >)
      : {};
  } catch {
    throw new Error(
      "NOWPayments returned invalid JSON"
    );
  }

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "NOWPayments invoice creation failed"
    );
  }

  return data;
}
