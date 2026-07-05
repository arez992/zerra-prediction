"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/en/login");
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function logout() {
    await signOut(auth);
    router.push("/en/login");
  }

  if (!user) {
    return (
      <main className="flex h-screen items-center justify-center text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 text-white">
      <h1 className="text-5xl font-black">
        Welcome {user.displayName || "User"} 👋
      </h1>

      <div className="mt-10 grid gap-6 md:grid-cols-2">

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-6">
          <p className="text-white/60">Email</p>
          <h2 className="mt-2 text-2xl font-bold">
            {user.email}
          </h2>
        </div>

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-6">
          <p className="text-white/60">Membership</p>
          <h2 className="mt-2 text-2xl font-bold">
            Free
          </h2>
        </div>

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-6">
          <p className="text-white/60">VIP Status</p>
          <h2 className="mt-2 text-2xl font-bold text-red-400">
            Inactive
          </h2>
        </div>

      </div>

      <button
        onClick={logout}
        className="mt-10 rounded-full bg-[#D4AF37] px-8 py-3 font-bold text-black"
      >
        Logout
      </button>
    </main>
  );
}