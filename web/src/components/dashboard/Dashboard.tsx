"use client";

import { useRef } from "react";

import { DashboardHeader } from "./DashboardHeader";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { SummaryCards } from "./SummaryCards";
import { SERIES_KEYS } from "./chart-theme";
import { useDashboardView } from "./useDashboardView";
import { useRevenueTrend } from "./useRevenueTrend";
import { hasEarlierWeek, hasLaterWeek } from "@/lib/week";

/**
 * `fallbackWeekStart` is used only when the URL names no week — it is not
 * initial state. Everything the visitor chooses lives in the address bar, so
 * the view survives a reload and a copied link shows what the sender saw.
 */
export function Dashboard({ fallbackWeekStart }: { fallbackWeekStart: string }) {
  const {
    weekStart,
    compareMode,
    visibleSeries,
    goToWeek,
    toggleCompare,
    toggleSeries,
  } = useDashboardView(fallbackWeekStart);

  const { data, error, empty, loading } = useRevenueTrend(weekStart, compareMode);

  // The export reads whatever is inside this element, so it always matches
  // what the visitor is looking at rather than a re-render of its own.
  const chartRef = useRef<HTMLDivElement>(null);

  // With no data we do not know the recorded range, so leave navigation open
  // rather than trapping the visitor on a week that failed to load.
  const canGoEarlier = data
    ? hasEarlierWeek(weekStart, data.available_range.earliest)
    : true;
  const canGoLater = data ? hasLaterWeek(weekStart, data.available_range.latest) : true;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
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

      {/* No figures recorded yet. Every fresh install starts here, so it offers
          the way forward rather than reporting a failure.

          Deliberately says nothing about seeding: that is a setup command for
          whoever installs this, and it has no business on a screen a venue
          manager looks at. It lives in the README. */}
      {empty ? (
        <section className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-16 text-center">
          <h2 className="text-base font-semibold text-text">No figures yet</h2>
          <p className="max-w-sm text-sm text-text-muted">
            Nothing has been recorded for this week.
          </p>
          <a
            href="/admin/trading-days"
            className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent transition-opacity duration-150 hover:opacity-90"
          >
            Enter figures
          </a>
        </section>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-panel border border-negative/25 bg-negative-surface px-4 py-3 text-sm text-negative"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="mt-0.5 size-4 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <span>The figures could not be loaded: {error}</span>
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
          <div className="h-96 animate-pulse rounded-card bg-surface-sunken" />
        ) : null}
      </div>
    </main>
  );
}
