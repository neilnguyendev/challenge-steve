"use client";

import { useEffect, useState } from "react";

import { fetchRevenueTrend, type RevenueTrend } from "@/lib/api";

/**
 * Fetches the figures for whatever the URL currently describes.
 *
 * Owns no view state of its own — `weekStart` and `compareMode` come from the
 * address bar via useDashboardView. Which series are visible is deliberately
 * not a parameter: hiding one changes what is drawn from data already in hand,
 * and refetching for it would be a round trip the user can see.
 */
export function useRevenueTrend(weekStart: string, compareMode: boolean) {
  const [data, setData] = useState<RevenueTrend | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A slow response for a week the user has already navigated away from must
    // not overwrite the week they are now looking at.
    let current = true;

    setLoading(true);
    fetchRevenueTrend({ weekStart, compare: compareMode })
      .then((trend) => {
        if (!current) return;
        setData(trend);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setError(cause instanceof Error ? cause.message : "Unknown error");
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [weekStart, compareMode]);

  return { data, error, loading };
}
