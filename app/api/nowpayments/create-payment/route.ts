import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { price, plan, email } = await request.json();

    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: price,
        price_currency: "usd",
        pay_currency:  "usdttrc20",
        order_id: `zerra-${Date.now()}`,
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