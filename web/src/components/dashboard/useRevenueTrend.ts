"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchRevenueTrend, type RevenueTrend } from "@/lib/api";
import { shiftWeeks } from "@/lib/week";

/**
 * Owns the week being viewed and whether the previous one is shown alongside it.
 *
 * Deliberately does NOT own which series are visible: hiding a series is a
 * display decision the browser already has the data for, and refetching on it
 * would be a wasted round trip the user can see.
 */
export function useRevenueTrend(initialWeekStart: string) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [compareMode, setCompareMode] = useState(false);
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

  const goToWeek = useCallback(
    (weeks: number) => setWeekStart((week) => shiftWeeks(week, weeks)),
    [],
  );

  const toggleCompare = useCallback(() => setCompareMode((on) => !on), []);

  return {
    weekStart,
    compareMode,
    data,
    error,
    loading,
    goToWeek,
    toggleCompare,
  };
}
