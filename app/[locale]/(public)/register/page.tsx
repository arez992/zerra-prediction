"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !country || !email.trim() || !password) {
      setMessage("Please complete all fields.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });

      await setDoc(
        doc(db, "users", userCredential.user.uid),
        {
          uid: userCredential.user.uid,
          name: name.trim(),
          displayName: name.trim(),
          email: userCredential.user.email,
          country,
          role: "user",
          isVip: false,
          plan: "Free",
          expiresAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Account created successfully ✅");
      window.location.href = "/en/dashboard";
    } catch (error: any) {
      setMessage(error.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-7xl items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-8">
        <h1 className="text-center text-4xl font-black text-white">
          Create Account
        </h1>

        <p className="mt-3 text-center text-white/60">
          Join ZERRA Prediction today
        </p>

        <input
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-8 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white outline-none focus:border-[#D4AF37]"
        />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-[#0B1220] p-4 text-white outline-none focus:border-[#D4AF37]"
        >
          <option value="">Select Country</option>

          {countries.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white outline-none focus:border-[#D4AF37]"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white outline-none focus:border-[#D4AF37]"
        />

        <button
          onClick={handleRegister}
          disabled={loading}
          className="mt-8 w-full rounded-full bg-[#D4AF37] py-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-[#D4AF37]">
            {message}
          </p>
        )}

        <a
          href="/en/login"
          className="mt-6 block text-center font-bold text-[#D4AF37]"
        >
          Login
        </a>
      </div>
    </main>
  );
}