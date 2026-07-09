"use client";

import { useState } from "react";

export default function CacheActions({ cacheId }: { cacheId: string }) {
  const [loading, setLoading] = useState(false);

  async function deleteCache() {
    if (!confirm("Delete this AI cache item?")) return;

    try {
      setLoading(true);

      const res = await fetch("/api/admin/cache/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cacheId }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Delete failed");
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
        onClick={deleteCache}
        className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 disabled:opacity-50"
      >
        Delete Cache
      </button>
    </div>
  );
}