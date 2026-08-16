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
    return (
      <div
        role="status"
        className="flex h-64 items-center justify-center rounded-[--radius-lg] border border-dashed border-border text-sm text-text-subtle"
      >
        No data for this period
      </div>
    );
  }

  const rows = toChartRows(data, compareMode, visibleSeries);

  const chart = (
    <BarChart
      data={rows}
      width={width}
      height={height}
      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      barGap={2}
      barCategoryGap="18%"
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
      <Bar dataKey="pos" stackId="current" fill={palette.series.current.pos} radius={0} />
      <Bar
        dataKey="eatclub"
        stackId="current"
        fill={palette.series.current.eatclub}
        radius={[3, 3, 0, 0]}
      />
      <Bar
        dataKey="labour"
        stackId="labourCurrent"
        fill={palette.series.current.labour}
        radius={[3, 3, 0, 0]}
      />

      {/* Previous period. Mounted only when comparing, so the default view is
          two bars per day rather than two bars and two empty slots. */}
      {compareMode ? (
        <Bar
          dataKey="previousPos"
          stackId="previous"
          fill={palette.series.previous.pos}
          radius={0}
        />
      ) : null}
      {compareMode ? (
        <Bar
          dataKey="previousEatclub"
          stackId="previous"
          fill={palette.series.previous.eatclub}
          radius={[3, 3, 0, 0]}
        />
      ) : null}
      {compareMode ? (
        <Bar
          dataKey="previousLabour"
          stackId="labourPrevious"
          fill={palette.series.previous.labour}
          radius={[3, 3, 0, 0]}
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
