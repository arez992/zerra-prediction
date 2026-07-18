"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PredictionResult } from "@/lib/ai/prediction";

type PredictionMap = Record<
  number,
  PredictionResult | null
>;

type UseDashboardPredictionsOptions = {
  fixtureIds: number[];
  enabled: boolean;
};

type BatchPredictionItem = {
  vipPrediction?: {
    confidence?: unknown;
    exactScore?: unknown;
    valueBet?: unknown;
    finalPrediction?: unknown;
    reasoning?: unknown;
    markets?: {
      homeWin?: unknown;
      draw?: unknown;
      awayWin?: unknown;
      over25?: unknown;
      under25?: unknown;
      btts?: unknown;
    };
  };
};

type BatchResponse = {
  success?: boolean;
  predictions?: Record<
    string,
    BatchPredictionItem
  >;
  error?: string;
};

function normalizeNumber(
  value: unknown,
  fallback = 0
): number {
  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue
  )
    ? parsedValue
    : fallback;
}

function normalizePercent(
  value: unknown
): number {
  return Math.max(
    0,
    Math.min(
      100,
      normalizeNumber(value)
    )
  );
}

function extractPrediction(
  item: BatchPredictionItem | undefined
): PredictionResult | null {
  const vipPrediction =
    item?.vipPrediction;

  if (
    !vipPrediction ||
    typeof vipPrediction !==
      "object"
  ) {
    return null;
  }

  const markets =
    vipPrediction.markets &&
    typeof vipPrediction.markets ===
      "object"
      ? vipPrediction.markets
      : {};

  return {
    homeWin: normalizePercent(
      markets.homeWin
    ),

    draw: normalizePercent(
      markets.draw
    ),

    awayWin: normalizePercent(
      markets.awayWin
    ),

    confidence:
      normalizePercent(
        vipPrediction.confidence
      ),

    over25:
      normalizePercent(
        markets.over25
      ),

    under25:
      normalizePercent(
        markets.under25
      ),

    btts:
      normalizePercent(
        markets.btts
      ),

    exactScore:
      typeof vipPrediction.exactScore ===
      "string"
        ? vipPrediction.exactScore
        : "",

    valueBet:
      typeof vipPrediction.valueBet ===
      "string"
        ? vipPrediction.valueBet
        : "",

    finalPrediction:
      typeof vipPrediction.finalPrediction ===
      "string"
        ? vipPrediction.finalPrediction
        : "",

    reasoning:
      Array.isArray(
        vipPrediction.reasoning
      )
        ? vipPrediction.reasoning.filter(
            (
              item
            ): item is string =>
              typeof item ===
              "string"
          )
        : [],
  } as unknown as PredictionResult;
}

export function useDashboardPredictions({
  fixtureIds,
  enabled,
}: UseDashboardPredictionsOptions) {
  const [
    predictions,
    setPredictions,
  ] =
    useState<PredictionMap>({});

  const [
    loadingIds,
    setLoadingIds,
  ] =
    useState<Set<number>>(
      () => new Set()
    );

  const [
    errorIds,
    setErrorIds,
  ] =
    useState<Set<number>>(
      () => new Set()
    );

  const requestedIdsRef =
    useRef<Set<number>>(
      new Set()
    );

  const stableIds =
    useMemo(() => {
      return Array.from(
        new Set(
          fixtureIds.filter(
            (id) =>
              Number.isInteger(
                id
              ) &&
              id > 0
          )
        )
      ).sort(
        (
          first,
          second
        ) =>
          first - second
      );
    }, [fixtureIds]);

  const idsKey =
    stableIds.join(",");

  useEffect(() => {
    if (!enabled) {
      requestedIdsRef.current.clear();

      setPredictions({});
      setLoadingIds(
        new Set()
      );
      setErrorIds(
        new Set()
      );

      return;
    }

    if (
      stableIds.length === 0
    ) {
      return;
    }

    const idsToLoad =
      stableIds.filter(
        (fixtureId) =>
          !requestedIdsRef.current.has(
            fixtureId
          )
      );

    if (
      idsToLoad.length === 0
    ) {
      return;
    }

    idsToLoad.forEach(
      (fixtureId) => {
        requestedIdsRef.current.add(
          fixtureId
        );
      }
    );

    const controller =
      new AbortController();

    setLoadingIds(
      (current) => {
        const next =
          new Set(current);

        idsToLoad.forEach(
          (fixtureId) => {
            next.add(
              fixtureId
            );
          }
        );

        return next;
      }
    );

    setErrorIds(
      (current) => {
        const next =
          new Set(current);

        idsToLoad.forEach(
          (fixtureId) => {
            next.delete(
              fixtureId
            );
          }
        );

        return next;
      }
    );

    async function loadPredictions() {
      try {
        const response =
          await fetch(
            "/api/vip/predictions",
            {
              method:
                "POST",

              cache:
                "no-store",

              signal:
                controller.signal,

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    fixtureIds:
                      idsToLoad,
                  }
                ),
            }
          );

        if (
          controller.signal.aborted
        ) {
          return;
        }

        if (
          !response.ok
        ) {
          setErrorIds(
            (current) => {
              const next =
                new Set(
                  current
                );

              idsToLoad.forEach(
                (
                  fixtureId
                ) => {
                  next.add(
                    fixtureId
                  );
                }
              );

              return next;
            }
          );

          return;
        }

        const payload =
          (await response.json()) as BatchResponse;

        const batchPredictions =
          payload.predictions ||
          {};

        setPredictions(
          (current) => {
            const next = {
              ...current,
            };

            idsToLoad.forEach(
              (
                fixtureId
              ) => {
                next[
                  fixtureId
                ] =
                  extractPrediction(
                    batchPredictions[
                      String(
                        fixtureId
                      )
                    ]
                  );
              }
            );

            return next;
          }
        );

        setErrorIds(
          (current) => {
            const next =
              new Set(
                current
              );

            idsToLoad.forEach(
              (
                fixtureId
              ) => {
                next.delete(
                  fixtureId
                );
              }
            );

            return next;
          }
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "[DASHBOARD_PREDICTIONS_BATCH_ERROR]",
          error
        );

        setErrorIds(
          (current) => {
            const next =
              new Set(
                current
              );

            idsToLoad.forEach(
              (
                fixtureId
              ) => {
                next.add(
                  fixtureId
                );
              }
            );

            return next;
          }
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoadingIds(
            (current) => {
              const next =
                new Set(
                  current
                );

              idsToLoad.forEach(
                (
                  fixtureId
                ) => {
                  next.delete(
                    fixtureId
                  );
                }
              );

              return next;
            }
          );
        }
      }
    }

    void loadPredictions();

    return () => {
      controller.abort();

      idsToLoad.forEach(
        (fixtureId) => {
          requestedIdsRef.current.delete(
            fixtureId
          );
        }
      );
    };
  }, [
    enabled,
    idsKey,
  ]);

  return {
    predictions,
    loadingIds,
    errorIds,
  };
}