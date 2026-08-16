"use client";

import type { RefObject } from "react";

import { ExportPngButton } from "./ExportPngButton";
import {
  METRIC_LABEL,
  SERIES_COLOR,
  SERIES_KEYS,
  type SeriesKey,
} from "./chart-theme";
import { formatWeekRange } from "@/lib/week";

interface DashboardHeaderProps {
  weekStart: string;
  compareMode: boolean;
  visibleSeries: Record<SeriesKey, boolean>;
  canGoEarlier: boolean;
  canGoLater: boolean;
  onToggleCompare: () => void;
  onToggleSeries: (key: SeriesKey) => void;
  onChangeWeek: (weeks: number) => void;
  chartRef: RefObject<HTMLElement | null>;
}

export function DashboardHeader({
  weekStart,
  compareMode,
  visibleSeries,
  canGoEarlier,
  canGoLater,
  onToggleCompare,
  onToggleSeries,
  onChangeWeek,
  chartRef,
}: DashboardHeaderProps) {
  const title = compareMode
    ? "This Week's Revenue Trend vs Previous Period"
    : "This Week's Revenue Trend";

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* The title yields space so the controls stay on one row; it wraps
            onto a second line rather than pushing them below. */}
        <h1 className="min-w-[12rem] flex-1 text-xl font-semibold leading-tight tracking-tight text-neutral-900">
          {title}
        </h1>

        <div className="flex shrink-0 flex-wrap items-center gap-4">
          {SERIES_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700"
            >
              <input
                type="checkbox"
                checked={visibleSeries[key]}
                onChange={() => onToggleSeries(key)}
                aria-label={METRIC_LABEL[key]}
                className="size-4 cursor-pointer accent-neutral-900"
              />
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: SERIES_COLOR.current[key] }}
              />
              {METRIC_LABEL[key]}
            </label>
          ))}

          <button
            type="button"
            onClick={onToggleCompare}
            aria-pressed={compareMode}
            className={
              compareMode
                ? "rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                : "rounded-full border border-amber-400 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-50"
            }
          >
            Compare to Previous
          </button>

          <ExportPngButton
            chartRef={chartRef}
            weekStart={weekStart}
            compareMode={compareMode}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <button
          type="button"
          onClick={() => onChangeWeek(-1)}
          disabled={!canGoEarlier}
          aria-label="Earlier week"
          className="rounded-md border border-neutral-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ←
        </button>
        <span className="tabular-nums">{formatWeekRange(weekStart)}</span>
        <button
          type="button"
          onClick={() => onChangeWeek(1)}
          disabled={!canGoLater}
          aria-label="Later week"
          className="rounded-md border border-neutral-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          →
        </button>

        {/* Points at the editor rather than the sign-in page: someone already
            signed in lands where they meant to go, and someone who is not gets
            sent to sign in and then brought back here. */}
        <a
          href={`/admin/trading-days?week=${weekStart}`}
          className="ml-auto rounded-md px-2 py-1 underline underline-offset-4 hover:text-neutral-900"
        >
          Edit figures
        </a>
      </div>
    </header>
  );
}
