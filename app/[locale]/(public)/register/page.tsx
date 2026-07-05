"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister() {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      setMessage("Account created successfully ✅");
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-7xl items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-8">
        <h1 className="text-center text-4xl font-black text-white">Create Account</h1>

        <p className="mt-3 text-center text-white/60">Join ZERRA Prediction today</p>

        <input
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-8 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <button
          onClick={handleRegister}
          className="mt-8 w-full rounded-full bg-[#D4AF37] py-4 font-bold text-black"
        >
          Create Account
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-[#D4AF37]">
            {message}
          </p>
        )}

        <a href="/en/login" className="mt-6 block text-center font-bold text-[#D4AF37]">
          Login
        </a>
      </div>
    </main>
  );
}