"use client";

import { useEffect, useState } from "react";

import { ApiError, fetchRevenueTrend, type RevenueTrend } from "@/lib/api";

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
  // An empty database is not a failure — it is the state every fresh install
  // starts in, and it deserves an explanation rather than a red banner.
  const [empty, setEmpty] = useState(false);
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
        setEmpty(false);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        // 404 here means the API is reachable and has nothing to report yet.
        if (cause instanceof ApiError && cause.status === 404) {
          setEmpty(true);
          setError(null);
          return;
        }
        setEmpty(false);
        setError(cause instanceof Error ? cause.message : "Unknown error");
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [weekStart, compareMode]);

  return { data, error, empty, loading };
}
