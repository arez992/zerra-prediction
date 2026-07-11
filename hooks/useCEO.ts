"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCEORecommendations,
  generateCEORecommendations,
  type CEORecommendation,
  type CEORecommendationStats,
} from "@/lib/ai-ceo/client";

const emptyStats: CEORecommendationStats = {
  pending: 0,
  approved: 0,
  rejected: 0,
  executing: 0,
  completed: 0,
  failed: 0,
};

export function useCEO() {
  const [recommendations, setRecommendations] = useState<
    CEORecommendation[]
  >([]);

  const [stats, setStats] =
    useState<CEORecommendationStats>(emptyStats);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [checkedAt, setCheckedAt] = useState<string | null>(
    null
  );

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchCEORecommendations();

      setRecommendations(data.recommendations || []);
      setStats(data.stats || emptyStats);
      setCheckedAt(data.checkedAt || null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load AI CEO data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const generateRecommendations = useCallback(async () => {
    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const result = await generateCEORecommendations();

      setMessage(
        `${result.created ?? 0} new recommendation(s) created.`
      );

      await loadRecommendations();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate recommendations."
      );
    } finally {
      setGenerating(false);
    }
  }, [loadRecommendations]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  return {
    recommendations,
    stats,
    loading,
    generating,
    error,
    message,
    checkedAt,
    loadRecommendations,
    generateRecommendations,
  };
}