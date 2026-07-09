"use client";

import { useState } from "react";

export default function PredictionActions({
  predictionId,
}: {
  predictionId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function runAction(action: string) {
    if (action === "delete" && !confirm("Delete this prediction?")) return;

    try {
      setLoading(true);

      const res = await fetch("/api/admin/predictions/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          predictionId,
          action,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Action failed");
        return;
      }

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
        onClick={() => runAction("correct")}
        className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        Correct
      </button>

      <button
        disabled={loading}
        onClick={() => runAction("wrong")}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        Wrong
      </button>

      <button
        disabled={loading}
        onClick={() => runAction("pending")}
        className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
      >
        Pending
      </button>

      <button
        disabled={loading}
        onClick={() => runAction("delete")}
        className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}