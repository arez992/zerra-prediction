import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const planDays: Record<string, number> = {
  Weekly: 7,
  Monthly: 30,
  Quarterly: 90,
};

export async function POST(request: Request) {
  try {
    const { price, plan, email, uid } = await request.json();

    const orderId = `zerra-${Date.now()}`;

    await setDoc(doc(db, "payments", orderId), {
      orderId,
      uid,
      email,
      plan,
      price,
      days: planDays[plan] || 7,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: price,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_id: orderId,
        order_description: `ZERRA VIP ${plan}`,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/en/dashboard`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/en/vip`,
        customer_email: email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}