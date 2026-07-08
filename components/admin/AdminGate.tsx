"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const ADMIN_EMAILS = [
  "arez.abubakr92@gmail.com",
];

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const email = user?.email || "";
      setAllowed(ADMIN_EMAILS.includes(email));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-12 text-white">
        Checking admin access...
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-14 text-center text-white">
        <h1 className="text-4xl font-black">Admin Access Required</h1>
        <p className="mt-4 text-white/60">
          You do not have permission to view this page.
        </p>

        <Link
          href="/en/login"
          className="mt-8 inline-block rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black"
        >
          Login as Admin
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}