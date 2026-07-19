"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function Footer() {
  const params = useParams<{
    locale: string;
  }>();

  const locale =
    params?.locale ||
    "en";

  function getPath(
    path: string
  ) {
    return `/${locale}${path}`;
  }

  return (
    <footer className="mt-20 border-t border-[#dce8df] bg-white text-[#102117]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <Link
            href={getPath("")}
            className="inline-flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#139653] font-black text-white shadow-sm">
              Z
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight">
                ZERRA
              </h2>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7d8b82]">
                AI Football Prediction
              </p>
            </div>
          </Link>

          <p className="mt-5 max-w-sm text-sm leading-7 text-[#66756c]">
            AI-powered football predictions,
            match analysis, confidence
            signals, risk assessment,
            public insights, and premium
            VIP intelligence.
          </p>

          <Link
            href={getPath(
              "/vip"
            )}
            className="mt-6 inline-flex rounded-xl bg-[#139653] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0d6f3d]"
          >
            Explore VIP Access
          </Link>
        </div>

        <FooterColumn
          title="Platform"
          links={[
            {
              label:
                "Dashboard",
              href:
                getPath(
                  "/dashboard"
                ),
            },
            {
              label:
                "Predictions",
              href:
                getPath(
                  "/predictions"
                ),
            },
            {
              label:
                "VIP Access",
              href:
                getPath(
                  "/vip"
                ),
            },
          ]}
        />

        <FooterColumn
          title="Account"
          links={[
            {
              label:
                "Login",
              href:
                getPath(
                  "/login"
                ),
            },
            {
              label:
                "Register",
              href:
                getPath(
                  "/register"
                ),
            },
          ]}
        />

        <FooterColumn
          title="Legal"
          links={[
            {
              label:
                "Terms",
              href:
                getPath(
                  "/terms"
                ),
            },
            {
              label:
                "Privacy",
              href:
                getPath(
                  "/privacy"
                ),
            },
            {
              label:
                "Disclaimer",
              href:
                getPath(
                  "/disclaimer"
                ),
            },
          ]}
        />
      </div>

      <div className="border-t border-[#e4ece6] bg-[#fbfdfb] px-5 py-5 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-center text-xs font-medium text-[#879389] md:flex-row md:items-center md:justify-between md:text-left">
          <p>
            © {new Date().getFullYear()} ZERRA Prediction. All rights reserved.
          </p>

          <p>
            Football analysis for informational purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#102117]">
        {title}
      </p>

      <div className="mt-4 grid gap-3">
        {links.map(
          (
            link
          ) => (
            <Link
              key={
                link.href
              }
              href={
                link.href
              }
              className="w-fit text-sm font-bold text-[#66756c] transition hover:text-[#139653]"
            >
              {
                link.label
              }
            </Link>
          )
        )}
      </div>
    </div>
  );
}