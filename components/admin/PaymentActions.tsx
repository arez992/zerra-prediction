"use client";

import { useState } from "react";

export default function PaymentActions({
  paymentId,
}: {
  paymentId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/payments/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
          status,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Update failed");
        return;
      }

      alert(`Payment marked as ${status}`);
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        disabled={loading}
        onClick={() => updateStatus("completed")}
        className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        Complete
      </button>

      <button
        disabled={loading}
        onClick={() => updateStatus("pending")}
        className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
      >
        Pending
      </button>

      <button
        disabled={loading}
        onClick={() => updateStatus("failed")}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        Failed
      </button>
    </div>
  );
}