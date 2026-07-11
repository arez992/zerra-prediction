"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveCEORecommendation,
  executeCEORecommendation,
  fetchCEOMemory,
  fetchCEORecommendations,
  fetchCEOTasks,
  generateCEORecommendations,
  rejectCEORecommendation,
  type CEOMemoryItem,
  type CEORecommendation,
  type CEORecommendationStats,
  type CEOTaskItem,
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

  const [memory, setMemory] = useState<CEOMemoryItem[]>([]);
  const [tasks, setTasks] = useState<CEOTaskItem[]>([]);

  const [stats, setStats] =
    useState<CEORecommendationStats>(emptyStats);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [activeActionId, setActiveActionId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [checkedAt, setCheckedAt] = useState<
    string | null
  >(null);

  const loadCEOData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        recommendationsResponse,
        memoryResponse,
        tasksResponse,
      ] = await Promise.all([
        fetchCEORecommendations(),
        fetchCEOMemory(),
        fetchCEOTasks(),
      ]);

      setRecommendations(
        recommendationsResponse.recommendations || []
      );

      setStats(
        recommendationsResponse.stats || emptyStats
      );

      setCheckedAt(
        recommendationsResponse.checkedAt || null
      );

      setMemory(memoryResponse.memory || []);
      setTasks(tasksResponse.tasks || []);
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

  const generateRecommendations =
    useCallback(async () => {
      try {
        setGenerating(true);
        setError("");
        setMessage("");

        const result =
          await generateCEORecommendations();

        setMessage(
          `${result.created ?? 0} new recommendation(s) created.`
        );

        await loadCEOData();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to generate recommendations."
        );
      } finally {
        setGenerating(false);
      }
    }, [loadCEOData]);

  const approve = useCallback(
    async (id: string) => {
      try {
        setActiveActionId(id);
        setError("");
        setMessage("");

        await approveCEORecommendation(id);

        setMessage(
          "Recommendation approved successfully."
        );

        await loadCEOData();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to approve recommendation."
        );
      } finally {
        setActiveActionId(null);
      }
    },
    [loadCEOData]
  );

  const reject = useCallback(
    async (id: string, reason: string) => {
      try {
        setActiveActionId(id);
        setError("");
        setMessage("");

        await rejectCEORecommendation(id, reason);

        setMessage("Recommendation rejected.");

        await loadCEOData();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to reject recommendation."
        );
      } finally {
        setActiveActionId(null);
      }
    },
    [loadCEOData]
  );

  const execute = useCallback(
    async (id: string) => {
      try {
        setActiveActionId(id);
        setError("");
        setMessage("");

        await executeCEORecommendation(id);

        setMessage(
          "Recommendation execution completed."
        );

        await loadCEOData();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to execute recommendation."
        );

        await loadCEOData();
      } finally {
        setActiveActionId(null);
      }
    },
    [loadCEOData]
  );

  useEffect(() => {
    void loadCEOData();
  }, [loadCEOData]);

  return {
    recommendations,
    memory,
    tasks,
    stats,
    loading,
    generating,
    activeActionId,
    error,
    message,
    checkedAt,
    loadCEOData,
    loadRecommendations: loadCEOData,
    generateRecommendations,
    approve,
    reject,
    execute,
  };
}