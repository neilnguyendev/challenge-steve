"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RevenueTrend } from "@/lib/api";

import { toChartRows, isEmptyWeek, type VisibleSeries } from "./chart-data";
import {
  SERIES_KEYS,
  Y_AXIS_TICKS,
  seriesLabel,
  type ChartPalette,
  type Period,
  type SeriesKey,
} from "./chart-theme";
import { useChartPalette } from "./useChartPalette";
import { currentMonday } from "@/lib/week";
import { ChartTooltip } from "./ChartTooltip";

interface RevenueTrendChartProps {
  data: RevenueTrend;
  compareMode: boolean;
  visibleSeries: VisibleSeries;
  /** Fixed dimensions instead of a responsive wrapper. Used by tests, which
   *  have no layout engine to measure against. */
  width?: number;
  height?: number;
}

/**
 * Four bars per day in comparison mode, two otherwise.
 *
 * Recharts groups bars that share a stackId and places different stackIds side
 * by side, so the two revenue components stack into one bar while labour and
 * the previous period sit alongside it.
 */
export function RevenueTrendChart({
  data,
  compareMode,
  visibleSeries,
  width,
  height = 360,
}: RevenueTrendChartProps) {
  const palette = useChartPalette();

  if (isEmptyWeek(data)) {
    // Only worth offering when it would actually move you. Someone already
    // looking at the current week would click it and see nothing change.
    const strandedInThePast = data.period.start !== currentMonday();

    return (
      <div
        role="status"
        className="flex h-64 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border text-sm text-text-subtle"
      >
        <p>No data for this period</p>
        {strandedInThePast ? (
          // Plain link, no query string: landing bare resolves to the current
          // week with the default settings, which is what "back" means here.
          <a
            href="/"
            className="rounded-control px-2 py-1 underline decoration-border-strong underline-offset-4 transition-colors duration-150 hover:text-text hover:decoration-current"
          >
            Back to this week
          </a>
        ) : null}
      </div>
    );
  }

  const rows = toChartRows(data, compareMode, visibleSeries);

  // The prototype softens every corner, so the foot of a bar is rounded too,
  // not only its head. A stacked pair splits the job: the lower segment rounds
  // its base, the upper one its cap. With the upper segment hidden the lower
  // one is the whole bar, so it rounds all four.
  const BAR = 6;
  const base: [number, number, number, number] = visibleSeries.eatclub
    ? [0, 0, BAR, BAR]
    : [BAR, BAR, BAR, BAR];
  const cap: [number, number, number, number] = [BAR, BAR, 0, 0];
  const alone: [number, number, number, number] = [BAR, BAR, BAR, BAR];

  const chart = (
    <BarChart
      data={rows}
      width={width}
      height={height}
      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      barGap={3}
      barCategoryGap="12%"
    >
      <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
      <XAxis
        dataKey="weekday"
        tickLine={false}
        axisLine={false}
        tick={{ fill: palette.axisText, fontSize: 12 }}
      />
      <YAxis
        ticks={Y_AXIS_TICKS}
        domain={[0, Y_AXIS_TICKS[Y_AXIS_TICKS.length - 1]]}
        tickLine={false}
        axisLine={false}
        tick={{ fill: palette.axisText, fontSize: 12 }}
        tickFormatter={(value: number) => `${value / 1000}k`}
      />
      <Tooltip
        cursor={{ fill: "color-mix(in srgb, currentColor 6%, transparent)" }}
        content={<ChartTooltip compareMode={compareMode} palette={palette} />}
      />

      {/* Current period: revenue components share a stack, labour stands alone. */}
      <Bar dataKey="pos" stackId="current" fill={palette.series.current.pos} radius={base} />
      <Bar
        dataKey="eatclub"
        stackId="current"
        fill={palette.series.current.eatclub}
        radius={cap}
      />
      <Bar
        dataKey="labour"
        stackId="labourCurrent"
        fill={palette.series.current.labour}
        radius={alone}
      />

      {/* Previous period. Mounted only when comparing, so the default view is
          two bars per day rather than two bars and two empty slots. */}
      {compareMode ? (
        <Bar
          dataKey="previousPos"
          stackId="previous"
          fill={palette.series.previous.pos}
          radius={base}
        />
      ) : null}
      {compareMode ? (
        <Bar
          dataKey="previousEatclub"
          stackId="previous"
          fill={palette.series.previous.eatclub}
          radius={cap}
        />
      ) : null}
      {compareMode ? (
        <Bar
          dataKey="previousLabour"
          stackId="labourPrevious"
          fill={palette.series.previous.labour}
          radius={alone}
        />
      ) : null}
    </BarChart>
  );

  return (
    <figure className="flex flex-col gap-6">
      <div style={{ height }}>
        {width ? chart : <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>}
      </div>
      <ChartLegend compareMode={compareMode} visibleSeries={visibleSeries} palette={palette} />
    </figure>
  );
}

function ChartLegend({
  compareMode,
  visibleSeries,
  palette,
}: {
  compareMode: boolean;
  visibleSeries: VisibleSeries;
  palette: ChartPalette;
}) {
  const periods: Period[] = compareMode ? ["current", "previous"] : ["current"];

  const entries = periods.flatMap((period) =>
    SERIES_KEYS.filter((key) => visibleSeries[key]).map((key) => ({
      key: `${period}-${key}`,
      label: seriesLabel(key, compareMode ? period : undefined),
      color: palette.series[period][key as SeriesKey],
    })),
  );

  return (
    <figcaption>
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {entries.map((entry) => (
          <li
            key={entry.key}
            className="flex items-center gap-2 text-sm text-text-muted"
          >
            <span
              aria-hidden
              className="size-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.label}
          </li>
        ))}
      </ul>
    </figcaption>
  );
}
