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

type PredictionRequestResult = {
  fixtureId: number;
  prediction: PredictionResult | null;
  error: boolean;
};

function normalizeNumber(
  value: unknown,
  fallback = 0
): number {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback;
}

function normalizePercent(
  value: unknown
): number {
  const parsedValue =
    normalizeNumber(value);

  return Math.max(
    0,
    Math.min(100, parsedValue)
  );
}

function extractPrediction(
  payload: unknown
): PredictionResult | null {
  if (
    !payload ||
    typeof payload !== "object"
  ) {
    return null;
  }

  const response = payload as Record<
    string,
    any
  >;

  /*
   * Current VIP API response:
   *
   * {
   *   prediction: {
   *     vipPrediction: {
   *       confidence,
   *       exactScore,
   *       valueBet,
   *       markets: {
   *         homeWin,
   *         draw,
   *         awayWin,
   *         over25,
   *         under25,
   *         btts
   *       }
   *     }
   *   }
   * }
   */
  const vipPrediction =
    response?.prediction?.vipPrediction;

  if (
    vipPrediction &&
    typeof vipPrediction === "object"
  ) {
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
      confidence: normalizePercent(
        vipPrediction.confidence
      ),

      over25: normalizePercent(
        markets.over25
      ),
      under25: normalizePercent(
        markets.under25
      ),
      btts: normalizePercent(
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

      reasoning: Array.isArray(
        vipPrediction.reasoning
      )
        ? vipPrediction.reasoning.filter(
            (
              item: unknown
            ): item is string =>
              typeof item === "string"
          )
        : [],
    } as unknown as PredictionResult;
  }

  /*
   * Legacy flat prediction:
   *
   * {
   *   prediction: {
   *     homeWin,
   *     draw,
   *     awayWin,
   *     confidence
   *   }
   * }
   */
  const directPrediction =
    response?.prediction;

  if (
    directPrediction &&
    typeof directPrediction ===
      "object" &&
    directPrediction.homeWin !==
      undefined
  ) {
    return directPrediction as PredictionResult;
  }

  /*
   * Legacy wrapped response:
   *
   * {
   *   data: {
   *     prediction: {...}
   *   }
   * }
   */
  const wrappedPrediction =
    response?.data?.prediction;

  if (
    wrappedPrediction &&
    typeof wrappedPrediction ===
      "object"
  ) {
    return wrappedPrediction as PredictionResult;
  }

  /*
   * Legacy flat data response:
   *
   * {
   *   data: {
   *     homeWin,
   *     draw,
   *     awayWin
   *   }
   * }
   */
  if (
    response?.data &&
    typeof response.data ===
      "object" &&
    response.data.homeWin !== undefined
  ) {
    return response.data as PredictionResult;
  }

  return null;
}

async function requestPrediction(
  fixtureId: number,
  signal: AbortSignal
): Promise<PredictionRequestResult> {
  try {
    const response = await fetch(
      `/api/vip/predictions/${fixtureId}`,
      {
        method: "GET",
        cache: "no-store",
        signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    /*
     * 404 واتە prediction ـی ئەم یارییە
     * هێشتا publish نەکراوە.
     * ئەمە server error نییە.
     */
    if (response.status === 404) {
      return {
        fixtureId,
        prediction: null,
        error: false,
      };
    }

    /*
     * 401/403 واتە کێشەی access یان session.
     */
    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return {
        fixtureId,
        prediction: null,
        error: true,
      };
    }

    if (!response.ok) {
      return {
        fixtureId,
        prediction: null,
        error: true,
      };
    }

    const payload: unknown =
      await response.json();

    return {
      fixtureId,
      prediction:
        extractPrediction(payload),
      error: false,
    };
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    console.error(
      `[DASHBOARD_PREDICTION_ERROR:${fixtureId}]`,
      error
    );

    return {
      fixtureId,
      prediction: null,
      error: true,
    };
  }
}

export function useDashboardPredictions({
  fixtureIds,
  enabled,
}: UseDashboardPredictionsOptions) {
  const [
    predictions,
    setPredictions,
  ] = useState<PredictionMap>({});

  const [
    loadingIds,
    setLoadingIds,
  ] = useState<Set<number>>(
    () => new Set()
  );

  const [
    errorIds,
    setErrorIds,
  ] = useState<Set<number>>(
    () => new Set()
  );

  const requestedIdsRef = useRef<
    Set<number>
  >(new Set());

  const stableIds = useMemo(() => {
    return Array.from(
      new Set(
        fixtureIds.filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0
        )
      )
    ).sort((first, second) => {
      return first - second;
    });
  }, [fixtureIds]);

  const idsKey = stableIds.join(",");

  useEffect(() => {
    if (!enabled) {
      requestedIdsRef.current.clear();

      setPredictions({});
      setLoadingIds(new Set());
      setErrorIds(new Set());

      return;
    }

    if (stableIds.length === 0) {
      return;
    }

    const idsToLoad =
      stableIds.filter(
        (fixtureId) =>
          !requestedIdsRef.current.has(
            fixtureId
          )
      );

    if (idsToLoad.length === 0) {
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

    setLoadingIds((current) => {
      const next = new Set(current);

      idsToLoad.forEach(
        (fixtureId) => {
          next.add(fixtureId);
        }
      );

      return next;
    });

    setErrorIds((current) => {
      const next = new Set(current);

      idsToLoad.forEach(
        (fixtureId) => {
          next.delete(fixtureId);
        }
      );

      return next;
    });

    async function loadPredictions() {
      try {
        const results =
          await Promise.all(
            idsToLoad.map(
              (fixtureId) =>
                requestPrediction(
                  fixtureId,
                  controller.signal
                )
            )
          );

        if (
          controller.signal.aborted
        ) {
          return;
        }

        setPredictions(
          (current) => {
            const next = {
              ...current,
            };

            results.forEach(
              (result) => {
                next[
                  result.fixtureId
                ] =
                  result.prediction;
              }
            );

            return next;
          }
        );

        setErrorIds((current) => {
          const next =
            new Set(current);

          results.forEach(
            (result) => {
              if (result.error) {
                next.add(
                  result.fixtureId
                );
              } else {
                next.delete(
                  result.fixtureId
                );
              }
            }
          );

          return next;
        });
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
          "[DASHBOARD_PREDICTIONS_LOAD_ERROR]",
          error
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoadingIds(
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
        }
      }
    }

    void loadPredictions();

    return () => {
      controller.abort();

      /*
       * ئەگەر request ـەکە لەبەر
       * گۆڕانی page یان fixture abort بوو،
       * ڕێگە دەدەین دواتر دووبارە load بکرێت.
       */
      idsToLoad.forEach(
        (fixtureId) => {
          requestedIdsRef.current.delete(
            fixtureId
          );
        }
      );
    };
  }, [enabled, idsKey]);

  return {
    predictions,
    loadingIds,
    errorIds,
  };
}