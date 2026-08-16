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
  GRID_COLOR,
  SERIES_COLOR,
  SERIES_KEYS,
  Y_AXIS_TICKS,
  seriesLabel,
  type Period,
  type SeriesKey,
} from "./chart-theme";
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
  if (isEmptyWeek(data)) {
    return (
      <div
        role="status"
        className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-sm text-neutral-500"
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
      <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" vertical={false} />
      <XAxis
        dataKey="weekday"
        tickLine={false}
        axisLine={false}
        tick={{ fill: "#737373", fontSize: 12 }}
      />
      <YAxis
        ticks={Y_AXIS_TICKS}
        domain={[0, Y_AXIS_TICKS[Y_AXIS_TICKS.length - 1]]}
        tickLine={false}
        axisLine={false}
        tick={{ fill: "#737373", fontSize: 12 }}
        tickFormatter={(value: number) => `${value / 1000}k`}
      />
      <Tooltip
        cursor={{ fill: "rgba(0,0,0,0.04)" }}
        content={<ChartTooltip compareMode={compareMode} />}
      />

      {/* Current period: revenue components share a stack, labour stands alone. */}
      <Bar dataKey="pos" stackId="current" fill={SERIES_COLOR.current.pos} radius={0} />
      <Bar
        dataKey="eatclub"
        stackId="current"
        fill={SERIES_COLOR.current.eatclub}
        radius={[3, 3, 0, 0]}
      />
      <Bar
        dataKey="labour"
        stackId="labourCurrent"
        fill={SERIES_COLOR.current.labour}
        radius={[3, 3, 0, 0]}
      />

      {/* Previous period. Mounted only when comparing, so the default view is
          two bars per day rather than two bars and two empty slots. */}
      {compareMode ? (
        <Bar
          dataKey="previousPos"
          stackId="previous"
          fill={SERIES_COLOR.previous.pos}
          radius={0}
        />
      ) : null}
      {compareMode ? (
        <Bar
          dataKey="previousEatclub"
          stackId="previous"
          fill={SERIES_COLOR.previous.eatclub}
          radius={[3, 3, 0, 0]}
        />
      ) : null}
      {compareMode ? (
        <Bar
          dataKey="previousLabour"
          stackId="labourPrevious"
          fill={SERIES_COLOR.previous.labour}
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
      <ChartLegend compareMode={compareMode} visibleSeries={visibleSeries} />
    </figure>
  );
}

function ChartLegend({
  compareMode,
  visibleSeries,
}: {
  compareMode: boolean;
  visibleSeries: VisibleSeries;
}) {
  const periods: Period[] = compareMode ? ["current", "previous"] : ["current"];

  const entries = periods.flatMap((period) =>
    SERIES_KEYS.filter((key) => visibleSeries[key]).map((key) => ({
      key: `${period}-${key}`,
      label: seriesLabel(key, compareMode ? period : undefined),
      color: SERIES_COLOR[period][key as SeriesKey],
    })),
  );

  return (
    <figcaption>
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {entries.map((entry) => (
          <li
            key={entry.key}
            className="flex items-center gap-2 text-sm text-neutral-700"
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
