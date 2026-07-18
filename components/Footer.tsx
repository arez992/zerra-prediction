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
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#139653] font-black text-white">
              Z
            </div>

            <div>
              <h2 className="text-xl font-black">
                ZERRA
              </h2>

              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7d8b82]">
                AI Football Prediction
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-sm text-sm leading-7 text-[#66756c]">
            AI-powered football predictions,
            match analysis, confidence
            signals, risk assessment,
            public insights, and premium
            VIP intelligence.
          </p>
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#102117]">
            Platform
          </p>

          <div className="mt-4 grid gap-3 text-sm font-bold text-[#66756c]">
            <Link
              href={getPath(
                "/dashboard"
              )}
              className="transition hover:text-[#139653]"
            >
              Dashboard
            </Link>

            <Link
              href={getPath(
                "/predictions"
              )}
              className="transition hover:text-[#139653]"
            >
              Predictions
            </Link>

            <Link
              href={getPath(
                "/vip"
              )}
              className="transition hover:text-[#139653]"
            >
              VIP Access
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#102117]">
            Account
          </p>

          <div className="mt-4 grid gap-3 text-sm font-bold text-[#66756c]">
            <Link
              href={getPath(
                "/login"
              )}
              className="transition hover:text-[#139653]"
            >
              Login
            </Link>

            <Link
              href={getPath(
                "/register"
              )}
              className="transition hover:text-[#139653]"
            >
              Register
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#102117]">
            Legal
          </p>

          <div className="mt-4 grid gap-3 text-sm font-bold text-[#66756c]">
            <Link
              href={getPath(
                "/terms"
              )}
              className="transition hover:text-[#139653]"
            >
              Terms
            </Link>

            <Link
              href={getPath(
                "/privacy"
              )}
              className="transition hover:text-[#139653]"
            >
              Privacy
            </Link>

            <Link
              href={getPath(
                "/disclaimer"
              )}
              className="transition hover:text-[#139653]"
            >
              Disclaimer
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[#e4ece6] px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-center text-sm text-[#879389] md:flex-row md:items-center md:justify-between md:text-left">
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