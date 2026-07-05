"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin() {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login successful ✅");
      router.push("/en/dashboard");
    } catch (error: any) {
      setMessage(error.message);
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
          onChange={(e) => setEmail(e.target.value)}
          className="mt-8 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <button
          onClick={handleLogin}
          className="mt-8 w-full rounded-full bg-[#D4AF37] py-4 font-bold text-black"
        >
          Login
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-[#D4AF37]">
            {message}
          </p>
        )}

        <a href="/en/register" className="mt-6 block text-center font-bold text-[#D4AF37]">
          Create Account
        </a>
      </div>
    </main>
  );
}