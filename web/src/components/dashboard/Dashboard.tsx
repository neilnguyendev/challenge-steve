"use client";

import { useRef, useState } from "react";

import { DashboardHeader } from "./DashboardHeader";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { SummaryCards } from "./SummaryCards";
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

  // The export reads whatever is inside this element, so it always matches
  // what the visitor is looking at rather than a re-render of its own.
  const chartRef = useRef<HTMLDivElement>(null);

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
        chartRef={chartRef}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          The figures could not be loaded: {error}
        </p>
      ) : null}

      <p data-testid="visible-series" className="sr-only">
        {SERIES_KEYS.filter((key) => visibleSeries[key]).join(",")}
      </p>

      <div aria-busy={loading} className="flex flex-col gap-8">
        {data ? (
          <>
            <SummaryCards summary={data.summary} compareMode={compareMode} />
            <div ref={chartRef}>
              <RevenueTrendChart
                data={data}
                compareMode={compareMode}
                visibleSeries={visibleSeries}
              />
            </div>
          </>
        ) : null}

        {loading && !data ? (
          <div className="h-96 animate-pulse rounded-xl bg-neutral-100" />
        ) : null}
      </div>
    </main>
  );
}
