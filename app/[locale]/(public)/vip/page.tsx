"use client";

import {
  useEffect,
  useState,
} from "react";

const features = [
  "Premium AI predictions",
  "High confidence picks",
  "VIP value bets",
  "Risk level analysis",
  "Daily football insights",
  "Early access to premium picks",
];

type VipPlan = {
  name:
    | "Monthly"
    | "Quarterly"
    | "Lifetime";
  price: number;
  description: string;
  badge: string;
};

export default function VipPage() {
  const [loading, setLoading] =
    useState("");
  const [settings, setSettings] =
    useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(
          "/api/admin/settings",
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (data?.success) {
          setSettings(
            data.settings
          );
        }
      } catch {
        setSettings(null);
      }
    }

    void loadSettings();
  }, []);

  const currency =
    settings?.currency || "USDT";

  const plans: VipPlan[] = [
    {
      name: "Monthly",
      price:
        settings?.monthlyPrice ??
        14.99,
      description:
        "30 Days Premium Access",
      badge: "Most Popular",
    },
    {
      name: "Quarterly",
      price:
        settings?.quarterlyPrice ??
        39.99,
      description:
        "90 Days Premium Access",
      badge: "Best Value",
    },
    {
      name: "Lifetime",
      price:
        settings?.lifetimePrice ??
        129,
      description:
        "Lifetime Premium Access",
      badge: "Lifetime",
    },
  ];

  async function buyPlan(
    plan: VipPlan["name"]
  ) {
    setLoading(plan);

    try {
      const locale =
        window.location.pathname
          .split("/")
          .filter(Boolean)[0] ===
        "ku"
          ? "ku"
          : "en";

      const response = await fetch(
        "/api/nowpayments/create-payment",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            plan,
            locale,
          }),
        }
      );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        window.location.href =
          `/${locale}/login`;
        return;
      }

      if (
        response.ok &&
        data.invoice_url
      ) {
        window.location.href =
          data.invoice_url;
        return;
      }

      alert(
        typeof data.error === "string"
          ? data.error
          : "Payment error. Check NOWPayments settings."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Payment request failed."
      );
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 text-white">
      <section className="rounded-[2rem] border border-[#D4AF37]/40 bg-[#0B1220] p-8 text-center shadow-2xl md:p-12">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">
          ZERRA VIP
        </p>

        <h1 className="mt-4 text-5xl font-black md:text-6xl">
          Unlock Premium AI Predictions
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-white/60">
          Get access to VIP football
          predictions, confidence scores,
          risk analysis, value bets, and
          premium AI insights powered by
          the ZERRA AI Engine.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 font-bold text-white/70"
          >
            ✓ {feature}
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-[2rem] border p-8 shadow-xl ${
              plan.name ===
              "Quarterly"
                ? "border-[#D4AF37] bg-[#101827]"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="mb-5 inline-flex rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-black">
              {plan.badge}
            </div>

            <h2 className="text-3xl font-black text-white">
              {plan.name}
            </h2>

            <p className="mt-4 text-5xl font-black text-[#D4AF37]">
              {plan.price}{" "}
              {currency}
            </p>

            <p className="mt-4 text-white/60">
              {plan.description}
            </p>

            <button
              type="button"
              onClick={() =>
                void buyPlan(
                  plan.name
                )
              }
              disabled={
                loading ===
                plan.name
              }
              className="mt-8 w-full rounded-full bg-[#D4AF37] py-4 font-black text-black transition hover:scale-[1.02] disabled:opacity-60"
            >
              {loading ===
              plan.name
                ? "Creating invoice..."
                : `Buy with ${currency}`}
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}