import Link from "next/link";
import PaymentActions from "@/components/admin/PaymentActions";

async function getPayments() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/payments`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.payments;

    return [];
  } catch {
    return [];
  }
}

export default async function AdminPaymentsPage() {
  const payments = await getPayments();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        → Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Payments</h1>

      <p className="mt-4 text-white/60">
        Latest NOWPayments invoices and VIP purchases.
      </p>

      <section className="mt-10 grid gap-4">
        {payments.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            No payments found.
          </div>
        ) : (
          payments.map((payment: any) => (
            <article
              key={payment.id}
              className="rounded-3xl border border-white/10 bg-[#101827] p-6"
            >
              <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
                <Info title="Order" value={payment.orderId || payment.id} />
                <Info title="Email" value={payment.email || "Unknown"} />
                <Info title="Plan" value={payment.plan || "Unknown"} />
                <Info title="Price" value={`${payment.price || 0} USDT`} />
                <Info title="Days" value={payment.days || "—"} />
                <Info title="Status" value={payment.status || "pending"} />
                <Info title="Payment ID" value={payment.paymentId || "—"} />
                <Info
                  title="Paid"
                  value={
                    payment.paidAmount
                      ? `${payment.paidAmount} ${payment.payCurrency || ""}`
                      : "—"
                  }
                />
              </div>

              <PaymentActions paymentId={payment.id} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function Info({ title, value }: { title: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase text-white/40">{title}</p>
      <p className="mt-1 break-words font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}
