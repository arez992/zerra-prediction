"use client";

import Link from "next/link";

import {
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "@/lib/firebase";

const countries = [
  "Iraq",
  "Nigeria",
  "Kenya",
  "Ghana",
  "South Africa",
  "Uganda",
  "Tanzania",
  "India",
  "Indonesia",
  "Philippines",
  "Brazil",
  "United Kingdom",
  "United States",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Turkey",
  "Saudi Arabia",
  "United Arab Emirates",
  "Other",
];

export default function RegisterPage() {
  const [
    name,
    setName,
  ] =
    useState("");

  const [
    country,
    setCountry,
  ] =
    useState("");

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

  async function handleRegister() {
    if (
      !name.trim() ||
      !country ||
      !email.trim() ||
      !password
    ) {
      setMessage(
        "Please complete all fields."
      );

      return;
    }

    try {
      setLoading(
        true
      );

      setMessage("");

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      await updateProfile(
        userCredential.user,
        {
          displayName:
            name.trim(),
        }
      );

      await setDoc(
        doc(
          db,
          "users",
          userCredential.user.uid
        ),
        {
          uid:
            userCredential.user.uid,

          name:
            name.trim(),

          displayName:
            name.trim(),

          email:
            userCredential.user.email,

          country,

          role:
            "user",

          isVip:
            false,

          plan:
            "Free",

          expiresAt:
            null,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge:
            true,
        }
      );

      setMessage(
        "Account created successfully ✅"
      );

      window.location.href =
        "/en/dashboard";
    } catch (
      error: unknown
    ) {
      const errorMessage =
        error instanceof
          Error
          ? error.message
          : "Registration failed.";

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
              Join ZERRA
            </div>

            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight">
              Create your football intelligence account.
            </h1>

            <p className="mt-5 text-base leading-8 text-[#66756c]">
              Join ZERRA to access your prediction dashboard, follow real football matches,
              and upgrade to premium AI insights when you are ready.
            </p>

            <div className="mt-8 grid gap-3">
              <Feature text="Free account access" />
              <Feature text="Real football fixtures and predictions" />
              <Feature text="Optional VIP premium intelligence" />
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-6 shadow-[0_18px_60px_rgba(20,70,40,0.06)] md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf7ef] text-sm font-black text-[#139653]">
              Z
            </div>

            <h2 className="mt-5 text-3xl font-black">
              Create Account
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#758179]">
              Join ZERRA Prediction today.
            </p>
          </div>

          <div className="mt-8">
            <label className="text-xs font-black uppercase tracking-[0.12em] text-[#6f7d74]">
              Full Name
            </label>

            <input
              type="text"
              placeholder="Your full name"
              value={
                name
              }
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                setName(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-[#dce8df] bg-[#fbfdfb] px-4 py-3.5 text-sm text-[#102117] outline-none transition placeholder:text-[#a0aaa3] focus:border-[#139653] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="mt-5">
            <label className="text-xs font-black uppercase tracking-[0.12em] text-[#6f7d74]">
              Country
            </label>

            <select
              value={
                country
              }
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                setCountry(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-[#dce8df] bg-[#fbfdfb] px-4 py-3.5 text-sm text-[#102117] outline-none transition focus:border-[#139653] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                Select Country
              </option>

              {countries.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mt-5">
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
              placeholder="Create a password"
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
                  void handleRegister();
                }
              }}
              className="mt-2 w-full rounded-xl border border-[#dce8df] bg-[#fbfdfb] px-4 py-3.5 text-sm text-[#102117] outline-none transition placeholder:text-[#a0aaa3] focus:border-[#139653] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void handleRegister()
            }
            disabled={
              loading
            }
            className="mt-7 w-full rounded-xl bg-[#139653] px-5 py-4 text-sm font-black text-white transition hover:bg-[#0d7a40] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

          {message && (
            <div
              className={`mt-5 rounded-xl border p-4 text-center text-sm font-bold ${
                message.includes(
                  "successfully"
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
              Already have an account?
            </p>

            <Link
              href="/en/login"
              className="mt-2 inline-flex text-sm font-black text-[#139653] hover:text-[#0d7a40]"
            >
              Login →
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