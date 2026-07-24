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
          expiresAt:
            user.expiresAt ||
            user.vipExpireAt ||
            null,
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

  async function deleteUser() {
    if (!confirm("Delete this user?")) return;

    try {
      setLoading(true);

      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
        }),
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

  function extendVip() {
    const currentExpiry =
      user.expiresAt ||
      user.vipExpireAt;

    const expire =
      currentExpiry
        ? new Date(
            currentExpiry
          )
        : new Date();

    expire.setDate(expire.getDate() + 30);

    updateUser({
      isVip: true,
      plan: user.plan || "Monthly",
      expiresAt:
        expire.toISOString(),
    });
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
        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
      >
        {user.role === "admin" ? "Remove Admin" : "Make Admin"}
      </button>

      <button
        disabled={loading}
        onClick={() =>
          updateUser({
            isVip: !user.isVip,
            plan: user.isVip ? "Free" : "Monthly",
            expiresAt:
              user.isVip
                ? null
                : new Date(
                    Date.now() +
                      30 *
                        24 *
                        60 *
                        60 *
                        1000
                  ).toISOString(),
          })
        }
        className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-black text-black disabled:opacity-50"
      >
        {user.isVip ? "Remove VIP" : "Make VIP"}
      </button>

      <button
        disabled={loading}
        onClick={extendVip}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
      >
        Extend 30 Days
      </button>

      <button
        disabled={loading}
        onClick={deleteUser}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
      >
        Delete User
      </button>

    </div>
  );
}
