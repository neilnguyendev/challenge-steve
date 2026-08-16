"use client";

import { useState } from "react";

import { DashboardHeader } from "./DashboardHeader";
import { SERIES_KEYS, type SeriesKey } from "./chart-theme";
import { useRevenueTrend } from "./useRevenueTrend";
import { hasEarlierWeek, hasLaterWeek } from "@/lib/week";

const ALL_SERIES_VISIBLE: Record<SeriesKey, boolean> = {
  pos: true,
  eatclub: true,
  labour: true,
};

export function Dashboard({ initialWeekStart }: { initialWeekStart: string }) {
  const { weekStart, compareMode, data, error, loading, goToWeek, toggleCompare } =
    useRevenueTrend(initialWeekStart);

  // Series visibility lives here rather than in the hook: it changes what is
  // drawn, never what is fetched.
  const [visibleSeries, setVisibleSeries] =
    useState<Record<SeriesKey, boolean>>(ALL_SERIES_VISIBLE);

  const toggleSeries = (key: SeriesKey) =>
    setVisibleSeries((current) => ({ ...current, [key]: !current[key] }));

  // With no data we do not know the recorded range, so leave navigation open
  // rather than trapping the visitor on a week that failed to load.
  const canGoEarlier = data
    ? hasEarlierWeek(weekStart, data.available_range.earliest)
    : true;
  const canGoLater = data ? hasLaterWeek(weekStart, data.available_range.latest) : true;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <DashboardHeader
        weekStart={weekStart}
        compareMode={compareMode}
        visibleSeries={visibleSeries}
        canGoEarlier={canGoEarlier}
        canGoLater={canGoLater}
        onToggleCompare={toggleCompare}
        onToggleSeries={toggleSeries}
        onChangeWeek={goToWeek}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          The figures could not be loaded: {error}
        </p>
      ) : null}

      {/* Placeholder until FE-04 and S-002 land. */}
      <section
        aria-busy={loading}
        className="rounded-xl border border-neutral-200 p-6 text-sm text-neutral-500"
      >
        <p data-testid="visible-series">
          {SERIES_KEYS.filter((key) => visibleSeries[key]).join(",")}
        </p>
        {data ? (
          <p className="mt-2 tabular-nums">
            {data.series.length} days loaded for {data.period.start} – {data.period.end}
          </p>
        ) : null}
      </section>
    </main>
  );
}
