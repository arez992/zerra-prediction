"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PredictionResult } from "@/lib/ai/prediction";

type PredictionMap = Record<number, PredictionResult | null>;

type UseDashboardPredictionsOptions = {
  fixtureIds: number[];
  enabled: boolean;
};

function extractPrediction(payload: any): PredictionResult | null {
  if (payload?.prediction) {
    return payload.prediction;
  }

  if (payload?.data?.prediction) {
    return payload.data.prediction;
  }

  if (payload?.data?.homeWin !== undefined) {
    return payload.data as PredictionResult;
  }

  return null;
}

export function useDashboardPredictions({
  fixtureIds,
  enabled,
}: UseDashboardPredictionsOptions) {
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<number>>(new Set());

  const requestedIdsRef = useRef<Set<number>>(new Set());

  const stableIds = useMemo(() => {
    return Array.from(
      new Set(
        fixtureIds.filter(
          (id) => Number.isInteger(id) && id > 0
        )
      )
    );
  }, [fixtureIds]);

  const idsKey = stableIds.join(",");

  useEffect(() => {
    if (!enabled || stableIds.length === 0) {
      return;
    }

    const idsToLoad = stableIds.filter(
      (id) => !requestedIdsRef.current.has(id)
    );

    if (idsToLoad.length === 0) {
      return;
    }

    idsToLoad.forEach((id) => {
      requestedIdsRef.current.add(id);
    });

    const controller = new AbortController();

    setLoadingIds((current) => {
      const next = new Set(current);

      idsToLoad.forEach((id) => {
        next.add(id);
      });

      return next;
    });

    Promise.allSettled(
      idsToLoad.map(async (fixtureId) => {
        const response = await fetch(
          `/api/vip/predictions/${fixtureId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Prediction failed: ${fixtureId}`);
        }

        const payload = await response.json();

        return {
          fixtureId,
          prediction: extractPrediction(payload),
        };
      })
    ).then((results) => {
      if (controller.signal.aborted) {
        return;
      }

      setPredictions((current) => {
        const next = { ...current };

        results.forEach((result, index) => {
          const fixtureId = idsToLoad[index];

          if (result.status === "fulfilled") {
            next[fixtureId] = result.value.prediction;
          }
        });

        return next;
      });

      setErrorIds((current) => {
        const next = new Set(current);

        results.forEach((result, index) => {
          const fixtureId = idsToLoad[index];

          if (result.status === "rejected") {
            next.add(fixtureId);
          } else {
            next.delete(fixtureId);
          }
        });

        return next;
      });

      setLoadingIds((current) => {
        const next = new Set(current);

        idsToLoad.forEach((id) => {
          next.delete(id);
        });

        return next;
      });
    });

    return () => {
      controller.abort();
    };
  }, [enabled, idsKey]);

  return {
    predictions,
    loadingIds,
    errorIds,
  };
}