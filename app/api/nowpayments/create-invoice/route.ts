import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: body.amount,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_id: body.orderId,
        order_description: body.description,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/en/dashboard?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/en/vip?payment=cancel`,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}