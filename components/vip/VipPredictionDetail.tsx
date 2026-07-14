"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useVip } from "@/components/providers/VipProvider";

type Locale = "en" | "ku";

type VipPrediction = {
  id: string;
  fixtureId: string;
  sport: "Football";
  competition: {
    name: string;
    country: string | null;
    round: string | null;
    season: number | null;
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  fixtureDate: string | null;
  fixtureStatus: {
    short: string | null;
    long: string | null;
  };
  vipPrediction: {
    finalPrediction: string;
    confidence: number | null;
    exactScore: string;
    valueBet: string;
    markets: {
      homeWin: number | null;
      draw: number | null;
      awayWin: number | null;
      over25: number | null;
      under25: number | null;
      btts: number | null;
    };
    expectedGoals: {
      home: number | null;
      away: number | null;
      total: number | null;
    };
    reasoning: string[];
  };
  publishedAt: string | null;
  updatedAt: string | null;
};

type VipApiResponse = {
  success: boolean;
  access?: {
    role?: string;
    plan?: string;
    expiresAt?: string | null;
  };
  prediction?: VipPrediction;
  error?: string;
};

type VipPredictionDetailProps = {
  locale: Locale;
  predictionId: string;
};

function t(
  locale: Locale,
  english: string,
  kurdish: string
) {
  return locale === "ku" ? kurdish : english;
}

function formatDateTime(
  value: string | null,
  locale: Locale
) {
  if (!value) {
    return t(locale, "Kickoff TBD", "کاتی یاری دیاری نەکراوە");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return t(locale, "Kickoff TBD", "کاتی یاری دیاری نەکراوە");
  }

  return new Intl.DateTimeFormat(
    locale === "ku" ? "ckb-IQ" : "en",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function formatNumber(value: number | null) {
  return value === null ? "—" : String(value);
}

export default function VipPredictionDetail({
  locale,
  predictionId,
}: VipPredictionDetailProps) {
  const { loading: vipStateLoading } = useVip();

  const [prediction, setPrediction] =
    useState<VipPrediction | null>(null);
  const [access, setAccess] =
    useState<VipApiResponse["access"]>();
  const [loading, setLoading] = useState(true);
  const [statusCode, setStatusCode] =
    useState<number | null>(null);
  const [error, setError] = useState("");

  const loadPrediction = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setStatusCode(null);

      const response = await fetch(
        `/api/vip/predictions/${encodeURIComponent(predictionId)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const raw = await response.text();

      let data: VipApiResponse;

      try {
        data = raw
          ? (JSON.parse(raw) as VipApiResponse)
          : {
              success: false,
              error: "The server returned an empty response.",
            };
      } catch {
        throw new Error(
          `Invalid server response: ${raw.slice(0, 200)}`
        );
      }

      setStatusCode(response.status);

      if (!response.ok || !data.success || !data.prediction) {
        setPrediction(null);
        setAccess(undefined);
        setError(
          data.error || "Unable to load VIP prediction."
        );
        return;
      }

      setPrediction(data.prediction);
      setAccess(data.access);
    } catch (requestError) {
      setPrediction(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load VIP prediction."
      );
    } finally {
      setLoading(false);
    }
  }, [predictionId]);

  useEffect(() => {
    void loadPrediction();
  }, [loadPrediction]);

  const matchTitle = useMemo(() => {
    if (!prediction) return "";
    return `${prediction.teams.home.name} vs ${prediction.teams.away.name}`;
  }, [prediction]);

  if (loading || vipStateLoading) {
    return (
      <StateShell
        locale={locale}
        title={t(
          locale,
          "Loading VIP prediction",
          "بارکردنی پێشبینی VIP"
        )}
        text={t(
          locale,
          "Verifying your access and loading protected match intelligence.",
          "دەستپێگەیشتنت دەپشکنرێت و شیکاری پارێزراوی یاری بار دەکرێت."
        )}
      />
    );
  }

  if (!prediction) {
    if (statusCode === 401) {
      return (
        <StateShell
          locale={locale}
          icon="🔐"
          title={t(locale, "Login required", "چوونەژوورەوە پێویستە")}
          text={t(
            locale,
            "Sign in to verify your VIP or administrator access.",
            "بچۆ ژوورەوە بۆ پشتڕاستکردنەوەی دەستپێگەیشتنی VIP یان ئەدمین."
          )}
          primaryHref={`/${locale}/login`}
          primaryLabel={t(locale, "Login", "چوونەژوورەوە")}
        />
      );
    }

    if (statusCode === 403) {
      return (
        <StateShell
          locale={locale}
          icon="🔒"
          title={t(
            locale,
            "Active VIP access required",
            "ئەندامێتی چالاکی VIP پێویستە"
          )}
          text={t(
            locale,
            "Upgrade your account to unlock the final prediction, confidence, exact score, value signal, and full reasoning.",
            "هەژمارەکەت بەرزبکەرەوە بۆ کردنەوەی پێشبینی کۆتایی، متمانە، ئەنجامی ورد، هەڵبژاردەی بەهادار و شیکاری تەواو."
          )}
          primaryHref={`/${locale}/vip`}
          primaryLabel={t(locale, "View VIP Plans", "پلانی VIP ببینە")}
        />
      );
    }

    if (statusCode === 404) {
      return (
        <StateShell
          locale={locale}
          icon="⚽"
          title={t(
            locale,
            "VIP prediction unavailable",
            "پێشبینی VIP بەردەست نییە"
          )}
          text={t(
            locale,
            "This prediction does not exist or has not been published yet.",
            "ئەم پێشبینییە بوونی نییە یان هێشتا بڵاونەکراوەتەوە."
          )}
          primaryHref={`/${locale}/predictions`}
          primaryLabel={t(
            locale,
            "All Predictions",
            "هەموو پێشبینییەکان"
          )}
        />
      );
    }

    return (
      <StateShell
        locale={locale}
        icon="⚠️"
        title={t(
          locale,
          "Unable to load prediction",
          "نەتوانرا پێشبینییەکە بار بکرێت"
        )}
        text={
          error ||
          t(
            locale,
            "An unexpected error occurred.",
            "هەڵەیەکی چاوەڕواننەکراو ڕوویدا."
          )
        }
        onRetry={() => void loadPrediction()}
      />
    );
  }

  const vip = prediction.vipPrediction;

  return (
    <main
      className="min-h-screen bg-[#07101D] px-4 py-10 text-white md:px-8"
      dir={locale === "ku" ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-white/40">
          <Link
            href={`/${locale}/predictions`}
            className="transition hover:text-[#D4AF37]"
          >
            {t(locale, "Predictions", "پێشبینییەکان")}
          </Link>
          <span>/</span>
          <span className="text-white/65">VIP</span>
          <span>/</span>
          <span className="text-white/65">{matchTitle}</span>
        </nav>

        <header className="mt-8 overflow-hidden rounded-[2.25rem] border border-[#D4AF37]/30 bg-gradient-to-br from-[#171F2D] via-[#101827] to-[#09111E] shadow-2xl">
          <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
            <div className="p-7 md:p-10">
              <div className="flex flex-wrap gap-2">
                <Badge>ZERRA VIP</Badge>
                <Badge>{prediction.competition.name}</Badge>
                <span className="rounded-full border border-green-400/25 bg-green-400/10 px-3 py-1 text-xs font-black uppercase text-green-200">
                  {t(locale, "Access verified", "دەستپێگەیشتن پشتڕاستکرایەوە")}
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                {matchTitle}
              </h1>

              <p className="mt-4 text-sm font-bold text-white/45">
                {formatDateTime(prediction.fixtureDate, locale)}
                {" · "}
                {prediction.fixtureStatus.long ||
                  t(locale, "Scheduled", "دیاریکراو")}
              </p>

              <div className="mt-8 rounded-[2rem] border border-[#D4AF37]/25 bg-[#D4AF37]/10 p-6">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                  {t(locale, "Final Prediction", "پێشبینی کۆتایی")}
                </p>
                <p className="mt-4 text-3xl font-black md:text-5xl">
                  {vip.finalPrediction || "—"}
                </p>
              </div>
            </div>

            <aside className="border-t border-white/10 bg-black/20 p-7 xl:border-l xl:border-t-0 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                {t(locale, "VIP Access", "دەستپێگەیشتنی VIP")}
              </p>

              <dl className="mt-6 grid gap-3">
                <AccessRow
                  label={t(locale, "Role", "ڕۆڵ")}
                  value={access?.role || "VIP"}
                />
                <AccessRow
                  label={t(locale, "Plan", "پلان")}
                  value={access?.plan || "VIP"}
                />
                <AccessRow
                  label={t(locale, "Expires", "بەسەرچوون")}
                  value={
                    access?.expiresAt
                      ? formatDateTime(access.expiresAt, locale)
                      : t(
                          locale,
                          "Administrator access",
                          "دەستپێگەیشتنی ئەدمین"
                        )
                  }
                />
              </dl>
            </aside>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t(locale, "Confidence", "متمانە")}
            value={formatPercent(vip.confidence)}
          />
          <MetricCard
            label={t(locale, "Exact Score", "ئەنجامی ورد")}
            value={vip.exactScore || "—"}
          />
          <MetricCard
            label={t(locale, "Value Signal", "هەڵبژاردەی بەهادار")}
            value={vip.valueBet || "—"}
          />
          <MetricCard
            label={t(locale, "Expected Goals", "گۆڵی چاوەڕوانکراو")}
            value={formatNumber(vip.expectedGoals.total)}
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <Panel
            eyebrow={t(locale, "1X2 Markets", "بازاڕی 1X2")}
            title={t(locale, "Outcome Probabilities", "ڕێژەی ئەنجامەکان")}
          >
            <ProbabilityRow
              label={t(locale, "Home Win", "بردنەوەی ماڵەوە")}
              value={vip.markets.homeWin}
            />
            <ProbabilityRow
              label={t(locale, "Draw", "یەکسان")}
              value={vip.markets.draw}
            />
            <ProbabilityRow
              label={t(locale, "Away Win", "بردنەوەی دەرەوە")}
              value={vip.markets.awayWin}
            />
          </Panel>

          <Panel
            eyebrow={t(locale, "Goal Markets", "بازاڕی گۆڵ")}
            title={t(locale, "Goal Probabilities", "ڕێژەی گۆڵەکان")}
          >
            <ProbabilityRow label="Over 2.5" value={vip.markets.over25} />
            <ProbabilityRow label="Under 2.5" value={vip.markets.under25} />
            <ProbabilityRow label="BTTS" value={vip.markets.btts} />
          </Panel>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            {t(locale, "Expected Goals", "گۆڵی چاوەڕوانکراو")}
          </p>
          <h2 className="mt-4 text-3xl font-black">
            {t(locale, "Team Goal Projection", "پێشبینی گۆڵی تیمەکان")}
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <MetricCard
              label={prediction.teams.home.name}
              value={formatNumber(vip.expectedGoals.home)}
            />
            <MetricCard
              label={prediction.teams.away.name}
              value={formatNumber(vip.expectedGoals.away)}
            />
            <MetricCard
              label={t(locale, "Total", "کۆی گشتی")}
              value={formatNumber(vip.expectedGoals.total)}
            />
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/20 bg-[#101827] p-7 shadow-xl md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            {t(locale, "AI Reasoning", "شیکاری AI")}
          </p>
          <h2 className="mt-4 text-3xl font-black">
            {t(
              locale,
              "Why ZERRA Selected This Prediction",
              "بۆچی ZERRA ئەم پێشبینییەی هەڵبژارد"
            )}
          </h2>

          {vip.reasoning.length > 0 ? (
            <div className="mt-7 grid gap-3">
              {vip.reasoning.map((reason, index) => (
                <div
                  key={`${reason}-${index}`}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <span className="font-black text-[#D4AF37]">
                    {index + 1}.
                  </span>
                  <p className="leading-7 text-white/65">{reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm leading-7 text-white/45">
              {t(
                locale,
                "No detailed reasoning is available for this prediction.",
                "هیچ شیکارییەکی ورد بۆ ئەم پێشبینییە بەردەست نییە."
              )}
            </p>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-yellow-500/15 bg-yellow-500/5 p-6 text-sm leading-7 text-yellow-100/70">
          {t(
            locale,
            "No football prediction is guaranteed. ZERRA VIP provides deeper analysis and calibrated signals, not certainty.",
            "هیچ پێشبینییەکی تۆپی پێ گەرەنتی نییە. ZERRA VIP شیکاری و نیشانەی زیاتر دەدات، نەک دڵنیایی."
          )}
        </section>
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-black uppercase text-[#D4AF37]">
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#101827] p-5 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101827] p-7 shadow-xl md:p-9">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-2xl font-black">{title}</h2>
      <div className="mt-6 grid gap-4">{children}</div>
    </section>
  );
}

function ProbabilityRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const safeValue =
    value === null ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-bold text-white/65">{label}</span>
        <span className="font-black text-[#D4AF37]">
          {value === null ? "—" : `${value}%`}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#D4AF37]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function AccessRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-3 text-sm">
      <dt className="text-white/35">{label}</dt>
      <dd className="break-all text-right font-bold text-white/70">
        {value}
      </dd>
    </div>
  );
}

function StateShell({
  locale,
  icon = "⏳",
  title,
  text,
  primaryHref,
  primaryLabel,
  onRetry,
}: {
  locale: Locale;
  icon?: string;
  title: string;
  text: string;
  primaryHref?: string;
  primaryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <main
      className="min-h-screen bg-[#07101D] px-4 py-16 text-white"
      dir={locale === "ku" ? "rtl" : "ltr"}
    >
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#D4AF37]/25 bg-[#101827] p-8 text-center shadow-2xl md:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#D4AF37]/10 text-4xl">
          {icon}
        </div>

        <h1 className="mt-6 text-3xl font-black md:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/55">
          {text}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {primaryHref && primaryLabel && (
            <Link
              href={primaryHref}
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black"
            >
              {primaryLabel}
            </Link>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white/75"
            >
              {t(locale, "Try Again", "دووبارە هەوڵبدەرەوە")}
            </button>
          )}

          <Link
            href={`/${locale}/predictions`}
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white/75"
          >
            {t(
              locale,
              "Back to Predictions",
              "گەڕانەوە بۆ پێشبینییەکان"
            )}
          </Link>
        </div>
      </section>
    </main>
  );
}