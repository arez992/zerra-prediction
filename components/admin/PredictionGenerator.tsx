"use client";

import {
  useMemo,
  useState,
} from "react";

type GenerationSummary = {
  requestedDate?: string;
  requestedLimit?: number;
  mode?: string;
  overwrite?: boolean;
  totalFixtures?: number;
  generatedPredictions?: number;
  withheldPredictions?: number;
  insufficientDataPredictions?: number;
  failedPredictions?: number;
  skippedExistingPredictions?: number;
  enrichedFixtureRequests?: number;
  errors?: Array<{
    fixtureId?: string | number;
    error?: string;
  }>;
};

type GenerateResponse = {
  success: boolean;
  message?: string;
  error?: string;
  summary?: GenerationSummary;
};

function getTodayUTC(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

export default function PredictionGenerator({
  onGenerated,
}: {
  onGenerated?: () => void | Promise<void>;
}) {
  const [date, setDate] =
    useState(getTodayUTC());

  const [limit, setLimit] =
    useState(3);

  const [mode, setMode] =
    useState<"basic" | "enriched">(
      "enriched"
    );

  const [overwrite, setOverwrite] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [summary, setSummary] =
    useState<GenerationSummary | null>(
      null
    );

  const canGenerate = useMemo(
    () =>
      Boolean(date) &&
      Number.isFinite(limit) &&
      limit >= 1 &&
      limit <= 25 &&
      !generating,
    [date, limit, generating]
  );

  async function generatePredictions() {
    if (!canGenerate) {
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setMessage("");
      setSummary(null);

      const response = await fetch(
        "/api/admin/predictions/generate",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            date,
            limit,
            mode,
            overwrite,
          }),
        }
      );

      const raw =
        await response.text();

      let data: GenerateResponse;

      try {
        data = raw
          ? (JSON.parse(
              raw
            ) as GenerateResponse)
          : {
              success: false,
              error:
                "The server returned an empty response.",
            };
      } catch {
        throw new Error(
          `Invalid server response: ${raw.slice(
            0,
            250
          )}`
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Prediction generation failed."
        );
      }

      setMessage(
        data.message ||
          "Prediction generation completed."
      );

      setSummary(
        data.summary || null
      );

      if (onGenerated) {
        await onGenerated();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Prediction generation failed."
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-[#D4AF37]/20 bg-gradient-to-br from-[#101827] to-[#0A1220] p-6 shadow-2xl md:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Prediction Engine v3
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            Generate Predictions
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
            Generate new predictions with the
            authenticated admin session. Enriched
            mode uses recent fixtures and team
            season statistics.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold text-white/45">
          Maximum 25 fixtures per request
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
            Date
          </span>

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-[#D4AF37]/60"
          />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
            Limit
          </span>

          <input
            type="number"
            min={1}
            max={25}
            value={limit}
            onChange={(event) =>
              setLimit(
                Math.min(
                  25,
                  Math.max(
                    1,
                    Number(
                      event.target.value
                    ) || 1
                  )
                )
              )
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-[#D4AF37]/60"
          />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
            Mode
          </span>

          <select
            value={mode}
            onChange={(event) =>
              setMode(
                event.target.value ===
                  "basic"
                  ? "basic"
                  : "enriched"
              )
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-[#D4AF37]/60"
          >
            <option value="enriched">
              Enriched
            </option>
            <option value="basic">
              Basic
            </option>
          </select>
        </label>

        <label className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:mt-[26px]">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(event) =>
              setOverwrite(
                event.target.checked
              )
            }
            className="h-5 w-5 accent-[#D4AF37]"
          />

          <span>
            <span className="block text-sm font-black">
              Overwrite existing
            </span>

            <span className="mt-1 block text-xs leading-5 text-white/40">
              Regenerate existing records for
              the selected date.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() =>
            void generatePredictions()
          }
          disabled={!canGenerate}
          className="rounded-full bg-[#D4AF37] px-7 py-3.5 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating
            ? "Generating..."
            : "Generate Predictions"}
        </button>

        <p className="text-xs leading-6 text-white/35">
          Keep this page open until generation
          finishes.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-3xl border border-green-500/25 bg-green-500/10 p-5 text-sm leading-7 text-green-200">
          {message}
        </div>
      )}

      {summary && (
        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Generation Summary
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <ResultCard
              label="Generated"
              value={
                summary.generatedPredictions ??
                0
              }
            />

            <ResultCard
              label="Withheld"
              value={
                summary.withheldPredictions ??
                0
              }
            />

            <ResultCard
              label="Insufficient"
              value={
                summary.insufficientDataPredictions ??
                0
              }
            />

            <ResultCard
              label="Failed"
              value={
                summary.failedPredictions ??
                0
              }
            />

            <ResultCard
              label="Skipped"
              value={
                summary.skippedExistingPredictions ??
                0
              }
            />

            <ResultCard
              label="Enriched Calls"
              value={
                summary.enrichedFixtureRequests ??
                0
              }
            />
          </div>

          {Array.isArray(
            summary.errors
          ) &&
            summary.errors.length > 0 && (
              <div className="mt-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
                <p className="text-sm font-black text-red-200">
                  Generation errors
                </p>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-red-200/75">
                  {summary.errors.map(
                    (item, index) => (
                      <li
                        key={`${item.fixtureId}-${index}`}
                        className="rounded-2xl border border-red-500/10 bg-black/15 px-4 py-3"
                      >
                        Fixture{" "}
                        {item.fixtureId ??
                          "unknown"}
                        :{" "}
                        {item.error ||
                          "Unknown error"}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
        </div>
      )}
    </section>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-[#D4AF37]">
        {value}
      </p>
    </div>
  );
}