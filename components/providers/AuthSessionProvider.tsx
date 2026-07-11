"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          await fetch("/api/auth/session", {
            method: "DELETE",
          });

          return;
        }

        const idToken = await user.getIdToken(true);

        await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken,
          }),
        });
      } catch (error) {
        console.error("Auth session sync failed:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}