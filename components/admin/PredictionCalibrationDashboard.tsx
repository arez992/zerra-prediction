"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type CalibrationGroupStats = {
  key: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  averageConfidence: number | null;
  averageCalibrationError: number | null;
  highConfidencePredictions: number;
  highConfidenceFailures: number;
  highConfidenceFailureRate: number | null;
};

type PredictionCalibrationSummary = {
  generatedAt: string;
  totalPredictionRecords: number;
  evaluablePredictions: number;
  qualifiedPredictions: number;
  legacyPredictions: number;

  overall: {
    correct: number;
    incorrect: number;
    accuracy: number | null;
    averageConfidence: number | null;
    averageCalibrationError: number | null;
    highConfidencePredictions: number;
    highConfidenceFailures: number;
    highConfidenceFailureRate: number | null;
  };

  byMarketCategory: CalibrationGroupStats[];
  byModelVersion: CalibrationGroupStats[];
  sampleWarnings: string[];
};

type CalibrationResponse = {
  success: boolean;
  summary?: PredictionCalibrationSummary;
  error?: string;
};

function formatMetric(
  value:
    number | null,
  suffix = "%"
): string {
  if (
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return "—";
  }

  return `${value}${suffix}`;
}

export default function PredictionCalibrationDashboard() {
  const [
    summary,
    setSummary,
  ] =
    useState<PredictionCalibrationSummary | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const loadCalibration =
    useCallback(
      async (
        silent =
          false
      ) => {
        try {
          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          const response =
            await fetch(
              "/api/admin/predictions/calibration?limit=2000",
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",
              }
            );

          const raw =
            await response
              .text();

          let data:
            CalibrationResponse;

          try {
            data =
              raw
                ? JSON.parse(
                    raw
                  ) as
                    CalibrationResponse
                : {
                    success:
                      false,

                    error:
                      "The server returned an empty response.",
                  };
          } catch {
            throw new Error(
              `Invalid calibration response: ${raw.slice(
                0,
                200
              )}`
            );
          }

          if (
            !response.ok ||
            !data.success ||
            !data.summary
          ) {
            throw new Error(
              data.error ||
                "Unable to load prediction calibration."
            );
          }

          setSummary(
            data.summary
          );
        } catch (
          requestError
        ) {
          setError(
            requestError instanceof
              Error
              ? requestError
                  .message
              : "Unable to load prediction calibration."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(
    () => {
      void loadCalibration();
    },
    [
      loadCalibration,
    ]
  );

  return (
    <section className="mt-8 rounded-[2rem] border border-[#D4AF37]/20 bg-gradient-to-br from-[#101827] to-[#0A1220] p-6 shadow-2xl md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            Accuracy + Calibration
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            Prediction Learning Analytics
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
            Read-only performance analytics from verified settled predictions.
            These metrics do not modify or deploy the production model automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadCalibration(
              true
            )
          }
          disabled={
            refreshing
          }
          className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-3 text-sm font-black text-[#D4AF37] transition hover:bg-[#D4AF37]/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh Analytics"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-sm text-white/45">
          Loading calibration analytics...
        </div>
      ) : summary ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CalibrationMetric
              label="Overall Accuracy"
              value={formatMetric(
                summary
                  .overall
                  .accuracy
              )}
            />

            <CalibrationMetric
              label="Average Confidence"
              value={formatMetric(
                summary
                  .overall
                  .averageConfidence
              )}
            />

            <CalibrationMetric
              label="Calibration Error"
              value={formatMetric(
                summary
                  .overall
                  .averageCalibrationError
              )}
            />

            <CalibrationMetric
              label="High-Confidence Failure"
              value={formatMetric(
                summary
                  .overall
                  .highConfidenceFailureRate
              )}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CalibrationMetric
              label="Learning Records"
              value={
                summary
                  .totalPredictionRecords
              }
            />

            <CalibrationMetric
              label="Evaluable"
              value={
                summary
                  .evaluablePredictions
              }
            />

            <CalibrationMetric
              label="Qualified"
              value={
                summary
                  .qualifiedPredictions
              }
            />

            <CalibrationMetric
              label="Legacy"
              value={
                summary
                  .legacyPredictions
              }
            />
          </div>

          {summary
            .sampleWarnings
            .length >
            0 && (
            <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                Sample Warnings
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-100/80">
                {summary
                  .sampleWarnings
                  .map(
                    (
                      warning,
                      index
                    ) => (
                      <li
                        key={`${index}-${warning}`}
                        className="rounded-2xl border border-amber-300/10 bg-black/10 px-4 py-3"
                      >
                        {
                          warning
                        }
                      </li>
                    )
                  )}
              </ul>
            </div>
          )}

          <CalibrationTable
            title="Performance by Market Category"
            groups={
              summary
                .byMarketCategory
            }
          />

          <CalibrationTable
            title="Performance by Model Version"
            groups={
              summary
                .byModelVersion
            }
          />

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/45">
            Last generated:{" "}
            <span className="font-bold text-white/70">
              {new Date(
                summary.generatedAt
              ).toLocaleString()}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-sm text-white/45">
          No calibration analytics are available.
        </div>
      )}
    </section>
  );
}

function CalibrationMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
        {
          label
        }
      </p>

      <p className="mt-3 text-3xl font-black text-[#D4AF37]">
        {
          value
        }
      </p>
    </div>
  );
}

function CalibrationTable({
  title,
  groups,
}: {
  title:
    string;

  groups:
    CalibrationGroupStats[];
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
      <div className="border-b border-white/10 p-5">
        <h3 className="text-xl font-black">
          {
            title
          }
        </h3>
      </div>

      {groups.length ===
      0 ? (
        <div className="p-6 text-sm text-white/40">
          No settled prediction data available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-white/35">
              <tr>
                <th className="px-5 py-4">
                  Group
                </th>

                <th className="px-5 py-4">
                  Sample
                </th>

                <th className="px-5 py-4">
                  Accuracy
                </th>

                <th className="px-5 py-4">
                  Avg Confidence
                </th>

                <th className="px-5 py-4">
                  Calibration Error
                </th>

                <th className="px-5 py-4">
                  High-Conf Failure
                </th>
              </tr>
            </thead>

            <tbody>
              {groups.map(
                (
                  group
                ) => (
                  <tr
                    key={
                      group.key
                    }
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td className="px-5 py-4 font-black text-white/80">
                      {
                        group.key
                      }
                    </td>

                    <td className="px-5 py-4 text-white/55">
                      {
                        group.total
                      }
                    </td>

                    <td className="px-5 py-4 text-white/55">
                      {formatMetric(
                        group.accuracy
                      )}
                    </td>

                    <td className="px-5 py-4 text-white/55">
                      {formatMetric(
                        group
                          .averageConfidence
                      )}
                    </td>

                    <td className="px-5 py-4 text-white/55">
                      {formatMetric(
                        group
                          .averageCalibrationError
                      )}
                    </td>

                    <td className="px-5 py-4 text-white/55">
                      {formatMetric(
                        group
                          .highConfidenceFailureRate
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}