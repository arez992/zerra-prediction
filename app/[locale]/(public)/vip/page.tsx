"use client";

import {
  useEffect,
  useState,
} from "react";

const features = [
  {
    title: "Premium AI Predictions",
    description:
      "Access ZERRA premium football predictions before kickoff.",
  },
  {
    title: "High Confidence Picks",
    description:
      "Focus on predictions with stronger model confidence signals.",
  },
  {
    title: "Goal Market Intelligence",
    description:
      "Get detailed Over/Under, expected goals, and BTTS probabilities.",
  },
  {
    title: "Risk Analysis",
    description:
      "Understand model uncertainty and match risk before making decisions.",
  },
  {
    title: "Value Signals",
    description:
      "See value-bet signals identified by the ZERRA prediction engine.",
  },
  {
    title: "Early Premium Access",
    description:
      "Unlock premium match intelligence and exclusive prediction details.",
  },
];

type VipPlan = {
  name:
    | "Monthly"
    | "Quarterly"
    | "Lifetime";
  price: number;
  description: string;
  badge: string;
  featured?: boolean;
};

export default function VipPage() {
  const [
    loading,
    setLoading,
  ] =
    useState("");

  const [
    settings,
    setSettings,
  ] =
    useState<any>(
      null
    );

  useEffect(() => {
    async function loadSettings() {
      try {
        const response =
          await fetch(
            "/api/admin/settings",
            {
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        if (
          data?.success
        ) {
          setSettings(
            data.settings
          );
        }
      } catch {
        setSettings(
          null
        );
      }
    }

    void loadSettings();
  }, []);

  const currency =
    settings?.currency ||
    "USDT";

  const plans: VipPlan[] = [
    {
      name:
        "Monthly",
      price:
        settings?.monthlyPrice ??
        14.99,
      description:
        "30 days of premium access",
      badge:
        "Flexible",
    },
    {
      name:
        "Quarterly",
      price:
        settings?.quarterlyPrice ??
        39.99,
      description:
        "90 days of premium access",
      badge:
        "Best Value",
      featured:
        true,
    },
    {
      name:
        "Lifetime",
      price:
        settings?.lifetimePrice ??
        129,
      description:
        "Lifetime premium access",
      badge:
        "One Time",
    },
  ];

  async function buyPlan(
    plan: VipPlan["name"]
  ) {
    setLoading(
      plan
    );

    try {
      const locale =
        window.location.pathname
          .split("/")
          .filter(Boolean)[0] ===
        "ku"
          ? "ku"
          : "en";

      const response =
        await fetch(
          "/api/nowpayments/create-payment",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  plan,
                  locale,
                }
              ),
          }
        );

      const data =
        await response.json();

      if (
        response.status ===
        401
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
        typeof data.error ===
          "string"
          ? data.error
          : "Payment error. Check NOWPayments settings."
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      alert(
        "Payment request failed."
      );
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#102117]">
      <section className="border-b border-[#e1e9e3] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center md:px-6 md:py-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#eaf7ef] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
            ZERRA VIP
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            Unlock Premium Football
            Intelligence
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#66756c]">
            Get access to premium AI
            predictions, confidence
            signals, goal-market
            intelligence, risk analysis,
            and exclusive ZERRA match
            insights.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-bold text-[#536158]">
            <TrustBadge label="Secure Crypto Payment" />
            <TrustBadge label="Instant VIP Activation" />
            <TrustBadge label="Real Football Data" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map(
            (
              feature,
              index
            ) => (
              <article
                key={
                  feature.title
                }
                className="rounded-2xl border border-[#dce8df] bg-white p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ef] text-sm font-black text-[#139653]">
                  {String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )}
                </div>

                <h2 className="mt-5 text-lg font-black">
                  {feature.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#758179]">
                  {feature.description}
                </p>
              </article>
            )
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-6">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
            Choose Your Plan
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            Simple VIP Access
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#758179]">
            Choose the plan that fits
            your needs. Prices are loaded
            from the current ZERRA payment
            settings.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map(
            (
              plan
            ) => (
              <article
                key={
                  plan.name
                }
                className={`relative overflow-hidden rounded-[1.75rem] border p-7 ${
                  plan.featured
                    ? "border-[#139653] bg-[#102117] text-white shadow-[0_20px_60px_rgba(15,90,50,0.12)]"
                    : "border-[#dce8df] bg-white"
                }`}
              >
                {plan.featured && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#f1c84b] px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-[#102117]">
                    Recommended
                  </div>
                )}

                <div
                  className={`inline-flex rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] ${
                    plan.featured
                      ? "bg-white/10 text-[#86e5aa]"
                      : "bg-[#eaf7ef] text-[#139653]"
                  }`}
                >
                  {plan.badge}
                </div>

                <h3 className="mt-6 text-2xl font-black">
                  {plan.name}
                </h3>

                <p
                  className={`mt-2 text-sm ${
                    plan.featured
                      ? "text-white/60"
                      : "text-[#758179]"
                  }`}
                >
                  {plan.description}
                </p>

                <div className="mt-7 flex items-end gap-2">
                  <span className="text-5xl font-black">
                    {plan.price}
                  </span>

                  <span
                    className={`pb-1 text-sm font-bold ${
                      plan.featured
                        ? "text-white/60"
                        : "text-[#758179]"
                    }`}
                  >
                    {currency}
                  </span>
                </div>

                <div className="mt-7 grid gap-3">
                  <PlanFeature
                    featured={
                      plan.featured
                    }
                    text="Premium AI predictions"
                  />

                  <PlanFeature
                    featured={
                      plan.featured
                    }
                    text="Confidence and risk signals"
                  />

                  <PlanFeature
                    featured={
                      plan.featured
                    }
                    text="Goal-market probabilities"
                  />

                  <PlanFeature
                    featured={
                      plan.featured
                    }
                    text="Premium match intelligence"
                  />
                </div>

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
                  className={`mt-8 w-full rounded-xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.featured
                      ? "bg-[#f1c84b] text-[#102117] hover:opacity-95"
                      : "bg-[#139653] text-white hover:bg-[#0d7a40]"
                  }`}
                >
                  {loading ===
                  plan.name
                    ? "Creating invoice..."
                    : `Continue with ${currency}`}
                </button>
              </article>
            )
          )}
        </div>
      </section>

      <section className="border-t border-[#e1e9e3] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-12 md:grid-cols-3 md:px-6">
          <InfoBlock
            title="Secure Checkout"
            text="Payments are processed through the configured NOWPayments checkout flow."
          />

          <InfoBlock
            title="VIP Access"
            text="Successful purchases unlock premium ZERRA features according to your active plan."
          />

          <InfoBlock
            title="Football Intelligence"
            text="VIP access focuses on ZERRA premium prediction data and advanced match analysis."
          />
        </div>
      </section>
    </main>
  );
}

function TrustBadge({
  label,
}: {
  label: string;
}) {
  return (
    <span className="rounded-full border border-[#dce8df] bg-[#fbfdfb] px-4 py-2">
      ✓ {label}
    </span>
  );
}

function PlanFeature({
  text,
  featured,
}: {
  text: string;
  featured?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
          featured
            ? "bg-[#1f5b38] text-[#84e4a8]"
            : "bg-[#eaf7ef] text-[#139653]"
        }`}
      >
        ✓
      </span>

      <span
        className={`text-sm font-bold ${
          featured
            ? "text-white/75"
            : "text-[#536158]"
        }`}
      >
        {text}
      </span>
    </div>
  );
}

function InfoBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dce8df] bg-[#fbfdfb] p-5">
      <p className="font-black">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-[#758179]">
        {text}
      </p>
    </div>
  );
}