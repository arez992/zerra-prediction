"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveCEORecommendation,
  executeCEORecommendation,
  fetchCEOMemory,
  fetchCEORecommendations,
  fetchCEOTasks,
  fetchSEODirector,
  generateCEORecommendations,
  generateSEORecommendations,
  rejectCEORecommendation,
  type CEOMemoryItem,
  type CEORecommendation,
  type CEORecommendationStats,
  type CEOTaskItem,
  type SEODirectorReport,
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
  const [seoReport, setSEOReport] =
    useState<SEODirectorReport | null>(null);

  const [stats, setStats] =
    useState<CEORecommendationStats>(emptyStats);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [seoLoading, setSEOLoading] = useState(false);
  const [seoGenerating, setSEOGenerating] =
    useState(false);

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
        seoResponse,
      ] = await Promise.all([
        fetchCEORecommendations(),
        fetchCEOMemory(),
        fetchCEOTasks(),
        fetchSEODirector(),
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
      setSEOReport(seoResponse.seo || null);
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

  const loadSEOData = useCallback(async () => {
    try {
      setSEOLoading(true);
      setError("");

      const response = await fetchSEODirector();

      setSEOReport(response.seo || null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load SEO Director."
      );
    } finally {
      setSEOLoading(false);
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

  const generateSEO = useCallback(async () => {
    try {
      setSEOGenerating(true);
      setError("");
      setMessage("");

      const result =
        await generateSEORecommendations();

      setSEOReport(result.seo || result.report || null);

      setMessage(
        `${result.created ?? 0} new SEO recommendation(s) created.`
      );

      await loadCEOData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate SEO recommendations."
      );
    } finally {
      setSEOGenerating(false);
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
    seoReport,
    stats,
    loading,
    generating,
    seoLoading,
    seoGenerating,
    activeActionId,
    error,
    message,
    checkedAt,
    loadCEOData,
    loadRecommendations: loadCEOData,
    loadSEOData,
    generateRecommendations,
    generateSEO,
    approve,
    reject,
    execute,
  };
}