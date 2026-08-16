"use client";

import type { RefObject } from "react";

import { ExportPngButton } from "./ExportPngButton";
import { METRIC_LABEL, SERIES_KEYS, type SeriesKey } from "./chart-theme";
import { useChartPalette } from "./useChartPalette";
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
  const palette = useChartPalette();

  const title = compareMode
    ? "This Week's Revenue Trend vs Previous Period"
    : "This Week's Revenue Trend";

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {/* The title yields space so the controls stay on one row; it wraps
            onto a second line rather than pushing them below. */}
        <h1 className="min-w-[12rem] flex-1 text-xl font-semibold leading-tight tracking-tight text-text">
          {title}
        </h1>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {SERIES_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-[--radius-sm] px-2 py-2 text-sm text-text-muted transition-colors duration-150 hover:bg-surface-hover has-[:focus-visible]:bg-surface-hover"
            >
              <input
                type="checkbox"
                checked={visibleSeries[key]}
                onChange={() => onToggleSeries(key)}
                aria-label={METRIC_LABEL[key]}
                className="size-4 cursor-pointer accent-[--accent]"
              />
              {/* A swatch, not the only signal: the label names the series and
                  the checkbox states whether it is shown. */}
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: palette.series.current[key] }}
              />
              <span className="whitespace-nowrap">{METRIC_LABEL[key]}</span>
            </label>
          ))}

          <button
            type="button"
            onClick={onToggleCompare}
            aria-pressed={compareMode}
            className={[
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium",
              "transition-colors duration-150",
              compareMode
                ? "bg-accent text-on-accent"
                : "border border-border-strong text-text hover:bg-surface-hover",
            ].join(" ")}
          >
            <CompareIcon pressed={compareMode} />
            Compare to Previous
          </button>

          <ExportPngButton
            chartRef={chartRef}
            weekStart={weekStart}
            compareMode={compareMode}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-muted">
        <WeekStepButton
          label="Earlier week"
          disabled={!canGoEarlier}
          onClick={() => onChangeWeek(-1)}
        >
          <ChevronIcon direction="left" />
        </WeekStepButton>

        <span className="tabular px-1">{formatWeekRange(weekStart)}</span>

        <WeekStepButton
          label="Later week"
          disabled={!canGoLater}
          onClick={() => onChangeWeek(1)}
        >
          <ChevronIcon direction="right" />
        </WeekStepButton>

        {/* Points at the editor rather than the sign-in page: someone already
            signed in lands where they meant to go, and someone who is not gets
            sent to sign in and then brought back here. */}
        <a
          href={`/admin/trading-days?week=${weekStart}`}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-[--radius-sm] px-2 underline decoration-border-strong underline-offset-4 transition-colors duration-150 hover:text-text hover:decoration-current"
        >
          <PencilIcon />
          Edit figures
        </a>
      </div>
    </header>
  );
}

function WeekStepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // 44px minimum: these are the smallest targets on the page and the ones
      // pressed repeatedly.
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[--radius-sm] border border-border text-text-muted transition-colors duration-150 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/* Inline SVG rather than emoji or an icon font: it inherits currentColor,
   scales without blurring, and costs no extra request. */

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

function CompareIcon({ pressed }: { pressed: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-4"
    >
      <path d="M5 20V10" />
      <path d="M12 20V4" opacity={pressed ? 1 : 0.55} />
      <path d="M19 20v-7" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
