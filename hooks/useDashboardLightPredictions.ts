"use client";

import { useEffect, useMemo, useState } from "react";

export type DashboardLightPrediction = {
  risk: string;
  riskScore: number;
  prediction?: string;
  marketCategory?: string;
};

type PredictionMap = Record<string, DashboardLightPrediction>;

export function useDashboardLightPredictions({ fixtures, enabled }: { fixtures: any[]; enabled: boolean }) {
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fixturesKey = useMemo(() => fixtures.map((item) => String(item?.fixture?.id ?? "")).filter(Boolean).join(","), [fixtures]);

  useEffect(() => {
    if (!enabled || fixtures.length === 0) {
      setPredictions({});
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch("/api/dashboard/predictions", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fixtures }),
        });

        if (!response.ok) {
          throw new Error(`Dashboard prediction request failed: ${response.status}`);
        }

        const payload = await response.json();

        if (!controller.signal.aborted) {
          setPredictions(payload?.predictions && typeof payload.predictions === "object" ? payload.predictions : {});
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[DASHBOARD_LIGHT_PREDICTIONS_CLIENT_ERROR]", error);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [enabled, fixturesKey]);

  return { predictions, loading, error };
}
