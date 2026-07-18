"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const idToken =
        await credential.user.getIdToken();

      const sessionResponse =
        await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            idToken,
          }),
        });

      let sessionData: any = null;

      try {
        sessionData =
          await sessionResponse.json();
      } catch {
        sessionData = null;
      }

      if (
        !sessionResponse.ok ||
        !sessionData?.success
      ) {
        throw new Error(
          sessionData?.error ||
            "Unable to create secure session."
        );
      }

      setMessage(
        "Login successful ✅"
      );

      const callbackUrl =
        searchParams.get(
          "callbackUrl"
        );

      const safeRedirect =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/en/dashboard";

      window.location.href =
        safeRedirect;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to login.";

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-7xl items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-8">
        <h1 className="text-center text-4xl font-black text-white">
          Welcome Back
        </h1>

        <p className="mt-3 text-center text-white/60">
          Login to your ZERRA Prediction account
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          disabled={loading}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          className="mt-8 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white disabled:cursor-not-allowed disabled:opacity-60"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          disabled={loading}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              void handleLogin();
            }
          }}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() =>
            void handleLogin()
          }
          disabled={loading}
          className="mt-8 w-full rounded-full bg-[#D4AF37] py-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-[#D4AF37]">
            {message}
          </p>
        )}

        <a
          href="/en/register"
          className="mt-6 block text-center font-bold text-[#D4AF37]"
        >
          Create Account
        </a>
      </div>
    </main>
  );
}