"use client";

import Link from "next/link";

import {
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  auth,
} from "@/lib/firebase";

export default function LoginPage() {
  const searchParams =
    useSearchParams();

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  async function handleLogin() {
    if (
      loading
    ) {
      return;
    }

    setLoading(
      true
    );

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
        await fetch(
          "/api/auth/session",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  idToken,
                }
              ),
          }
        );

      let sessionData:
        any =
        null;

      try {
        sessionData =
          await sessionResponse.json();
      } catch {
        sessionData =
          null;
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
        callbackUrl.startsWith(
          "/"
        ) &&
        !callbackUrl.startsWith(
          "//"
        )
          ? callbackUrl
          : "/en/dashboard";

      window.location.href =
        safeRedirect;
    } catch (
      error: unknown
    ) {
      const errorMessage =
        error instanceof
          Error
          ? error.message
          : "Unable to login.";

      setMessage(
        errorMessage
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-12 text-[#102117] md:px-6">
      <div className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="inline-flex rounded-full bg-[#eaf7ef] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
              ZERRA Account
            </div>

            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight">
              Welcome back to your football intelligence dashboard.
            </h1>

            <p className="mt-5 text-base leading-8 text-[#66756c]">
              Sign in to access your ZERRA dashboard, saved account
              status, VIP access, and premium football analysis.
            </p>

            <div className="mt-8 grid gap-3">
              <Feature text="Secure Firebase authentication" />
              <Feature text="VIP membership recognition" />
              <Feature text="Direct access to your prediction dashboard" />
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6 shadow-[0_18px_60px_rgba(20,70,40,0.06)] md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf7ef] text-sm font-black text-[#139653]">
              Z
            </div>

            <h2 className="mt-5 text-3xl font-black">
              Welcome Back
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#758179]">
              Login to your ZERRA Prediction account.
            </p>
          </div>

          <div className="mt-8">
            <label className="text-xs font-black uppercase tracking-[0.12em] text-[#6f7d74]">
              Email Address
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={
                email
              }
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-[#dce8df] bg-[#fbfdfb] px-4 py-3.5 text-sm text-[#102117] outline-none transition placeholder:text-[#a0aaa3] focus:border-[#139653] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="mt-5">
            <label className="text-xs font-black uppercase tracking-[0.12em] text-[#6f7d74]">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={
                password
              }
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  void handleLogin();
                }
              }}
              className="mt-2 w-full rounded-xl border border-[#dce8df] bg-[#fbfdfb] px-4 py-3.5 text-sm text-[#102117] outline-none transition placeholder:text-[#a0aaa3] focus:border-[#139653] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void handleLogin()
            }
            disabled={
              loading
            }
            className="mt-7 w-full rounded-xl bg-[#139653] px-5 py-4 text-sm font-black text-white transition hover:bg-[#0d7a40] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

          {message && (
            <div
              className={`mt-5 rounded-xl border p-4 text-center text-sm font-bold ${
                message.includes(
                  "successful"
                )
                  ? "border-[#cfe6d7] bg-[#eaf7ef] text-[#0d7a40]"
                  : "border-[#f0d9d9] bg-[#fff8f8] text-[#b14c4c]"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-7 border-t border-[#e7eee9] pt-6 text-center">
            <p className="text-sm text-[#758179]">
              Don&apos;t have an account?
            </p>

            <Link
              href="/en/register"
              className="mt-2 inline-flex text-sm font-black text-[#139653] hover:text-[#0d7a40]"
            >
              Create Account →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf7ef] text-xs font-black text-[#139653]">
        ✓
      </span>

      <p className="text-sm font-bold text-[#536158]">
        {text}
      </p>
    </div>
  );
}