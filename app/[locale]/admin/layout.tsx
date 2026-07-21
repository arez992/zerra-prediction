import type { Metadata } from "next";
import Link from "next/link";

import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

export const metadata: Metadata = {
  title: "ZERRA Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,

    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

type AdminLayoutProps = {
  children:
    React.ReactNode;

  params:
    Promise<{
      locale: string;
    }>;
};

type NavigationItem = {
  label:
    string;

  href:
    string;

  description:
    string;
};

type NavigationGroup = {
  title:
    string;

  items:
    NavigationItem[];
};

function normalizeLocale(
  value:
    string
): "en" | "ku" {
  return value === "ku"
    ? "ku"
    : "en";
}

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const {
    locale: rawLocale,
  } = await params;

  const locale =
    normalizeLocale(
      rawLocale
    );

  let admin:
    Awaited<
      ReturnType<
        typeof requireServerAdmin
      >
    >;

  try {
    admin =
      await requireServerAdmin();
  } catch {
    return (
      <main className="min-h-screen bg-[#07101D] px-5 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-[#101827] p-8 text-center shadow-2xl md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D4AF37] text-2xl font-black text-black">
            Z
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            ZERRA ADMIN
          </p>

          <h1 className="mt-4 text-3xl font-black md:text-4xl">
            Admin Access Required
          </h1>

          <p className="mt-4 leading-7 text-white/55">
            You need an authenticated ZERRA
            administrator account to access the
            company control center.
          </p>

          <Link
            href={`/${locale}/login?callbackUrl=/${locale}/admin`}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-7 py-3.5 font-black text-black transition hover:brightness-110"
          >
            Login as Admin
          </Link>
        </div>
      </main>
    );
  }

  const base =
    `/${locale}/admin`;

  const navigationGroups:
    NavigationGroup[] = [
      {
        title:
          "Command Center",

        items: [
          {
            label:
              "Overview",

            href:
              base,

            description:
              "Company operations",
          },

          {
            label:
              "AI CEO",

            href:
              `${base}/ai-ceo`,

            description:
              "Autonomous intelligence",
          },
        ],
      },

      {
        title:
          "AI & Predictions",

        items: [
          {
            label:
              "Predictions",

            href:
              `${base}/predictions`,

            description:
              "Prediction operations",
          },

          {
            label:
              "Analytics",

            href:
              `${base}/analytics`,

            description:
              "Performance metrics",
          },

          {
            label:
              "Market Intelligence",

            href:
              `${base}/market-intelligence`,

            description:
              "Football intelligence",
          },
        ],
      },

      {
        title:
          "Growth",

        items: [
          {
            label:
              "SEO Command",

            href:
              `${base}/ai-ceo/seo-dashboard`,

            description:
              "SEO automation",
          },

          {
            label:
              "Revenue",

            href:
              `${base}/revenue`,

            description:
              "Business performance",
          },

          {
            label:
              "Payments",

            href:
              `${base}/payments`,

            description:
              "Payment operations",
          },
        ],
      },

      {
        title:
          "Operations",

        items: [
          {
            label:
              "Users",

            href:
              `${base}/users`,

            description:
              "User management",
          },

          {
            label:
              "Activity",

            href:
              `${base}/activity`,

            description:
              "Audit activity",
          },

          {
            label:
              "System Health",

            href:
              `${base}/health`,

            description:
              "Production health",
          },

          {
            label:
              "Cache",

            href:
              `${base}/cache`,

            description:
              "Cache controls",
          },

          {
            label:
              "Security",

            href:
              `${base}/security`,

            description:
              "Security controls",
          },

          {
            label:
              "Settings",

            href:
              `${base}/settings`,

            description:
              "Platform settings",
          },
        ],
      },
    ];

  return (
    <div className="min-h-screen bg-[#07101D] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[#0B1422] xl:flex xl:flex-col">
          <div className="border-b border-white/10 p-6">
            <Link
              href={base}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37] font-black text-black">
                Z
              </div>

              <div>
                <p className="text-lg font-black leading-none">
                  ZERRA
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Company OS
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-7">
              {navigationGroups.map(
                (
                  group
                ) => (
                  <section
                    key={
                      group.title
                    }
                  >
                    <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                      {
                        group.title
                      }
                    </p>

                    <div className="mt-2 space-y-1">
                      {group.items.map(
                        (
                          item
                        ) => {
                          const isAICEO =
                            item.label ===
                            "AI CEO";

                          return (
                            <Link
                              key={
                                item.href
                              }
                              href={
                                item.href
                              }
                              className={`block rounded-2xl border px-4 py-3 transition ${
                                isAICEO
                                  ? "border-[#D4AF37]/25 bg-[#D4AF37]/10 hover:border-[#D4AF37]/50"
                                  : "border-transparent hover:border-white/10 hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span
                                  className={`text-sm font-black ${
                                    isAICEO
                                      ? "text-[#D4AF37]"
                                      : "text-white/80"
                                  }`}
                                >
                                  {
                                    item.label
                                  }
                                </span>

                                {isAICEO && (
                                  <span className="rounded-full bg-[#D4AF37] px-2 py-0.5 text-[9px] font-black uppercase text-black">
                                    Core
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-white/30">
                                {
                                  item.description
                                }
                              </p>
                            </Link>
                          );
                        }
                      )}
                    </div>
                  </section>
                )
              )}
            </div>
          </nav>

          <div className="border-t border-white/10 p-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-black text-white/70">
                Administrator
              </p>

              <p className="mt-1 truncate text-xs text-white/35">
                {admin.email ||
                  admin.uid ||
                  "ZERRA Admin"}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07101D]/95 backdrop-blur-xl">
            <div className="flex min-h-[72px] items-center justify-between gap-5 px-5 md:px-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D4AF37]">
                  ZERRA COMPANY OS
                </p>

                <p className="mt-1 text-sm font-bold text-white/50">
                  Admin Control Center
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/${locale}`}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/50 transition hover:border-white/20 hover:text-white"
                >
                  View Site
                </Link>

                <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300 sm:block">
                  ● System Online
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-white/5 px-5 py-3 xl:hidden">
              {navigationGroups
                .flatMap(
                  (
                    group
                  ) =>
                    group.items
                )
                .map(
                  (
                    item
                  ) => (
                    <Link
                      key={
                        item.href
                      }
                      href={
                        item.href
                      }
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${
                        item.label ===
                        "AI CEO"
                          ? "bg-[#D4AF37] text-black"
                          : "border border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      {
                        item.label
                      }
                    </Link>
                  )
                )}
            </div>
          </header>

          <main className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}