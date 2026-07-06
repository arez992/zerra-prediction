"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";

const plans = [
  { name: "Weekly", price: 9, description: "7 Days Access" },
  { name: "Monthly", price: 19, description: "Best Value" },
  { name: "Quarterly", price: 49, description: "Save 20%" },
];

export default function VipPage() {
  const [loading, setLoading] = useState("");

  async function buyPlan(plan: string, price: number) {
    setLoading(plan);

    const res = await fetch("/api/nowpayments/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        price,
        email: auth.currentUser?.email || "guest@zerra.com",
        uid: auth.currentUser?.uid || "guest",
      }),
    });

    const data = await res.json();

    if (data.invoice_url) {
      window.location.href = data.invoice_url;
    } else {
      alert("Payment error. Check NOWPayments settings.");
      console.log(data);
    }

    setLoading("");
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-14">
      <h1 className="text-5xl font-black text-white">Become a VIP Member</h1>

      <p className="mt-4 max-w-2xl text-white/70">
        Unlock all AI predictions, confidence scores, live predictions, and daily premium picks.
        Payments are handled securely with NOWPayments.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-8"
          >
            <h2 className="text-2xl font-bold text-[#D4AF37]">{plan.name}</h2>

            <p className="mt-3 text-4xl font-black text-white">
              {plan.price} USDT
            </p>

            <p className="mt-4 text-white/70">{plan.description}</p>

            <button
              onClick={() => buyPlan(plan.name, plan.price)}
              disabled={loading === plan.name}
              className="mt-8 w-full rounded-full bg-[#D4AF37] py-3 font-bold text-black disabled:opacity-60"
            >
              {loading === plan.name ? "Creating invoice..." : "Buy with USDT"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}