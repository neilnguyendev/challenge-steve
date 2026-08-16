"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import {
  parseDashboardParams,
  toSearchParams,
  type DashboardView,
} from "@/lib/dashboard-params";
import { shiftWeeks } from "@/lib/week";

import type { SeriesKey } from "./chart-theme";

/**
 * The URL is the single source of truth for what the dashboard is showing.
 *
 * Nothing is mirrored into component state: a second copy would drift from the
 * address bar the moment someone used the back button or edited the URL, and
 * then the link they copied would describe a view they were not looking at.
 */
export function useDashboardView(fallbackWeek: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = useMemo(
    () => parseDashboardParams(new URLSearchParams(searchParams.toString()), fallbackWeek),
    [searchParams, fallbackWeek],
  );

  const apply = useCallback(
    (next: DashboardView) => {
      // history.replaceState, not router.replace: the router treats this as a
      // navigation and fetches a fresh server payload, so ticking a checkbox
      // would cost a round trip to change something the browser can already
      // draw. Next keeps useSearchParams in step with the History API, so the
      // URL stays the source of truth without the trip.
      //
      // replace rather than push: a checkbox is not a place you navigated to,
      // and pushing would make Back undo one tick at a time instead of leaving
      // the dashboard.
      window.history.replaceState(null, "", `${pathname}?${toSearchParams(next)}`);
    },
    [pathname],
  );

  // Landing on a bare URL writes the week it resolved to, so copying the
  // address bar always sends "the week of 10 August" rather than "whatever
  // week the reader happens to open this in".
  const weekParam = searchParams.get("week");
  useEffect(() => {
    if (weekParam === null) apply(view);
    // Runs once per bare URL: applying it sets the parameter, so the condition
    // stops being true.
  }, [weekParam, apply, view]);

  const goToWeek = useCallback(
    (weeks: number) => apply({ ...view, weekStart: shiftWeeks(view.weekStart, weeks) }),
    [apply, view],
  );

  const toggleCompare = useCallback(
    () => apply({ ...view, compareMode: !view.compareMode }),
    [apply, view],
  );

  const toggleSeries = useCallback(
    (key: SeriesKey) =>
      apply({
        ...view,
        visibleSeries: { ...view.visibleSeries, [key]: !view.visibleSeries[key] },
      }),
    [apply, view],
  );

  return { ...view, goToWeek, toggleCompare, toggleSeries };
}
