"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/en/login");
        return;
      }

      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setProfile(userSnap.data());
      } else {
        setProfile({
          membership: "Free",
          vipStatus: "inactive",
        });
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

  const isVip = profile?.vip === true;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 text-white">
      <h1 className="text-5xl font-black">
        Welcome {user.displayName || "User"} 👋
      </h1>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-6">
          <p className="text-white/60">Email</p>
          <h2 className="mt-2 text-2xl font-bold">{user.email}</h2>
        </div>

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-6">
          <p className="text-white/60">Membership</p>
          <h2 className="mt-2 text-2xl font-bold">
            {isVip ? profile?.membership || "VIP" : "Free"}
          </h2>
        </div>

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-6">
          <p className="text-white/60">VIP Status</p>
          <h2 className={`mt-2 text-2xl font-bold ${isVip ? "text-green-400" : "text-red-400"}`}>
            {isVip ? "Active" : "Inactive"}
          </h2>
        </div>

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-6">
          <p className="text-white/60">VIP Expires</p>
          <h2 className="mt-2 text-2xl font-bold">
            {profile?.vipExpireAt || "Not active"}
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