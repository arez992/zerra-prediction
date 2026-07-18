"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  usePathname,
} from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  auth,
} from "@/lib/firebase";

import {
  useVip,
} from "@/components/providers/VipProvider";

type NavItem = {
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  {
    label: "Home",
    path: "",
  },
  {
    label: "Predictions",
    path: "/predictions",
  },
  {
    label: "Dashboard",
    path: "/dashboard",
  },
  {
    label: "VIP",
    path: "/vip",
  },
];

export default function Navbar() {
  const params = useParams<{
    locale: string;
  }>();

  const pathname =
    usePathname();

  const locale =
    params?.locale ||
    "en";

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    email,
    setEmail,
  ] = useState("");

  const {
    isAdmin,
    isVip,
  } = useVip();

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setEmail(
            user?.email ||
            ""
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function getPath(
    path: string
  ) {
    return `/${locale}${path}`;
  }

  function isActive(
    path: string
  ) {
    const href =
      getPath(path);

    if (path === "") {
      return (
        pathname ===
        `/${locale}`
      );
    }

    return pathname
      ?.startsWith(href);
  }

  async function handleLogout() {
    await signOut(auth);

    await fetch(
      "/api/auth/session",
      {
        method: "DELETE",
      }
    );

    setEmail("");
    setOpen(false);

    window.location.href =
      `/${locale}`;
  }

  const isLoggedIn =
    Boolean(email);

  return (
    <header className="sticky top-0 z-50 border-b border-[#dce8df] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-6 px-4 md:px-6">
        <Link
          href={getPath("")}
          className="flex shrink-0 items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#139653] font-black text-white shadow-sm">
            Z
          </div>

          <div>
            <p className="text-xl font-black tracking-tight text-[#102117]">
              ZERRA
            </p>

            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7d8b82]">
              AI Football
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map(
            (item) => {
              const href =
                getPath(
                  item.path
                );

              const active =
                isActive(
                  item.path
                );

              return (
                <Link
                  key={
                    item.label
                  }
                  href={href}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-[#eaf7ef] text-[#0d6f3d]"
                      : "text-[#5f6f65] hover:bg-[#f1f7f3] hover:text-[#102117]"
                  }`}
                >
                  {
                    item.label
                  }
                </Link>
              );
            }
          )}

          {isAdmin && (
            <Link
              href={getPath(
                "/admin"
              )}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                isActive(
                  "/admin"
                )
                  ? "bg-[#102117] text-white"
                  : "text-[#102117] hover:bg-[#f1f7f3]"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isVip && (
            <span className="rounded-full border border-[#bfe6cf] bg-[#eaf7ef] px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#0d6f3d]">
              VIP
            </span>
          )}

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="max-w-[170px] truncate text-sm font-bold text-[#66756c]">
                {email}
              </span>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="rounded-full px-4 py-2 text-sm font-bold text-[#66756c] transition hover:bg-[#f1f7f3] hover:text-[#102117]"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href={getPath(
                "/login"
              )}
              className="rounded-full px-4 py-2 text-sm font-bold text-[#506056] transition hover:bg-[#f1f7f3] hover:text-[#102117]"
            >
              Login
            </Link>
          )}

          <Link
            href={getPath(
              "/vip"
            )}
            className="rounded-full bg-[#139653] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#0d6f3d]"
          >
            Go VIP
          </Link>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpen(
              (
                value
              ) =>
                !value
            )
          }
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dce8df] bg-white text-[#102117] shadow-sm lg:hidden"
          aria-label="Toggle navigation"
        >
          <span className="text-xl font-black">
            {open
              ? "×"
              : "☰"}
          </span>
        </button>
      </div>

      {open && (
        <div className="border-t border-[#e4ece6] bg-white px-4 py-5 lg:hidden">
          <div className="mx-auto max-w-7xl">
            <nav className="grid gap-2">
              {navItems.map(
                (item) => {
                  const href =
                    getPath(
                      item.path
                    );

                  return (
                    <Link
                      key={
                        item.label
                      }
                      href={href}
                      className={`rounded-2xl px-4 py-3 font-bold transition ${
                        isActive(
                          item.path
                        )
                          ? "bg-[#eaf7ef] text-[#0d6f3d]"
                          : "bg-[#f7faf8] text-[#506056]"
                      }`}
                    >
                      {
                        item.label
                      }
                    </Link>
                  );
                }
              )}

              {isAdmin && (
                <Link
                  href={getPath(
                    "/admin"
                  )}
                  className="rounded-2xl bg-[#102117] px-4 py-3 font-black text-white"
                >
                  Admin
                </Link>
              )}
            </nav>

            <div className="mt-4 grid gap-2 border-t border-[#e4ece6] pt-4">
              {isLoggedIn ? (
                <>
                  <div className="rounded-2xl bg-[#f7faf8] px-4 py-3">
                    <p className="truncate text-sm font-bold text-[#66756c]">
                      {email}
                    </p>

                    {isVip && (
                      <p className="mt-1 text-xs font-black uppercase text-[#139653]">
                        VIP Member
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="rounded-2xl bg-[#f7faf8] px-4 py-3 text-left font-bold text-[#506056]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href={getPath(
                    "/login"
                  )}
                  className="rounded-2xl bg-[#f7faf8] px-4 py-3 font-bold text-[#506056]"
                >
                  Login
                </Link>
              )}

              <Link
                href={getPath(
                  "/vip"
                )}
                className="rounded-2xl bg-[#139653] px-4 py-3 text-center font-black text-white"
              >
                Go VIP
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}