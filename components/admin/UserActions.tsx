"use client";

import { useState } from "react";

export default function UserActions({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);

  async function updateUser(payload: any) {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.id,
          role: user.role || "user",
          isVip: user.isVip || false,
          plan: user.plan || "Free",
          vipExpireAt: user.vipExpireAt || null,
          ...payload,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Update failed");
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
    <div className="mt-5 flex flex-wrap gap-3">
      <button
        disabled={loading}
        onClick={() =>
          updateUser({
            role: user.role === "admin" ? "user" : "admin",
          })
        }
        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {user.role === "admin" ? "Remove Admin" : "Make Admin"}
      </button>

      <button
        disabled={loading}
        onClick={() =>
          updateUser({
            isVip: !user.isVip,
            plan: user.isVip ? "Free" : "Monthly",
            vipExpireAt: user.isVip
              ? null
              : "2030-01-01T00:00:00.000Z",
          })
        }
        className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-black text-black disabled:opacity-50"
      >
        {user.isVip ? "Remove VIP" : "Make VIP"}
      </button>
    </div>
  );
}