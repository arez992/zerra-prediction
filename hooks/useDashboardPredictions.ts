"use client";

import { useEffect, useMemo, useState } from "react";

import type { PredictionResult } from "@/lib/ai/prediction";

type PredictionMap = Record<number, PredictionResult | null>;

type UseDashboardPredictionsOptions = {
  fixtureIds: number[];
  enabled: boolean;
};

type PredictionApiResponse = {
  success?: boolean;
  prediction?: PredictionResult;
  data?: PredictionResult | {
    prediction?: PredictionResult;
  };
};

function extractPrediction(
  payload: PredictionApiResponse
): PredictionResult | null {
  if (payload?.prediction) {
    return payload.prediction;
  }

  if (
    payload?.data &&
    typeof payload.data === "object" &&
    "prediction" in payload.data &&
    payload.data.prediction
  ) {
    return payload.data.prediction;
  }

  if (
    payload?.data &&
    typeof payload.data === "object" &&
    "homeWin" in payload.data
  ) {
    return payload.data as PredictionResult;
  }

  return null;
}

export function useDashboardPredictions({
  fixtureIds,
  enabled,
}: UseDashboardPredictionsOptions) {
  const [predictions, setPredictions] =
    useState<PredictionMap>({});

  const [loadingIds, setLoadingIds] =
    useState<Set<number>>(new Set());

  const [errorIds, setErrorIds] =
    useState<Set<number>>(new Set());

  const stableFixtureIds = useMemo(
    () =>
      Array.from(
        new Set(
          fixtureIds.filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          )
        )
      ),
    [fixtureIds]
  );

  useEffect(() => {
    if (!enabled) {
      setPredictions({});
      setLoadingIds(new Set());
      setErrorIds(new Set());
      return;
    }

    if (!stableFixtureIds.length) {
      return;
    }

    const missingIds =
      stableFixtureIds.filter(
        (fixtureId) =>
          !(fixtureId in predictions)
      );

    if (!missingIds.length) {
      return;
    }

    const controller =
      new AbortController();

    async function loadPredictions() {
      setLoadingIds((current) => {
        const next = new Set(current);

        missingIds.forEach((id) =>
          next.add(id)
        );

        return next;
      });

      const results =
        await Promise.allSettled(
          missingIds.map(
            async (fixtureId) => {
              const response =
                await fetch(
                  `/api/vip/predictions/${fixtureId}`,
                  {
                    cache: "no-store",
                    signal:
                      controller.signal,
                  }
                );

              if (!response.ok) {
                throw new Error(
                  `Prediction request failed for fixture ${fixtureId}`
                );
              }

              const payload =
                (await response.json()) as PredictionApiResponse;

              return {
                fixtureId,
                prediction:
                  extractPrediction(
                    payload
                  ),
              };
            }
          )
        );

      if (controller.signal.aborted) {
        return;
      }

      setPredictions((current) => {
        const next = {
          ...current,
        };

        results.forEach(
          (result, index) => {
            const fixtureId =
              missingIds[index];

            if (
              result.status ===
              "fulfilled"
            ) {
              next[fixtureId] =
                result.value.prediction;
            }
          }
        );

        return next;
      });

      setErrorIds((current) => {
        const next = new Set(current);

        results.forEach(
          (result, index) => {
            const fixtureId =
              missingIds[index];

            if (
              result.status ===
              "rejected"
            ) {
              next.add(fixtureId);
            } else {
              next.delete(fixtureId);
            }
          }
        );

        return next;
      });

      setLoadingIds((current) => {
        const next = new Set(current);

        missingIds.forEach((id) =>
          next.delete(id)
        );

        return next;
      });
    }

    loadPredictions().catch(
      (error) => {
        if (
          error instanceof Error &&
          error.name !== "AbortError"
        ) {
          console.error(
            "Failed to load dashboard predictions:",
            error
          );
        }
      }
    );

    return () => {
      controller.abort();
    };
  }, [
    enabled,
    predictions,
    stableFixtureIds,
  ]);

  return {
    predictions,
    loadingIds,
    errorIds,
  };
}