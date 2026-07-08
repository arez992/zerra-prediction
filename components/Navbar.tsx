"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useVip } from "@/components/providers/VipProvider";

const navLinks = [
  { label: "Home", href: "/en" },
  { label: "Dashboard", href: "/en/dashboard" },
  { label: "Predictions", href: "/en/predictions" },
  { label: "VIP", href: "/en/vip" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { isVip } = useVip();

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await res.json();

        if (data?.user) {
          setEmail(data.user.email || "");
          setIsAdmin(data.user.isAdmin === true);
        } else {
          setEmail("");
          setIsAdmin(false);
        }
      } catch {
        setEmail("");
        setIsAdmin(false);
      }
    }

    loadUser();
  }, []);

  async function handleLogout() {
    await signOut(auth);

    await fetch("/api/auth/session", {
      method: "DELETE",
    });

    setEmail("");
    setIsAdmin(false);
    setOpen(false);
    window.location.href = "/en";
  }

  const isLoggedIn = Boolean(email);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-white md:px-6">
        <Link href="/en" className="flex flex-col" onClick={() => setOpen(false)}>
          <span className="text-xl font-black tracking-wider text-[#D4AF37]">
            ZERRA
          </span>
          <span className="text-xs text-white/50">AI Football Prediction</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-white/70 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-[#D4AF37]"
            >
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/en/admin"
              className="text-[#D4AF37] transition hover:text-white"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <>
              <span className="max-w-[180px] truncate text-sm font-bold text-white/60">
                {email}
              </span>

              {isVip && (
                <span className="rounded-full bg-[#D4AF37]/10 px-3 py-1 text-xs font-black text-[#D4AF37]">
                  VIP
                </span>
              )}

              <button
                onClick={handleLogout}
                className="text-sm font-bold text-white/60 transition hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/en/login"
              className="text-sm font-bold text-white/60 transition hover:text-white"
            >
              Login
            </Link>
          )}

          <Link
            href="/en/vip"
            className="rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-black text-black transition hover:scale-105"
          >
            Go VIP
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white md:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#050816] px-4 py-4 md:hidden">
          <nav className="mx-auto grid max-w-7xl gap-3">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-white/5 px-4 py-3 font-bold text-white/80"
              >
                {item.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                href="/en/admin"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-[#D4AF37]/10 px-4 py-3 font-black text-[#D4AF37]"
              >
                Admin
              </Link>
            )}

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="rounded-2xl bg-white/5 px-4 py-3 text-left font-bold text-white/80"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/en/login"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-white/5 px-4 py-3 font-bold text-white/80"
              >
                Login
              </Link>
            )}

            <Link
              href="/en/vip"
              onClick={() => setOpen(false)}
              className="rounded-2xl bg-[#D4AF37] px-4 py-3 text-center font-black text-black"
            >
              Go VIP
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}